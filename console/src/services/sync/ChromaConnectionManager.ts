/**
 * ChromaConnectionManager
 *
 * Manages the MCP connection lifecycle to chroma-mcp with:
 * - Promise-based mutex to serialize concurrent connection attempts
 * - Circuit breaker (3 failures → cooldown → half-open retry)
 * - Safe transport cleanup on connection loss
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SettingsDefaultsManager } from "../../shared/SettingsDefaultsManager.js";
import { USER_SETTINGS_PATH } from "../../shared/paths.js";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import os from "os";
import path from "path";

const packageVersion = "1.0.0";

interface CircuitBreakerOptions {
  maxFailures?: number;
  cooldownMs?: number;
}

interface TransportOptions {
  command: string;
  args: string[];
  stderr: "ignore" | "pipe" | "inherit" | "overlapped";
  windowsHide?: boolean;
}

export class ChromaConnectionManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;
  private readonly project: string;
  private readonly collectionName: string;
  readonly VECTOR_DB_DIR: string;
  readonly VENV_DIR: string;

  private connectionPromise: Promise<void> | null = null;
  private operationMutex: Promise<void> = Promise.resolve();

  private failureCount: number = 0;
  private circuitOpenUntil: number = 0;
  private isHalfOpenAttemptInProgress: boolean = false;
  private readonly maxFailures: number;
  private readonly cooldownMs: number;

  constructor(project: string, options?: CircuitBreakerOptions) {
    this.project = project;
    this.collectionName = `cm__${project}`;
    this.VECTOR_DB_DIR = path.join(os.homedir(), ".pilot/memory", "vector-db");
    this.VENV_DIR = path.join(os.homedir(), ".pilot/memory", "chroma-venv");
    this.maxFailures = options?.maxFailures ?? 3;
    this.cooldownMs = options?.cooldownMs ?? 60_000;
  }

  getCollectionName(): string {
    return this.collectionName;
  }

  /**
   * Get connected MCP client. Serializes concurrent calls via mutex.
   * Respects circuit breaker state.
   */
  async getClient(): Promise<Client> {
    if (this.connected && this.client) {
      return this.client;
    }

    if (this.connectionPromise) {
      await this.connectionPromise;
      if (this.connected && this.client) {
        return this.client;
      }
    }

    if (this.failureCount >= this.maxFailures) {
      const now = Date.now();
      if (now < this.circuitOpenUntil) {
        throw new Error(
          `Circuit breaker open: ${this.failureCount} consecutive failures. ` +
          `Retry after ${Math.ceil((this.circuitOpenUntil - now) / 1000)}s cooldown.`
        );
      }
      if (this.isHalfOpenAttemptInProgress) {
        throw new Error("Circuit breaker half-open: retry already in progress");
      }
      this.isHalfOpenAttemptInProgress = true;
    }

    this.connectionPromise = this.doConnect();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
      this.isHalfOpenAttemptInProgress = false;
    }

    if (!this.client) {
      throw new Error("Connection failed: client is null after connect");
    }
    return this.client;
  }

  private async doConnect(): Promise<void> {
    try {
      const transportOptions = await this.getWorkingTransportOptions();

      this.transport = new StdioClientTransport(transportOptions);
      this.client = new Client(
        { name: "pilot-memory-chroma-sync", version: packageVersion },
        { capabilities: {} },
      );

      await this.client.connect(this.transport);
      this.connected = true;
      this.failureCount = 0;
      this.circuitOpenUntil = 0;

      logger.info("CHROMA_SYNC", "Connected to Chroma MCP server", { project: this.project });
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.maxFailures) {
        this.circuitOpenUntil = Date.now() + this.cooldownMs;
        logger.error("CHROMA_SYNC", `Circuit breaker opened after ${this.failureCount} failures`, { project: this.project }, error as Error);
      }

      await this.safeCloseTransport();
      this.client = null;
      this.connected = false;

      throw new Error(`Chroma connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the platform-specific path to the chroma-mcp binary in the venv.
   */
  private getVenvBinaryPath(): string {
    const isWindows = process.platform === "win32";
    const binDir = isWindows ? "Scripts" : "bin";
    const binary = isWindows ? "chroma-mcp.exe" : "chroma-mcp";
    return path.join(this.VENV_DIR, binDir, binary);
  }

  /**
   * Ensure persistent venv exists with chroma-mcp installed.
   * Uses a marker file to avoid redundant installs across worker restarts.
   * Returns true if venv is ready, false if creation/install failed.
   */
  private async ensureVenv(): Promise<boolean> {
    const markerFile = path.join(this.VENV_DIR, ".pilot-installed");

    if (fs.existsSync(markerFile)) {
      return true;
    }

    const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
    const pythonVersion = settings.CLAUDE_PILOT_PYTHON_VERSION;

    try {
      const { spawnSync } = await import("child_process");

      logger.info("CHROMA_SYNC", "Creating persistent venv for chroma-mcp", {
        venvDir: this.VENV_DIR,
        pythonVersion,
      });

      const venvResult = spawnSync("uv", ["venv", "--python", pythonVersion, this.VENV_DIR], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60_000,
      });

      if (venvResult.status !== 0) {
        logger.error("CHROMA_SYNC", "Failed to create venv", {
          stderr: venvResult.stderr?.slice(0, 200),
        });
        return false;
      }

      const isWindows = process.platform === "win32";
      const pythonBin = path.join(this.VENV_DIR, isWindows ? "Scripts/python.exe" : "bin/python");

      const installResult = spawnSync("uv", ["pip", "install", "--python", pythonBin, "chroma-mcp"], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
      });

      if (installResult.status !== 0) {
        logger.error("CHROMA_SYNC", "Failed to install chroma-mcp in venv", {
          stderr: installResult.stderr?.slice(0, 200),
        });
        return false;
      }

      fs.mkdirSync(path.dirname(markerFile), { recursive: true });
      fs.writeFileSync(markerFile, "chroma-mcp");

      logger.info("CHROMA_SYNC", "Persistent venv ready", { venvDir: this.VENV_DIR });
      return true;
    } catch (error) {
      logger.error("CHROMA_SYNC", "Venv setup failed, will fall back to uvx", {}, error as Error);
      return false;
    }
  }

  async getWorkingTransportOptions(): Promise<TransportOptions> {
    const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
    const pythonVersion = settings.CLAUDE_PILOT_PYTHON_VERSION;
    const isWindows = process.platform === "win32";
    const chromaMcpArgs = ["--client-type", "persistent", "--data-dir", this.VECTOR_DB_DIR];

    const venvBin = this.getVenvBinaryPath();
    try {
      const { spawnSync } = await import("child_process");

      const checkResult = spawnSync(venvBin, ["--version"], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      });

      if (checkResult.status === 0) {
        const venvOptions: TransportOptions = { command: venvBin, args: chromaMcpArgs, stderr: "ignore" };
        if (isWindows) venvOptions.windowsHide = true;
        return venvOptions;
      }

      const venvReady = await this.ensureVenv();
      if (venvReady) {
        const venvOptions: TransportOptions = { command: venvBin, args: chromaMcpArgs, stderr: "ignore" };
        if (isWindows) venvOptions.windowsHide = true;
        return venvOptions;
      }
    } catch (error) {
      logger.debug("CHROMA_SYNC", "Venv check failed, trying uvx", {}, error as Error);
    }

    const uvxOptions: TransportOptions = {
      command: "uvx",
      args: ["--python", pythonVersion, "chroma-mcp", ...chromaMcpArgs],
      stderr: "ignore",
    };
    if (isWindows) uvxOptions.windowsHide = true;

    try {
      const { spawnSync } = await import("child_process");
      const result = spawnSync("uvx", ["--version"], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      });
      if (result.status === 0) {
        return uvxOptions;
      }
    } catch (error) {
      logger.debug("CHROMA_SYNC", "uvx check failed, trying pip", {}, error as Error);
    }

    const pythonCmd = isWindows ? "python" : `python${pythonVersion}`;
    const pipOptions: TransportOptions = {
      command: pythonCmd,
      args: ["-m", "chroma_mcp", ...chromaMcpArgs],
      stderr: "ignore",
    };
    if (isWindows) pipOptions.windowsHide = true;

    try {
      const { spawnSync } = await import("child_process");
      const result = spawnSync(pythonCmd, ["-c", "import chroma_mcp"], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      });
      if (result.status === 0) {
        return pipOptions;
      }
    } catch (error) {
      logger.debug("CHROMA_SYNC", "pip check failed", {}, error as Error);
    }

    throw new Error("Chroma MCP not available. Install with: uvx chroma-mcp OR pip install chroma-mcp");
  }

  /**
   * Execute a function while holding an operation mutex.
   * Serializes multi-step operations (e.g., vacuum's delete+recreate+backfill)
   * so concurrent callers wait their turn.
   */
  async withMutex<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = await this.getClient();

    let release: () => void;
    const previous = this.operationMutex;
    this.operationMutex = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await fn(client);
    } finally {
      release!();
    }
  }

  async isHealthy(): Promise<boolean> {
    return this.connected && this.client !== null;
  }

  async close(): Promise<void> {
    await this.safeCloseTransport();
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.connectionPromise = null;
  }

  private async safeCloseTransport(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        logger.debug("CHROMA_SYNC", "Transport close error (non-fatal)", {}, error as Error);
      }
    }
  }
}
