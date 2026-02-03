/**
 * Bun Path Utility
 * 
 * Resolves the Bun executable path for environments where Bun is not in PATH
 * (e.g., fish shell users where ~/.config/fish/config.fish isn't read by /bin/sh)
 */

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from './logger.js';

/**
 * Get the Bun executable path
 * Priority: common paths first (avoids shell), then PATH lookup
 * Returns absolute path if found, null otherwise
 */
export function getBunPath(): string | null {
  const isWindows = process.platform === 'win32';

  // Check common installation paths FIRST (avoids libuv assertion on Windows)
  // Absolute paths don't need shell resolution
  const bunPaths = isWindows
    ? [join(homedir(), '.bun', 'bin', 'bun.exe')]
    : [
        join(homedir(), '.bun', 'bin', 'bun'),
        '/usr/local/bin/bun',
        '/opt/homebrew/bin/bun', // Apple Silicon Homebrew
        '/home/linuxbrew/.linuxbrew/bin/bun' // Linux Homebrew
      ];

  for (const bunPath of bunPaths) {
    if (existsSync(bunPath)) {
      return bunPath;
    }
  }

  // Fall back to PATH lookup
  try {
    const result = spawnSync('bun', ['--version'], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,  // SECURITY: No need for shell, bun is the executable
      windowsHide: true  // Prevent Windows Terminal popup
    });
    if (result.status === 0) {
      return 'bun'; // Available in PATH
    }
  } catch (e) {
    logger.debug('SYSTEM', 'Bun not found in PATH or common locations', {
      error: e instanceof Error ? e.message : String(e)
    });
  }

  return null;
}

/**
 * Get the Bun executable path or throw an error
 * Use this when Bun is required for operation
 */
export function getBunPathOrThrow(): string {
  const bunPath = getBunPath();
  if (!bunPath) {
    const isWindows = process.platform === 'win32';
    const installCmd = isWindows
      ? 'powershell -c "irm bun.sh/install.ps1 | iex"'
      : 'curl -fsSL https://bun.sh/install | bash';
    throw new Error(
      `Bun is required but not found. Install it with:\n  ${installCmd}\nThen restart your terminal.`
    );
  }
  return bunPath;
}

/**
 * Check if Bun is available (in PATH or common locations)
 */
export function isBunAvailable(): boolean {
  return getBunPath() !== null;
}
