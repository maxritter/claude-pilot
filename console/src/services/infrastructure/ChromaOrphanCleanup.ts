/**
 * ChromaOrphanCleanup - Kill orphaned chroma-mcp processes on worker startup.
 *
 * Unlike the general orphan cleanup (60-min age threshold), this runs
 * immediately on startup with no age gate. There should only ever be one
 * set of chroma-mcp processes (owned by the current worker), so any
 * orphaned ones from a previous crashed worker are safe to kill.
 */

import { exec, execSync } from "child_process";
import { promisify } from "util";
import { logger } from "../../utils/logger.js";
import { HOOK_TIMEOUTS } from "../../shared/hook-constants.js";
import { isOrphanedProcess } from "./OrphanDetection.js";

const execAsync = promisify(exec);

export async function cleanupOrphanedChromaProcesses(): Promise<void> {
  const currentPid = process.pid;

  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { \\$_.CommandLine -like '*chroma-mcp*' -and \\$_.ProcessId -ne ${currentPid} } | Select-Object ProcessId | ConvertTo-Json"`;
      const { stdout } = await execAsync(cmd, {
        timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
      });
      if (!stdout.trim() || stdout.trim() === "null") return;

      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];

      for (const proc of processList) {
        const pid = proc.ProcessId;
        if (
          Number.isInteger(pid) &&
          pid > 0 &&
          pid !== currentPid &&
          (await isOrphanedProcess(pid))
        ) {
          try {
            execSync(`taskkill /PID ${pid} /T /F`, {
              timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
              stdio: "ignore",
            });
          } catch {}
        }
      }
    } else {
      const { stdout } = await execAsync(
        "pgrep -f 'chroma-mcp' 2>/dev/null || true",
      );
      if (!stdout.trim()) return;

      const pids = stdout
        .trim()
        .split("\n")
        .map((l) => parseInt(l.trim(), 10))
        .filter(
          (pid) => Number.isInteger(pid) && pid > 0 && pid !== currentPid,
        );

      if (pids.length === 0) return;

      const orphaned: number[] = [];
      for (const pid of pids) {
        if (await isOrphanedProcess(pid)) orphaned.push(pid);
      }

      if (orphaned.length === 0) return;

      logger.info(
        "SYSTEM",
        "Killing orphaned chroma-mcp from previous worker",
        { count: orphaned.length, pids: orphaned },
      );

      for (const pid of orphaned) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
    }
  } catch (error) {
    logger.debug("SYSTEM", "Chroma orphan cleanup skipped", {}, error as Error);
  }
}
