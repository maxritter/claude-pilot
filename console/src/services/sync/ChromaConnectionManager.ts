/**
 * ChromaConnectionManager
 *
 * Manages the MCP connection lifecycle to chroma-mcp with:
 * - Promise-based mutex to serialize concurrent connection attempts
 * - Circuit breaker (3 failures → cooldown → half-open retry)
 * - Explicit child PID tracking for reliable subprocess cleanup
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import os from "os";
import path from "path";
import { resolveTransportOptions } from "./ChromaTransportResolver.js";
import type { TransportOptions } from "./ChromaTransportResolver.js";

const packageVersion = "1.0.0";

interface CircuitBreakerOptions {
  maxFailures?: number;
  cooldownMs?: number;
}

export class ChromaConnectionManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private childPid: number | undefined = undefined;
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
  private corruptionRecoveryAttempted: boolean = false;
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
            `Retry after ${Math.ceil((this.circuitOpenUntil - now) / 1000)}s cooldown.`,
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
      this.childPid = this.transport.pid ?? undefined;
      this.connected = true;
      this.failureCount = 0;
      this.circuitOpenUntil = 0;

      logger.info("CHROMA_SYNC", "Connected to Chroma MCP server", {
        project: this.project,
        childPid: this.childPid,
      });
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.maxFailures) {
        this.circuitOpenUntil = Date.now() + this.cooldownMs;
        logger.error(
          "CHROMA_SYNC",
          `Circuit breaker opened after ${this.failureCount} failures`,
          { project: this.project },
          error as Error,
        );
      }

      await this.safeCloseTransport();
      this.client = null;
      this.connected = false;

      throw new Error(
        `Chroma connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Delegate to ChromaTransportResolver (kept as method for test compatibility) */
  async getWorkingTransportOptions(): Promise<TransportOptions> {
    return resolveTransportOptions(this.VENV_DIR, this.VECTOR_DB_DIR);
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

  /**
   * Recover from a corrupted vector database.
   *
   * Called by ChromaSync when chroma-mcp crashes immediately after connecting
   * (e.g., SIGSEGV from corrupted SQLite). Deletes the vector-db directory so
   * the next connection starts fresh. Only attempted once per worker lifetime.
   *
   * Returns true if recovery was performed, false if already attempted.
   */
  async recoverFromCorruptedDatabase(): Promise<boolean> {
    if (this.corruptionRecoveryAttempted) {
      return false;
    }
    this.corruptionRecoveryAttempted = true;

    logger.warn(
      "CHROMA_SYNC",
      "Attempting corruption recovery — deleting vector-db",
      {
        vectorDbDir: this.VECTOR_DB_DIR,
        project: this.project,
      },
    );

    await this.close();

    try {
      fs.rmSync(this.VECTOR_DB_DIR, { recursive: true, force: true });
      logger.info(
        "CHROMA_SYNC",
        "Corrupted vector-db deleted, will rebuild on next connect",
      );
    } catch (error) {
      logger.error(
        "CHROMA_SYNC",
        "Failed to delete corrupted vector-db",
        {},
        error as Error,
      );
      return false;
    }

    this.failureCount = 0;
    this.circuitOpenUntil = 0;
    return true;
  }

  async close(): Promise<void> {
    await this.safeCloseTransport();
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.connectionPromise = null;
  }

  private async safeCloseTransport(): Promise<void> {
    const pid = this.childPid;
    this.childPid = undefined;

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        logger.debug(
          "CHROMA_SYNC",
          "Transport close error (non-fatal)",
          {},
          error as Error,
        );
      }
    }

    if (pid !== undefined) {
      try {
        process.kill(pid, 0);
        logger.warn(
          "CHROMA_SYNC",
          "Chroma subprocess survived transport.close(), force killing",
          { pid },
        );
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }
}
