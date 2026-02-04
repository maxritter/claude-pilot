/**
 * ProcessManager - PID files, signal handlers, and child process lifecycle management
 *
 * Extracted from worker-service.ts monolith to provide centralized process management.
 * Handles:
 * - PID file management for daemon coordination
 * - Signal handler registration for graceful shutdown
 * - Child process enumeration and cleanup (especially for Windows zombie port fix)
 */

import path from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger.js';
import { HOOK_TIMEOUTS } from '../../shared/hook-constants.js';

const execAsync = promisify(exec);

const DATA_DIR = path.join(homedir(), '.claude-mem');
const PID_FILE = path.join(DATA_DIR, 'worker.pid');

const ORPHAN_PROCESS_PATTERNS = [
  'mcp-server',
  'worker-service',
  'claude-mem',
  'chroma-mcp'
];

const ORPHAN_MAX_AGE_MINUTES = 60;

const KNOWN_INIT_PROCESS_NAMES = [
  'init', 'systemd', 'tini', 'dumb-init', 'docker-init', 's6-svscan', 'runsv'
];

const CLAUDE_CLI_PATTERN = 'claude.*--output-format.*stream-json';

export interface PidInfo {
  pid: number;
  port: number;
  startedAt: string;
}

/**
 * Write PID info to the standard PID file location
 */
export function writePidFile(info: PidInfo): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PID_FILE, JSON.stringify(info, null, 2));
}

/**
 * Read PID info from the standard PID file location
 * Returns null if file doesn't exist or is corrupted
 */
export function readPidFile(): PidInfo | null {
  if (!existsSync(PID_FILE)) return null;

  try {
    return JSON.parse(readFileSync(PID_FILE, 'utf-8'));
  } catch (error) {
    logger.warn('SYSTEM', 'Failed to parse PID file', { path: PID_FILE }, error as Error);
    return null;
  }
}

/**
 * Remove the PID file (called during shutdown)
 */
export function removePidFile(): void {
  if (!existsSync(PID_FILE)) return;

  try {
    unlinkSync(PID_FILE);
  } catch (error) {
    logger.warn('SYSTEM', 'Failed to remove PID file', { path: PID_FILE }, error as Error);
  }
}

/**
 * Get platform-adjusted timeout (Windows socket cleanup is slower)
 */
export function getPlatformTimeout(baseMs: number): number {
  const WINDOWS_MULTIPLIER = 2.0;
  return process.platform === 'win32' ? Math.round(baseMs * WINDOWS_MULTIPLIER) : baseMs;
}

/**
 * Get all child process PIDs (Windows-specific)
 * Used for cleanup to prevent zombie ports when parent exits
 */
export async function getChildProcesses(parentPid: number): Promise<number[]> {
  if (process.platform !== 'win32') {
    return [];
  }

  if (!Number.isInteger(parentPid) || parentPid <= 0) {
    logger.warn('SYSTEM', 'Invalid parent PID for child process enumeration', { parentPid });
    return [];
  }

  try {
    const cmd = `powershell -NoProfile -NonInteractive -Command "Get-Process | Where-Object { \\$_.ParentProcessId -eq ${parentPid} } | Select-Object -ExpandProperty Id"`;
    const { stdout } = await execAsync(cmd, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND });
    return stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && /^\d+$/.test(line))
      .map(line => parseInt(line, 10))
      .filter(pid => pid > 0);
  } catch (error) {
    logger.error('SYSTEM', 'Failed to enumerate child processes', { parentPid }, error as Error);
    return [];
  }
}

/**
 * Force kill a process by PID
 * Windows: uses taskkill /F /T to kill process tree
 * Unix: uses SIGKILL
 */
export async function forceKillProcess(pid: number): Promise<void> {
  if (!Number.isInteger(pid) || pid <= 0) {
    logger.warn('SYSTEM', 'Invalid PID for force kill', { pid });
    return;
  }

  try {
    if (process.platform === 'win32') {
      await execAsync(`taskkill /PID ${pid} /T /F`, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    logger.info('SYSTEM', 'Killed process', { pid });
  } catch (error) {
    logger.debug('SYSTEM', 'Process already exited during force kill', { pid }, error as Error);
  }
}

/**
 * Wait for processes to fully exit
 */
export async function waitForProcessesExit(pids: number[], timeoutMs: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const stillAlive = pids.filter(pid => {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        return false;
      }
    });

    if (stillAlive.length === 0) {
      logger.info('SYSTEM', 'All child processes exited');
      return;
    }

    logger.debug('SYSTEM', 'Waiting for processes to exit', { stillAlive });
    await new Promise(r => setTimeout(r, 100));
  }

  logger.warn('SYSTEM', 'Timeout waiting for child processes to exit');
}

