import path from 'path';
import fs from 'fs';
import os from 'os';
import { logger } from './logger.js';
import { detectWorktree } from './worktree.js';

// Common container directories where projects are typically located
const PROJECT_CONTAINER_DIRS = [
  'repos', 'projects', 'code', 'work', 'src', 'dev', 'git', 'workspace', 'workspaces'
];

/**
 * Expand tilde (~) in file paths to the user's home directory
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  if (filePath === '~') {
    return os.homedir();
  }
  return filePath;
}

/**
 * Extract project name from working directory path
 * Handles edge cases: null/undefined cwd, drive roots, trailing slashes
 *
 * @param cwd - Current working directory (absolute path)
 * @returns Project name or "unknown-project" if extraction fails
 */
export function getProjectName(cwd: string | null | undefined): string {
  if (!cwd || cwd.trim() === '') {
    logger.warn('PROJECT_NAME', 'Empty cwd provided, using fallback', { cwd });
    return 'unknown-project';
  }

  // Extract basename (handles trailing slashes automatically)
  const basename = path.basename(cwd);

  // Edge case: Drive roots on Windows (C:\, J:\) or Unix root (/)
  // path.basename('C:\') returns '' (empty string)
  if (basename === '') {
    // Extract drive letter on Windows, or use 'root' on Unix
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const driveMatch = cwd.match(/^([A-Z]):\\/i);
      if (driveMatch) {
        const driveLetter = driveMatch[1].toUpperCase();
        const projectName = `drive-${driveLetter}`;
        logger.info('PROJECT_NAME', 'Drive root detected', { cwd, projectName });
        return projectName;
      }
    }
    logger.warn('PROJECT_NAME', 'Root directory detected, using fallback', { cwd });
    return 'unknown-project';
  }

  return basename;
}

/**
 * Project context with worktree awareness
 */
export interface ProjectContext {
  /** The current project name (worktree or main repo) */
  primary: string;
  /** Parent project name if in a worktree, null otherwise */
  parent: string | null;
  /** True if currently in a worktree */
  isWorktree: boolean;
  /** All projects to query: [primary] for main repo, [parent, primary] for worktree */
  allProjects: string[];
}

/**
 * Get project context with worktree detection.
 *
 * When in a worktree, returns both the worktree project name and parent project name
 * for unified timeline queries.
 *
 * @param cwd - Current working directory (absolute path)
 * @returns ProjectContext with worktree info
 */
export function getProjectContext(cwd: string | null | undefined): ProjectContext {
  const primary = getProjectName(cwd);

  if (!cwd) {
    return { primary, parent: null, isWorktree: false, allProjects: [primary] };
  }

  const worktreeInfo = detectWorktree(cwd);

  if (worktreeInfo.isWorktree && worktreeInfo.parentProjectName) {
    // In a worktree: include parent first for chronological ordering
    return {
      primary,
      parent: worktreeInfo.parentProjectName,
      isWorktree: true,
      allProjects: [worktreeInfo.parentProjectName, primary]
    };
  }

  return { primary, parent: null, isWorktree: false, allProjects: [primary] };
}

/**
 * Derive project name from a file path by finding the project root.
 *
 * Uses multiple strategies:
 * 1. Find .git directory (most reliable for git repos)
 * 2. Look for known container directories (repos/, projects/, etc.)
 * 3. Fall back to parent directory of the file
 *
 * @param filePath - Absolute file path (relative paths return null)
 * @param basePath - Optional base path to resolve relative paths against
 * @returns Project name or null if cannot be determined
 */
export function getProjectFromFilePath(filePath: string | null | undefined, basePath?: string): string | null {
  if (!filePath || filePath.trim() === '') {
    return null;
  }

  // Expand tilde and normalize path
  let expandedPath = expandTilde(filePath);

  // Handle relative paths - resolve against basePath if provided
  if (!path.isAbsolute(expandedPath)) {
    if (basePath) {
      expandedPath = path.resolve(basePath, expandedPath);
    } else {
      // Can't determine project from relative path without base
      logger.debug('PROJECT_NAME', 'Skipping relative path without basePath', { filePath });
      return null;
    }
  }

  const normalizedPath = path.normalize(expandedPath);

  // Strategy 1: Look for .git directory by walking up the tree
  const gitProject = findGitProjectRoot(normalizedPath);
  if (gitProject) {
    return gitProject;
  }

  // Strategy 2: Look for known container directory patterns
  // e.g., /home/user/repos/my-project/src/file.ts -> "my-project"
  const containerProject = findProjectFromContainerPath(normalizedPath);
  if (containerProject) {
    return containerProject;
  }

  // Strategy 3: Use a reasonable parent directory
  // Go up 2-3 levels from the file to find a sensible project name
  return findProjectFromParentDirectory(normalizedPath);
}

