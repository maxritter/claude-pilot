#!/usr/bin/env bun
/**
 * Worker Wrapper - Windows-compatible process manager for claude-mem worker
 *
 * This wrapper spawns and manages the inner worker process, handling:
 * - Windows Terminal popup prevention via windowsHide: true
 * - Graceful shutdown on SIGTERM/SIGINT
 * - IPC-based restart/shutdown requests from inner process
 * - Process tree cleanup on exit
 */

import { spawn, execSync, type ChildProcess } from 'child_process';
import path from 'path';

const IS_WINDOWS = process.platform === 'win32';
const SCRIPT_DIR = __dirname;
const WORKER_SCRIPT = path.join(SCRIPT_DIR, 'worker-service.cjs');

let innerProcess: ChildProcess | null = null;
let intentionalExit = false;

/**
 * Log wrapper messages with timestamp
 */
function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [wrapper] ${message}`);
}

/**
 * Spawn the inner worker process with windowsHide to prevent popups
 */
function spawnInner(): void {
  log(`Spawning inner worker: ${WORKER_SCRIPT}`);

  innerProcess = spawn(process.execPath, [WORKER_SCRIPT], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: {
      ...process.env,
      CLAUDE_MEM_MANAGED: 'true'
    },
    cwd: path.dirname(WORKER_SCRIPT),
    windowsHide: true,  // CRITICAL: Prevent Windows Terminal popup
    detached: false     // Keep attached for IPC
  });

  // Handle IPC messages from inner process
  innerProcess.on('message', async (message: { type: string }) => {
    if (message.type === 'restart' || message.type === 'shutdown') {
      log(`${message.type} requested by inner`);
      intentionalExit = true;
      await killInner();
      log('Exiting wrapper');
      process.exit(0);
    }
  });

  // Handle inner process exit
  innerProcess.on('exit', (code, signal) => {
    log(`Inner exited with code=${code}, signal=${signal}`);
    innerProcess = null;

    if (!intentionalExit) {
      log('Inner exited unexpectedly, wrapper exiting (hooks will restart if needed)');
      process.exit(code ?? 0);
    }
  });

  // Handle inner process errors
  innerProcess.on('error', (error) => {
    log(`Inner error: ${error.message}`);
  });
}

/**
 * Kill the inner process and its process tree
 */
async function killInner(): Promise<void> {
  if (!innerProcess || !innerProcess.pid) {
    log('No inner process to kill');
    return;
  }

  const pid = innerProcess.pid;
  log(`Killing inner process tree (pid=${pid})`);

  if (IS_WINDOWS) {
    try {
      // Use taskkill to kill process tree on Windows
      execSync(`taskkill /PID ${pid} /T /F`, {
        timeout: 10000,
        stdio: 'ignore',
        windowsHide: true  // Prevent popup during kill
      });
      log(`taskkill completed for pid=${pid}`);
    } catch (error) {
      log(`taskkill failed (process may be dead): ${error}`);
    }
  } else {
    // Unix: SIGTERM first, then SIGKILL after timeout
    innerProcess.kill('SIGTERM');

    const exitPromise = new Promise<void>((resolve) => {
      if (!innerProcess) {
        resolve();
        return;
      }
      innerProcess.on('exit', () => resolve());
    });

    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(() => resolve(), 5000)
    );

    await Promise.race([exitPromise, timeoutPromise]);

    if (innerProcess && !innerProcess.killed) {
      log('Inner did not exit gracefully, force killing');
      innerProcess.kill('SIGKILL');
    }
  }

  // Wait for process to fully exit
  await waitForProcessExit(pid, 5000);
  innerProcess = null;
  log('Inner process terminated');
}

/**
 * Wait for a process to exit with timeout
 */
async function waitForProcessExit(pid: number, timeoutMs: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check if process still exists
      process.kill(pid, 0);
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      // Process no longer exists
      return;
    }
  }

  log(`Timeout waiting for process ${pid} to exit`);
}

// Handle termination signals
process.on('SIGTERM', async () => {
  log('Wrapper received SIGTERM');
  intentionalExit = true;
  await killInner();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log('Wrapper received SIGINT');
  intentionalExit = true;
  await killInner();
  process.exit(0);
});

// Start the wrapper
log('Wrapper starting');
spawnInner();