/**
 * Parse process elapsed time from ps output (etime format: [[DD-]HH:]MM:SS)
 * Returns age in minutes, or -1 if parsing fails
 */
function parseElapsedTime(etime: string): number {
  if (!etime || etime.trim() === '') return -1;
  
  const cleaned = etime.trim();
  let totalMinutes = 0;
  
  if (cleaned.includes('-')) {
    const [daysPart, timePart] = cleaned.split('-');
    totalMinutes += parseInt(daysPart, 10) * 24 * 60;
    const [hours, minutes] = timePart.split(':').map(n => parseInt(n, 10));
    totalMinutes += hours * 60 + minutes;
  } else {
    const parts = cleaned.split(':').map(n => parseInt(n, 10));
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
 * Supports tini, dumb-init, docker-init, s6-svscan, runsv, etc.
 */
function isInitLikeProcess(processName: string): boolean {
  const name = processName.toLowerCase().trim();
  return KNOWN_INIT_PROCESS_NAMES.some(init => name.includes(init));
}

/**
 * Check if a process is orphaned by examining its parent process ID (PPID)
 *
 * A process is considered orphaned if:
 * - Its PPID is 1 (adopted by init/systemd after parent died)
 * - Its parent is a known init-like process (tini, dumb-init, etc.)
 *
 * SAFETY: On any error or uncertainty, returns FALSE to avoid killing active processes.
 *
 * @param pid - The process ID to check
 * @returns true if the process is orphaned, false otherwise (or on error)
 */
export async function isOrphanedProcess(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  if (pid === process.pid) {
    return false;
  }

  if (pid === 1) {
    return false;
  }

  try {
    if (process.platform === 'win32') {
      const cmd = `powershell -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').ParentProcessId"`;
      const { stdout } = await execAsync(cmd, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND });
      const ppid = parseInt(stdout.trim(), 10);

      if (isNaN(ppid)) {
        return false;
      }

      if (ppid === 0) {
        return true;
      }

      try {
        const checkCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process -Id ${ppid} -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"`;
        const { stdout: countStr } = await execAsync(checkCmd, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND });
        const count = parseInt(countStr.trim(), 10);
        return count === 0;
      } catch {
        return false;
      }
    } else {
      const { stdout } = await execAsync(`cat /proc/${pid}/stat 2>/dev/null | awk '{print $4}'`);
      const ppid = parseInt(stdout.trim(), 10);

      if (isNaN(ppid)) {
        return false;
      }

      if (ppid === 1) {
        return true;
      }

      try {
        const { stdout: parentComm } = await execAsync(`cat /proc/${ppid}/comm 2>/dev/null`);
        if (isInitLikeProcess(parentComm.trim())) {
          return true;
        }
      } catch {
      }

      return false;
    }
  } catch (error) {
    logger.debug('SYSTEM', 'Error checking if process is orphaned, assuming active', { pid }, error as Error);
    return false;
  }
}

/**
 * Clean up orphaned Claude CLI/SDK processes
 *
 * These are subprocesses spawned by claude-mem's SDK integration that may
 * persist after the parent session ends abnormally.
 *
 * Unlike the time-based cleanup, this uses PPID checking to only kill
 * truly orphaned processes (PPID === 1 or init-like parent).
 */
