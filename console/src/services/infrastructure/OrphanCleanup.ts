/**
 * OrphanCleanup - Cleanup of orphaned pilot-memory and Claude CLI processes
 *
 * Handles cleanup of:
 * - Orphaned pilot-memory/worker/chroma-mcp processes (time + PPID based)
 * - Orphaned Claude CLI/SDK processes (PPID based only)
 */

import { execSync } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../../utils/logger.js";
import { HOOK_TIMEOUTS } from "../../shared/hook-constants.js";
import { isOrphanedProcess, parseElapsedTime } from "./OrphanDetection.js";

const execAsync = promisify(exec);

const ORPHAN_PROCESS_PATTERNS = [
  "mcp-server",
  "worker-service",
  "pilot-memory",
  "chroma-mcp",
];

const ORPHAN_MAX_AGE_MINUTES = 60;

const CLAUDE_CLI_PATTERN = "claude.*--output-format.*stream-json";

/**
 * Clean up orphaned Claude CLI/SDK processes
 *
 * These are subprocesses spawned by pilot-memory's SDK integration that may
 * persist after the parent session ends abnormally.
 * Uses PPID checking to only kill truly orphaned processes.
 */
export async function cleanupOrphanedClaudeProcesses(): Promise<void> {
  const currentPid = process.pid;
  const candidatePids: number[] = [];
  const orphanedPids: number[] = [];

  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { \\$_.CommandLine -match '${CLAUDE_CLI_PATTERN}' -and \\$_.ProcessId -ne ${currentPid} } | Select-Object ProcessId | ConvertTo-Json"`;
      const { stdout } = await execAsync(cmd, {
        timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
      });

      if (!stdout.trim() || stdout.trim() === "null") return;

      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];

      for (const proc of processList) {
        const pid = proc.ProcessId;
        if (Number.isInteger(pid) && pid > 0 && pid !== currentPid) {
          candidatePids.push(pid);
        }
      }
    } else {
      const { stdout } = await execAsync(
        `pgrep -f '${CLAUDE_CLI_PATTERN}' 2>/dev/null || true`,
      );

      if (!stdout.trim()) return;

      for (const line of stdout.trim().split("\n")) {
        const pid = parseInt(line.trim(), 10);
        if (Number.isInteger(pid) && pid > 0 && pid !== currentPid) {
          candidatePids.push(pid);
        }
      }
    }
  } catch (error) {
    logger.debug(
      "SYSTEM",
      "Error enumerating Claude processes",
      {},
      error as Error,
    );
    return;
  }

  if (candidatePids.length === 0) return;

  for (const pid of candidatePids) {
    if (await isOrphanedProcess(pid)) {
      orphanedPids.push(pid);
    }
  }

  if (orphanedPids.length === 0) return;

  logger.info("SYSTEM", "Cleaning up orphaned Claude CLI processes", {
    count: orphanedPids.length,
    pids: orphanedPids,
  });

  for (const pid of orphanedPids) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /PID ${pid} /T /F`, {
          timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
          stdio: "ignore",
        });
      } else {
        process.kill(pid, "SIGTERM");
        await new Promise((r) => setTimeout(r, 500));
        try {
          process.kill(pid, 0);
          process.kill(pid, "SIGKILL");
        } catch {}
      }
    } catch (error) {
      logger.debug(
        "SYSTEM",
        "Claude process already exited",
        { pid },
        error as Error,
      );
    }
  }

  logger.info("SYSTEM", "Orphaned Claude processes cleaned up", {
    count: orphanedPids.length,
  });
}

/**
 * Clean up orphaned pilot-memory processes from previous sessions
 *
 * Two-criteria approach:
 * 1. Time-based: Processes older than ORPHAN_MAX_AGE_MINUTES are candidates
 * 2. PPID-based: Only kill if actually orphaned (PPID === 1 or init-like parent)
 */
export async function cleanupOrphanedProcesses(): Promise<void> {
  const isWindows = process.platform === "win32";
  const currentPid = process.pid;
  const candidatePids: number[] = [];
  const orphanedPids: number[] = [];

  try {
    if (isWindows) {
      const patternConditions = ORPHAN_PROCESS_PATTERNS.map(
        (p) => `\\$_.CommandLine -like '*${p}*'`,
      ).join(" -or ");

      const cmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { (${patternConditions}) -and \\$_.ProcessId -ne ${currentPid} } | Select-Object ProcessId, CreationDate | ConvertTo-Json"`;
      const { stdout } = await execAsync(cmd, {
        timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
      });

      if (!stdout.trim() || stdout.trim() === "null") return;

      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];
      const now = Date.now();

      for (const proc of processList) {
        const pid = proc.ProcessId;
        if (!Number.isInteger(pid) || pid <= 0 || pid === currentPid) continue;

        const datePattern = new RegExp("\\/Date\\((\\d+)\\)\\/");
        const creationMatch = proc.CreationDate?.match(datePattern);
        if (creationMatch) {
          const creationTime = parseInt(creationMatch[1], 10);
          const ageMinutes = (now - creationTime) / (1000 * 60);
          if (ageMinutes >= ORPHAN_MAX_AGE_MINUTES) {
            candidatePids.push(pid);
          }
        }
      }
    } else {
      const patternRegex = ORPHAN_PROCESS_PATTERNS.join("|");
      const { stdout } = await execAsync(
        `ps -eo pid,etime,command | grep -E "${patternRegex}" | grep -v grep || true`,
      );

      if (!stdout.trim()) return;

      for (const line of stdout.trim().split("\n")) {
        const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
        if (!match) continue;

        const pid = parseInt(match[1], 10);
        const etime = match[2];
        if (!Number.isInteger(pid) || pid <= 0 || pid === currentPid) continue;

        if (parseElapsedTime(etime) >= ORPHAN_MAX_AGE_MINUTES) {
          candidatePids.push(pid);
        }
      }
    }
  } catch (error) {
    logger.error("SYSTEM", "Failed to enumerate processes", {}, error as Error);
    return;
  }

  if (candidatePids.length === 0) return;

  for (const pid of candidatePids) {
    if (await isOrphanedProcess(pid)) {
      orphanedPids.push(pid);
    }
  }

  if (orphanedPids.length === 0) return;

  logger.info("SYSTEM", "Cleaning up orphaned pilot-memory processes", {
    platform: isWindows ? "Windows" : "Unix",
    count: orphanedPids.length,
    pids: orphanedPids,
    maxAgeMinutes: ORPHAN_MAX_AGE_MINUTES,
  });

  if (isWindows) {
    for (const pid of orphanedPids) {
      if (!Number.isInteger(pid) || pid <= 0) continue;
      try {
        execSync(`taskkill /PID ${pid} /T /F`, {
          timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
          stdio: "ignore",
        });
      } catch (error) {
        logger.debug(
          "SYSTEM",
          "Failed to kill process, may have already exited",
          { pid },
          error as Error,
        );
      }
    }
  } else {
    for (const pid of orphanedPids) {
      try {
        process.kill(pid, "SIGKILL");
      } catch (error) {
        logger.debug(
          "SYSTEM",
          "Process already exited",
          { pid },
          error as Error,
        );
      }
    }
  }

  logger.info("SYSTEM", "Orphaned processes cleaned up", {
    count: orphanedPids.length,
  });
}
