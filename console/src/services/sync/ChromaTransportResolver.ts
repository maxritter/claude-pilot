/**
 * ChromaTransportResolver - Resolves the best available chroma-mcp transport
 *
 * Tries in order: persistent venv binary → uvx → pip module.
 * Handles venv creation and chroma-mcp installation.
 */

import { SettingsDefaultsManager } from "../../shared/SettingsDefaultsManager.js";
import { USER_SETTINGS_PATH } from "../../shared/paths.js";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import path from "path";

export interface TransportOptions {
  command: string;
  args: string[];
  stderr: "ignore" | "pipe" | "inherit" | "overlapped";
  windowsHide?: boolean;
}

function getVenvBinaryPath(venvDir: string): string {
  const isWindows = process.platform === "win32";
  const binDir = isWindows ? "Scripts" : "bin";
  const binary = isWindows ? "chroma-mcp.exe" : "chroma-mcp";
  return path.join(venvDir, binDir, binary);
}

async function ensureVenv(venvDir: string): Promise<boolean> {
  const markerFile = path.join(venvDir, ".pilot-installed");

  if (fs.existsSync(markerFile)) {
    return true;
  }

  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  const pythonVersion = settings.CLAUDE_PILOT_PYTHON_VERSION;

  try {
    const { spawnSync } = await import("child_process");

    logger.info("CHROMA_SYNC", "Creating persistent venv for chroma-mcp", {
      venvDir,
      pythonVersion,
    });

    const venvResult = spawnSync(
      "uv",
      ["venv", "--python", pythonVersion, venvDir],
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60_000,
      },
    );

    if (venvResult.status !== 0) {
      logger.error("CHROMA_SYNC", "Failed to create venv", {
        stderr: venvResult.stderr?.slice(0, 200),
      });
      return false;
    }

    const isWindows = process.platform === "win32";
    const pythonBin = path.join(
      venvDir,
      isWindows ? "Scripts/python.exe" : "bin/python",
    );

    const installResult = spawnSync(
      "uv",
      ["pip", "install", "--python", pythonBin, "chroma-mcp"],
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
      },
    );

    if (installResult.status !== 0) {
      logger.error("CHROMA_SYNC", "Failed to install chroma-mcp in venv", {
        stderr: installResult.stderr?.slice(0, 200),
      });
      return false;
    }

    fs.mkdirSync(path.dirname(markerFile), { recursive: true });
    fs.writeFileSync(markerFile, "chroma-mcp");

    logger.info("CHROMA_SYNC", "Persistent venv ready", { venvDir });
    return true;
  } catch (error) {
    logger.error(
      "CHROMA_SYNC",
      "Venv setup failed, will fall back to uvx",
      {},
      error as Error,
    );
    return false;
  }
}

/**
 * Resolve the best available transport options for chroma-mcp.
 * Tries: venv binary → uvx → pip module.
 */
export async function resolveTransportOptions(
  venvDir: string,
  vectorDbDir: string,
): Promise<TransportOptions> {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  const pythonVersion = settings.CLAUDE_PILOT_PYTHON_VERSION;
  const isWindows = process.platform === "win32";
  const chromaMcpArgs = [
    "--client-type",
    "persistent",
    "--data-dir",
    vectorDbDir,
  ];

  const venvBin = getVenvBinaryPath(venvDir);
  try {
    const { spawnSync } = await import("child_process");

    const checkResult = spawnSync(venvBin, ["--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });

    if (checkResult.status === 0) {
      const opts: TransportOptions = {
        command: venvBin,
        args: chromaMcpArgs,
        stderr: "ignore",
      };
      if (isWindows) opts.windowsHide = true;
      return opts;
    }

    if (await ensureVenv(venvDir)) {
      const opts: TransportOptions = {
        command: venvBin,
        args: chromaMcpArgs,
        stderr: "ignore",
      };
      if (isWindows) opts.windowsHide = true;
      return opts;
    }
  } catch (error) {
    logger.debug(
      "CHROMA_SYNC",
      "Venv check failed, trying uvx",
      {},
      error as Error,
    );
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
    if (result.status === 0) return uvxOptions;
  } catch (error) {
    logger.debug(
      "CHROMA_SYNC",
      "uvx check failed, trying pip",
      {},
      error as Error,
    );
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
    if (result.status === 0) return pipOptions;
  } catch (error) {
    logger.debug("CHROMA_SYNC", "pip check failed", {}, error as Error);
  }

  throw new Error(
    "Chroma MCP not available. Install with: uvx chroma-mcp OR pip install chroma-mcp",
  );
}