export async function cleanupOrphanedClaudeProcesses(): Promise<void> {
  const currentPid = process.pid;
  const candidatePids: number[] = [];
  const orphanedPids: number[] = [];

  try {
    if (process.platform === 'win32') {
      const cmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { \\$_.CommandLine -match '${CLAUDE_CLI_PATTERN}' -and \\$_.ProcessId -ne ${currentPid} } | Select-Object ProcessId | ConvertTo-Json"`;
      const { stdout } = await execAsync(cmd, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND });

      if (!stdout.trim() || stdout.trim() === 'null') {
        return;
      }

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
        `pgrep -f '${CLAUDE_CLI_PATTERN}' 2>/dev/null || true`
      );

      if (!stdout.trim()) {
        return;
      }

      for (const line of stdout.trim().split('\n')) {
        const pid = parseInt(line.trim(), 10);
        if (Number.isInteger(pid) && pid > 0 && pid !== currentPid) {
          candidatePids.push(pid);
        }
      }
    }
  } catch (error) {
    logger.debug('SYSTEM', 'Error enumerating Claude processes', {}, error as Error);
    return;
  }

  if (candidatePids.length === 0) {
    return;
  }

  for (const pid of candidatePids) {
    const isOrphaned = await isOrphanedProcess(pid);
    if (isOrphaned) {
      orphanedPids.push(pid);
    } else {
      logger.debug('SYSTEM', 'Claude process is not orphaned, skipping', { pid });
    }
  }

  logger.debug('SYSTEM', 'Claude process cleanup check', {
    candidates: candidatePids.length,
    orphaned: orphanedPids.length
  });

  if (orphanedPids.length === 0) {
    return;
  }

  logger.info('SYSTEM', 'Cleaning up orphaned Claude CLI processes', {
    count: orphanedPids.length,
    pids: orphanedPids
  });

  for (const pid of orphanedPids) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${pid} /T /F`, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND, stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGTERM');
        await new Promise(r => setTimeout(r, 500));
        try {
          process.kill(pid, 0);
          process.kill(pid, 'SIGKILL');
        } catch {
        }
      }
    } catch (error) {
      logger.debug('SYSTEM', 'Claude process already exited', { pid }, error as Error);
    }
  }

  logger.info('SYSTEM', 'Orphaned Claude processes cleaned up', { count: orphanedPids.length });
}

/**
 * Clean up orphaned claude-mem processes from previous sessions
 *
 * This function uses a two-criteria approach:
 * 1. Time-based: Processes older than ORPHAN_MAX_AGE_MINUTES are candidates
 * 2. PPID-based: Only kill if actually orphaned (PPID === 1 or init-like parent)
 *
 * This dual approach ensures we only kill truly orphaned processes, not active
 * sessions that happen to have been running for a long time.
 *
 * Process patterns checked:
 * - mcp-server (main MCP server)
 * - worker-service (background daemon)
 * - claude-mem (any claude-mem process)
 * - chroma-mcp (ChromaDB subprocess)
 */
export async function cleanupOrphanedProcesses(): Promise<void> {
  const isWindows = process.platform === 'win32';
  const currentPid = process.pid;
  const candidatePids: number[] = [];
  const orphanedPids: number[] = [];

  try {
    if (isWindows) {
      const patternConditions = ORPHAN_PROCESS_PATTERNS
        .map(p => `\\$_.CommandLine -like '*${p}*'`)
        .join(' -or ');

      const cmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { (${patternConditions}) -and \\$_.ProcessId -ne ${currentPid} } | Select-Object ProcessId, CreationDate | ConvertTo-Json"`;
      const { stdout } = await execAsync(cmd, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND });

      if (!stdout.trim() || stdout.trim() === 'null') {
        logger.debug('SYSTEM', 'No claude-mem processes found (Windows)');
        return;
      }

      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];
      const now = Date.now();

      for (const proc of processList) {
        const pid = proc.ProcessId;
        if (!Number.isInteger(pid) || pid <= 0 || pid === currentPid) continue;

        const creationMatch = proc.CreationDate?.match(/\/Date\((\d+)\)\//);

        if (creationMatch) {
          const creationTime = parseInt(creationMatch[1], 10);
          const ageMinutes = (now - creationTime) / (1000 * 60);

          if (ageMinutes >= ORPHAN_MAX_AGE_MINUTES) {
            candidatePids.push(pid);
          }
        }
      }
    } else {
      const patternRegex = ORPHAN_PROCESS_PATTERNS.join('|');
      const { stdout } = await execAsync(
        `ps -eo pid,etime,command | grep -E "${patternRegex}" | grep -v grep || true`
      );

      if (!stdout.trim()) {
        logger.debug('SYSTEM', 'No claude-mem processes found (Unix)');
        return;
      }

      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
        if (!match) continue;

        const pid = parseInt(match[1], 10);
        const etime = match[2];

        if (!Number.isInteger(pid) || pid <= 0 || pid === currentPid) continue;

        const ageMinutes = parseElapsedTime(etime);
        if (ageMinutes >= ORPHAN_MAX_AGE_MINUTES) {
          candidatePids.push(pid);
        }
      }
    }
  } catch (error) {
    logger.error('SYSTEM', 'Failed to enumerate processes', {}, error as Error);
    return;
  }

  if (candidatePids.length === 0) {
    logger.debug('SYSTEM', 'No process candidates older than threshold', {
      thresholdMinutes: ORPHAN_MAX_AGE_MINUTES,
      patternsChecked: ORPHAN_PROCESS_PATTERNS
    });
    return;
  }

  for (const pid of candidatePids) {
    const isOrphaned = await isOrphanedProcess(pid);
    if (isOrphaned) {
      orphanedPids.push(pid);
      logger.debug('SYSTEM', 'Found orphaned process (PPID check passed)', { pid });
    } else {
      logger.debug('SYSTEM', 'Process is not orphaned, skipping', { pid });
    }
  }

  logger.debug('SYSTEM', 'Orphan cleanup check', {
    candidates: candidatePids.length,
    orphaned: orphanedPids.length,
    thresholdMinutes: ORPHAN_MAX_AGE_MINUTES
  });

  if (orphanedPids.length === 0) {
    logger.debug('SYSTEM', 'No truly orphaned processes found (all have valid parents)');
    return;
  }

  logger.info('SYSTEM', 'Cleaning up orphaned claude-mem processes', {
    platform: isWindows ? 'Windows' : 'Unix',
    count: orphanedPids.length,
    pids: orphanedPids,
    maxAgeMinutes: ORPHAN_MAX_AGE_MINUTES
  });

  if (isWindows) {
    for (const pid of orphanedPids) {
      if (!Number.isInteger(pid) || pid <= 0) {
        logger.warn('SYSTEM', 'Skipping invalid PID', { pid });
        continue;
      }
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND, stdio: 'ignore' });
      } catch (error) {
        logger.debug('SYSTEM', 'Failed to kill process, may have already exited', { pid }, error as Error);
      }
    }
  } else {
    for (const pid of orphanedPids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        logger.debug('SYSTEM', 'Process already exited', { pid }, error as Error);
      }
    }
  }

  logger.info('SYSTEM', 'Orphaned processes cleaned up', { count: orphanedPids.length });
}

