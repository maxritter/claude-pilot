/**
 * ProcessManager - PID files, process lifecycle, daemon spawning, and signal handling
 */

import path from "path";
import { homedir } from "os";
import {
  existsSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { logger } from "../../utils/logger.js";
import { HOOK_TIMEOUTS } from "../../shared/hook-constants.js";

const execAsync = promisify(exec);

const DATA_DIR = path.join(homedir(), ".pilot/memory");
const PID_FILE = path.join(DATA_DIR, "worker.pid");

export interface PidInfo {
  pid: number;
  port: number;
  startedAt: string;
}

export function writePidFile(info: PidInfo): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PID_FILE, JSON.stringify(info, null, 2));
}

export function readPidFile(): PidInfo | null {
  if (!existsSync(PID_FILE)) return null;

  try {
    return JSON.parse(readFileSync(PID_FILE, "utf-8"));
  } catch (error) {
    logger.warn(
      "SYSTEM",
      "Failed to parse PID file",
      { path: PID_FILE },
      error as Error,
    );
    return null;
  }
}

export function removePidFile(): void {
  if (!existsSync(PID_FILE)) return;

  try {
    unlinkSync(PID_FILE);
  } catch (error) {
    logger.warn(
      "SYSTEM",
      "Failed to remove PID file",
      { path: PID_FILE },
      error as Error,
    );
  }
}

/**
 * Check if a process is alive using signal 0 (existence check)
 *
 * Handles edge cases:
 * - PID 0 (Windows sentinel): returns true
 * - EPERM error (process exists but different user): returns true
 * - ESRCH error (no such process): returns false
 * - Invalid PIDs (negative, non-integer): returns false
 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid < 0) return false;
  if (pid === 0) return true;

  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    const errCode =
      error instanceof Error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (errCode === "EPERM") return true;
    return false;
  }
}

export function cleanStalePidFile(): void {
  const pidInfo = readPidFile();
  if (!pidInfo) return;

  if (!isProcessAlive(pidInfo.pid)) {
    logger.info("SYSTEM", "Removing stale PID file", { pid: pidInfo.pid });
    removePidFile();
  }
}

export function getPlatformTimeout(baseMs: number): number {
  const WINDOWS_MULTIPLIER = 2.0;
  return process.platform === "win32"
    ? Math.round(baseMs * WINDOWS_MULTIPLIER)
    : baseMs;
}

/**
 * Get all child process PIDs for a given parent.
 * Used by GracefulShutdown to kill children (e.g. chroma-mcp) on exit.
 */
export async function getChildProcesses(parentPid: number): Promise<number[]> {
  if (!Number.isInteger(parentPid) || parentPid <= 0) {
    logger.warn("SYSTEM", "Invalid parent PID for child process enumeration", {
      parentPid,
    });
    return [];
  }

  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -NonInteractive -Command "Get-Process | Where-Object { \\$_.ParentProcessId -eq ${parentPid} } | Select-Object -ExpandProperty Id"`;
      const { stdout } = await execAsync(cmd, {
        timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
      });
      return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && /^\d+$/.test(line))
        .map((line) => parseInt(line, 10))
        .filter((pid) => pid > 0);
    } else {
      const { stdout } = await execAsync(
        `pgrep -P ${parentPid} 2>/dev/null || true`,
      );
      return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && /^\d+$/.test(line))
        .map((line) => parseInt(line, 10))
        .filter((pid) => pid > 0);
    }
  } catch (error) {
    logger.error(
      "SYSTEM",
      "Failed to enumerate child processes",
      { parentPid },
      error as Error,
    );
    return [];
  }
}

export async function forceKillProcess(pid: number): Promise<void> {
  if (!Number.isInteger(pid) || pid <= 0) {
    logger.warn("SYSTEM", "Invalid PID for force kill", { pid });
    return;
  }

  try {
    if (process.platform === "win32") {
      await execAsync(`taskkill /PID ${pid} /T /F`, {
        timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
      });
    } else {
      process.kill(pid, "SIGKILL");
    }
    logger.info("SYSTEM", "Killed process", { pid });
  } catch (error) {
    logger.debug(
      "SYSTEM",
      "Process already exited during force kill",
      { pid },
      error as Error,
    );
  }
}

export async function waitForProcessesExit(
  pids: number[],
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const stillAlive = pids.filter((pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    });

    if (stillAlive.length === 0) {
      logger.info("SYSTEM", "All child processes exited");
      return;
    }

    logger.debug("SYSTEM", "Waiting for processes to exit", { stillAlive });
    await new Promise((r) => setTimeout(r, 100));
  }

  logger.warn("SYSTEM", "Timeout waiting for child processes to exit");
}

export function spawnDaemon(
  scriptPath: string,
  port: number,
  extraEnv: Record<string, string> = {},
): number | undefined {
  const child = spawn(process.execPath, [scriptPath, "--daemon"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: {
      ...process.env,
      CLAUDE_PILOT_WORKER_PORT: String(port),
      ...extraEnv,
    },
  });

  if (child.pid === undefined) return undefined;

  child.unref();
  return child.pid;
}

export function createSignalHandler(
  shutdownFn: () => Promise<void>,
  isShuttingDownRef: { value: boolean },
): (signal: string) => Promise<void> {
  return async (signal: string) => {
    if (isShuttingDownRef.value) {
      logger.warn(
        "SYSTEM",
        `Received ${signal} but shutdown already in progress`,
      );
      return;
    }
    isShuttingDownRef.value = true;

    logger.info("SYSTEM", `Received ${signal}, shutting down...`);
    try {
      await shutdownFn();
      process.exit(0);
    } catch (error) {
      logger.error("SYSTEM", "Error during shutdown", {}, error as Error);
      process.exit(0);
    }
  };
}

export {
  cleanupOrphanedProcesses,
  cleanupOrphanedClaudeProcesses,
} from "./OrphanCleanup.js";
export { cleanupOrphanedChromaProcesses } from "./ChromaOrphanCleanup.js";
export { isOrphanedProcess, parseElapsedTime } from "./OrphanDetection.js";
export { getProcessStats } from "./ProcessStats.js";
export type { ProcessStats } from "./ProcessStats.js";
