/**
 * OrphanDetection - Cross-platform orphan process detection helpers
 *
 * Uses `ps` for macOS/Linux (not /proc which is Linux-only) and PowerShell for Windows.
 * SAFETY: On any error or uncertainty, returns FALSE to avoid killing active processes.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../../utils/logger.js";
import { HOOK_TIMEOUTS } from "../../shared/hook-constants.js";

const execAsync = promisify(exec);

const KNOWN_INIT_PROCESS_NAMES = [
  "init",
  "systemd",
  "tini",
  "dumb-init",
  "docker-init",
  "s6-svscan",
  "runsv",
];

/**
 * Parse process elapsed time from ps output (etime format: [[DD-]HH:]MM:SS)
 * Returns age in minutes, or -1 if parsing fails
 */
export function parseElapsedTime(etime: string): number {
  if (!etime || etime.trim() === "") return -1;

  const cleaned = etime.trim();
  let totalMinutes = 0;

  if (cleaned.includes("-")) {
    const [daysPart, timePart] = cleaned.split("-");
    totalMinutes += parseInt(daysPart, 10) * 24 * 60;
    const [hours, minutes] = timePart.split(":").map((n) => parseInt(n, 10));
    totalMinutes += hours * 60 + minutes;
  } else {
    const parts = cleaned.split(":").map((n) => parseInt(n, 10));
    if (parts.length === 3) {
      totalMinutes = parts[0] * 60 + parts[1];
    } else if (parts.length === 2) {
      totalMinutes = parts[0];
    }
  }

  return totalMinutes;
}

/**
 * Check if a process name matches a known init process (for container environments)
 */
function isInitLikeProcess(processName: string): boolean {
  const name = processName.toLowerCase().trim();
  return KNOWN_INIT_PROCESS_NAMES.some((init) => name.includes(init));
}

/**
 * Check if a process is orphaned by examining its parent process ID (PPID)
 *
 * A process is considered orphaned if:
 * - Its PPID is 1 (adopted by init/systemd after parent died)
 * - Its parent is a known init-like process (tini, dumb-init, etc.)
 *
 * Uses `ps` for Unix (works on both macOS and Linux) and PowerShell for Windows.
 */
export async function isOrphanedProcess(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  if (pid === process.pid || pid === 1) {
    return false;
  }

  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').ParentProcessId"`;
      const { stdout } = await execAsync(cmd, {
        timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
      });
      const ppid = parseInt(stdout.trim(), 10);

      if (isNaN(ppid)) return false;
      if (ppid === 0) return true;

      try {
        const checkCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process -Id ${ppid} -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"`;
        const { stdout: countStr } = await execAsync(checkCmd, {
          timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
        });
        return parseInt(countStr.trim(), 10) === 0;
      } catch {
        return false;
      }
    } else {
      const { stdout } = await execAsync(`ps -o ppid= -p ${pid} 2>/dev/null`);
      const ppid = parseInt(stdout.trim(), 10);

      if (isNaN(ppid)) return false;
      if (ppid === 1) return true;

      try {
        const { stdout: parentComm } = await execAsync(
          `ps -o comm= -p ${ppid} 2>/dev/null`,
        );
        if (isInitLikeProcess(parentComm.trim())) {
          return true;
        }
      } catch {}

      return false;
    }
  } catch (error) {
    logger.debug(
      "SYSTEM",
      "Error checking if process is orphaned, assuming active",
      { pid },
      error as Error,
    );
    return false;
  }
}
