/**
 * Git Branch Utilities
 *
 * Extract current git branch for observation metadata.
 */

import { execSync } from 'child_process';

/**
 * Get the current git branch name.
 * Returns null if not in a git repository or on error.
 *
 * @param cwd - Working directory to check (defaults to process.cwd())
 */
export function getCurrentGitBranch(cwd?: string): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],  // Suppress stderr
      timeout: 5000,  // 5 second timeout
      windowsHide: true  // Prevent Windows Terminal popup
    }).trim();

    // HEAD is returned when in detached HEAD state
    if (branch === 'HEAD') {
      // Try to get the commit short hash instead
      const commit = execSync('git rev-parse --short HEAD', {
        cwd: cwd || process.cwd(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
        windowsHide: true  // Prevent Windows Terminal popup
      }).trim();
      return `detached@${commit}`;
    }

    return branch || null;
  } catch {
    // Not a git repo or git not available
    return null;
  }
}