/**
 * Spawn a detached daemon process
 * Returns the child PID or undefined if spawn failed
 */
export function spawnDaemon(
  scriptPath: string,
  port: number,
  extraEnv: Record<string, string> = {}
): number | undefined {
  const child = spawn(process.execPath, [scriptPath, '--daemon'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      CLAUDE_MEM_WORKER_PORT: String(port),
      ...extraEnv
    }
  });

  if (child.pid === undefined) {
    return undefined;
  }

  child.unref();
  return child.pid;
}

/**
 * Create signal handler factory for graceful shutdown
 * Returns a handler function that can be passed to process.on('SIGTERM') etc.
 */
export function createSignalHandler(
  shutdownFn: () => Promise<void>,
  isShuttingDownRef: { value: boolean }
): (signal: string) => Promise<void> {
  return async (signal: string) => {
    if (isShuttingDownRef.value) {
      logger.warn('SYSTEM', `Received ${signal} but shutdown already in progress`);
      return;
    }
    isShuttingDownRef.value = true;

    logger.info('SYSTEM', `Received ${signal}, shutting down...`);
    try {
      await shutdownFn();
      process.exit(0);
    } catch (error) {
      logger.error('SYSTEM', 'Error during shutdown', {}, error as Error);
      process.exit(0);
    }
  };
}

/**
 * Process count statistics for health monitoring
 */
export interface ProcessStats {
  claudeMemProcesses: number;
  claudeCliProcesses: number;
  chromaProcesses: number;
  total: number;
}

/**
 * Count claude-mem related processes for health monitoring
 * Returns counts of different process types for diagnostics
 */
export async function getProcessStats(): Promise<ProcessStats> {
  const currentPid = process.pid;
  let claudeMemCount = 0;
  let claudeCliCount = 0;
  let chromaCount = 0;

  try {
    if (process.platform === 'win32') {
      const cmd = `powershell -NoProfile -NonInteractive -Command "
        $claudeMem = (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'claude-mem|worker-service|mcp-server' -and $_.ProcessId -ne ${currentPid} }).Count
        $claudeCli = (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '${CLAUDE_CLI_PATTERN}' }).Count
        $chroma = (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'chroma' }).Count
        Write-Output \\"$claudeMem,$claudeCli,$chroma\\"
      "`;
      const { stdout } = await execAsync(cmd, { timeout: HOOK_TIMEOUTS.POWERSHELL_COMMAND });
      const [cm, cc, ch] = stdout.trim().split(',').map(n => parseInt(n, 10) || 0);
      claudeMemCount = cm;
      claudeCliCount = cc;
      chromaCount = ch;
    } else {
      try {
        const { stdout: cmOut } = await execAsync(
          `pgrep -f 'claude-mem|worker-service|mcp-server' 2>/dev/null | grep -v "^${currentPid}$" | wc -l`
        );
        claudeMemCount = parseInt(cmOut.trim(), 10) || 0;
      } catch { /* no processes found */ }

      try {
        const { stdout: ccOut } = await execAsync(
          `pgrep -f '${CLAUDE_CLI_PATTERN}' 2>/dev/null | wc -l`
        );
        claudeCliCount = parseInt(ccOut.trim(), 10) || 0;
      } catch { /* no processes found */ }

      try {
        const { stdout: chOut } = await execAsync(
          `pgrep -f 'chroma' 2>/dev/null | wc -l`
        );
        chromaCount = parseInt(chOut.trim(), 10) || 0;
      } catch { /* no processes found */ }
    }
  } catch (error) {
    logger.debug('SYSTEM', 'Error counting processes', {}, error as Error);
  }

  return {
    claudeMemProcesses: claudeMemCount,
    claudeCliProcesses: claudeCliCount,
    chromaProcesses: chromaCount,
    total: claudeMemCount + claudeCliCount + chromaCount
  };
}