/**
 * Find project name by locating .git directory
 */
function findGitProjectRoot(filePath: string): string | null {
  try {
    // Determine if path is directory or file
    let currentDir: string;
    try {
      const stat = fs.statSync(filePath);
      currentDir = stat.isDirectory() ? filePath : path.dirname(filePath);
    } catch {
      // File doesn't exist, use parent directory
      currentDir = path.dirname(filePath);
    }

    const root = path.parse(currentDir).root;

    // Limit search depth to prevent infinite loops
    let depth = 0;
    const maxDepth = 20;

    while (currentDir !== root && depth < maxDepth) {
      const gitPath = path.join(currentDir, '.git');
      try {
        if (fs.existsSync(gitPath)) {
          return path.basename(currentDir);
        }
      } catch {
        // Ignore permission errors, etc.
      }
      currentDir = path.dirname(currentDir);
      depth++;
    }

    return null;
  } catch {
    // Any unexpected error, return null
    return null;
  }
}

/**
 * Find project from known container directory patterns
 * e.g., /home/user/repos/my-project/... -> "my-project"
 */
function findProjectFromContainerPath(filePath: string): string | null {
  const parts = filePath.split(path.sep);

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i].toLowerCase();
    if (PROJECT_CONTAINER_DIRS.includes(part)) {
      // The next part after the container dir is the project name
      const projectName = parts[i + 1];
      if (projectName && projectName !== '') {
        return projectName;
      }
    }
  }

  return null;
}

/**
 * Fall back to using parent directory as project name
 * Goes up 2-3 levels to find a reasonable project name
 */
function findProjectFromParentDirectory(filePath: string): string | null {
  try {
    // Determine if path is directory or file
    let currentDir: string;
    try {
      const stat = fs.statSync(filePath);
      currentDir = stat.isDirectory() ? filePath : path.dirname(filePath);
    } catch {
      // File doesn't exist, use parent directory
      currentDir = path.dirname(filePath);
    }

    const root = path.parse(currentDir).root;

    // Go up to find a directory that looks like a project root
    // (not too deep, not at system level)
    let depth = 0;
    const minDepth = 2;  // Skip immediate parent (likely src/, lib/, etc.)
    const maxDepth = 5;

    while (currentDir !== root && depth < maxDepth) {
      const dirName = path.basename(currentDir);

      // Skip common non-project directories
      const skipDirs = ['src', 'lib', 'dist', 'build', 'node_modules', 'vendor', '.git', 'bin', 'pkg', 'cmd'];
      if (depth >= minDepth && !skipDirs.includes(dirName.toLowerCase())) {
        return dirName;
      }

      currentDir = path.dirname(currentDir);
      depth++;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Derive the most likely project from a list of file paths.
 *
 * This is useful for determining the actual project being worked on
 * based on which files were read or modified, rather than relying
 * solely on the session's working directory.
 *
 * @param filePaths - Array of file paths (absolute or relative)
 * @param fallbackProject - Project to use if no files or can't determine
 * @param basePath - Optional base path to resolve relative paths against (e.g., session cwd)
 * @returns The most common project name from the files, or fallback
 */
export function getProjectFromFiles(
  filePaths: string[],
  fallbackProject: string,
  basePath?: string
): string {
  if (!filePaths || filePaths.length === 0) {
    return fallbackProject;
  }

  // Count projects from all files
  const projectCounts = new Map<string, number>();

  for (const filePath of filePaths) {
    const project = getProjectFromFilePath(filePath, basePath);
    if (project) {
      projectCounts.set(project, (projectCounts.get(project) || 0) + 1);
    }
  }

  if (projectCounts.size === 0) {
    return fallbackProject;
  }

  // Find the most common project
  let maxCount = 0;
  let mostCommonProject = fallbackProject;

  for (const [project, count] of projectCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonProject = project;
    }
  }

  // Log if we detected a different project than the session default
  if (mostCommonProject !== fallbackProject) {
    logger.debug('PROJECT_NAME', 'Detected project from files differs from session', {
      detectedProject: mostCommonProject,
      sessionProject: fallbackProject,
      fileCount: filePaths.length
    });
  }

  return mostCommonProject;
}
