/**
 * ProcessStats - Process count statistics for health monitoring
 */

import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../../utils/logger.js";
import { HOOK_TIMEOUTS } from "../../shared/hook-constants.js";

const execAsync = promisify(exec);

const CLAUDE_CLI_PATTERN = "claude.*--output-format.*stream-json";

export interface ProcessStats {
  claudeMemProcesses: number;
  claudeCliProcesses: number;
  chromaProcesses: number;
  total: number;
}

/**
 * Count pilot-memory related processes for health monitoring
 * Returns counts of different process types for diagnostics
 */
export async function getProcessStats(): Promise<ProcessStats> {
  const currentPid = process.pid;
  let claudeMemCount = 0;
  let claudeCliCount = 0;
  let chromaCount = 0;

  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -NonInteractive -Command "
        $claudeMem = (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'pilot-memory|worker-service|mcp-server' -and $_.ProcessId -ne ${currentPid} }).Count
        $claudeCli = (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '${CLAUDE_CLI_PATTERN}' }).Count
        $chroma = (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'chroma' }).Count
        Write-Output \\"$claudeMem,$claudeCli,$chroma\\"
      "`;
      const { stdout } = await execAsync(cmd, {
        timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND,
      });
      const [cm, cc, ch] = stdout
        .trim()
        .split(",")
        .map((n) => parseInt(n, 10) || 0);
      claudeMemCount = cm;
      claudeCliCount = cc;
      chromaCount = ch;
    } else {
      try {
        const { stdout: cmOut } = await execAsync(
          `pgrep -f 'pilot-memory|worker-service|mcp-server' 2>/dev/null | grep -v "^${currentPid}$" | wc -l`,
        );
        claudeMemCount = parseInt(cmOut.trim(), 10) || 0;
      } catch {
        /* no processes found */
      }

      try {
        const { stdout: ccOut } = await execAsync(
          `pgrep -f '${CLAUDE_CLI_PATTERN}' 2>/dev/null | wc -l`,
        );
        claudeCliCount = parseInt(ccOut.trim(), 10) || 0;
      } catch {
        /* no processes found */
      }

      try {
        const { stdout: chOut } = await execAsync(
          `pgrep -f 'chroma' 2>/dev/null | wc -l`,
        );
        chromaCount = parseInt(chOut.trim(), 10) || 0;
      } catch {
        /* no processes found */
      }
    }
  } catch (error) {
    logger.debug("SYSTEM", "Error counting processes", {}, error as Error);
  }

  return {
    claudeMemProcesses: claudeMemCount,
    claudeCliProcesses: claudeCliCount,
    chromaProcesses: chromaCount,
    total: claudeMemCount + claudeCliCount + chromaCount,
  };
}
