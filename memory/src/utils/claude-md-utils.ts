/**
 * CLAUDE.md File Utilities
 *
 * Shared utilities for writing folder-level CLAUDE.md files with
 * auto-generated context sections. Preserves user content outside
 * <claude-mem-context> tags.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './logger.js';
import { formatDate, groupByDate } from '../shared/timeline-formatting.js';
import { SettingsDefaultsManager } from '../shared/SettingsDefaultsManager.js';
import { getWorkerHost } from '../shared/worker-utils.js';

const SETTINGS_PATH = path.join(os.homedir(), '.claude-mem', 'settings.json');

/**
 * Directories that should NEVER have CLAUDE.md files created.
 * These are either:
 * - System/tool directories (.git)
 * - Dependency directories (node_modules, vendor)
 * - Build/cache directories (dist, __pycache__)
 * - Virtual environments (.venv, venv)
 */
const ALWAYS_EXCLUDED_DIRS = [
  '.git',
  'node_modules',
  '__pycache__',
  '.pycache',
  'venv',
  '.venv',
  '.env',
  'vendor',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.output',
  '.cache',
  '.turbo',
  'coverage',
  '.nyc_output',
  '.pytest_cache',
  '.mypy_cache',
  '.tox',
  'eggs',
  '*.egg-info',
  '.eggs',
  'target',  // Rust/Java build output
  'out',
  '.gradle',
  '.maven',
];

/**
 * Check if a path segment matches an excluded directory pattern.
 * Handles both exact matches and glob patterns (e.g., *.egg-info).
 */
function matchesExcludedDir(segment: string): boolean {
  for (const pattern of ALWAYS_EXCLUDED_DIRS) {
    if (pattern.includes('*')) {
      // Simple glob matching for *.ext patterns
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(segment)) return true;
    } else {
      if (segment === pattern) return true;
    }
  }
  return false;
}

/**
 * Check if a path contains any always-excluded directory.
 * This catches paths like /project/node_modules/package/file.js
 */
function containsExcludedDir(filePath: string): boolean {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');

  for (const segment of segments) {
    if (matchesExcludedDir(segment)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate that a file path is safe for CLAUDE.md generation.
 * Rejects tilde paths, URLs, command-like strings, paths with invalid chars,
 * and paths containing always-excluded directories.
 *
 * @param filePath - The file path to validate
 * @param projectRoot - Optional project root for boundary checking
 * @returns true if path is valid for CLAUDE.md processing
 */
function isValidPathForClaudeMd(filePath: string, projectRoot?: string): boolean {
  // Reject empty or whitespace-only
  if (!filePath || !filePath.trim()) return false;

  // Reject tilde paths (Node.js doesn't expand ~)
  if (filePath.startsWith('~')) return false;

  // Reject URLs
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return false;

  // Reject paths with spaces (likely command text or PR references)
  if (filePath.includes(' ')) return false;

  // Reject paths with # (GitHub issue/PR references)
  if (filePath.includes('#')) return false;

  // Reject paths containing always-excluded directories
  if (containsExcludedDir(filePath)) {
    return false;
  }

  // If projectRoot provided, ensure path stays within project boundaries
  if (projectRoot) {
    // For relative paths, resolve against projectRoot; for absolute paths, use directly
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
    const normalizedRoot = path.resolve(projectRoot);
    if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
      return false;
    }
  }

  return true;
}

/**
 * Replace tagged content in existing file, preserving content outside tags.
 *
 * Handles three cases:
 * 1. No existing content → wraps new content in tags
 * 2. Has existing tags → replaces only tagged section
 * 3. No tags in existing content → appends tagged content at end
 */
export function replaceTaggedContent(existingContent: string, newContent: string): string {
  const startTag = '<claude-mem-context>';
  const endTag = '</claude-mem-context>';

  // If no existing content, wrap new content in tags
  if (!existingContent) {
    return `${startTag}\n${newContent}\n${endTag}`;
  }

  // If existing has tags, replace only tagged section
  const startIdx = existingContent.indexOf(startTag);
  const endIdx = existingContent.indexOf(endTag);

  if (startIdx !== -1 && endIdx !== -1) {
    return existingContent.substring(0, startIdx) +
           `${startTag}\n${newContent}\n${endTag}` +
           existingContent.substring(endIdx + endTag.length);
  }

  // If no tags exist, append tagged content at end
  return existingContent + `\n\n${startTag}\n${newContent}\n${endTag}`;
}

/**
 * Write CLAUDE.md file to folder with atomic writes.
 * Creates directory structure if needed.
 *
 * @param folderPath - Absolute path to the folder
 * @param newContent - Content to write inside tags
 */
export function writeClaudeMdToFolder(folderPath: string, newContent: string): void {
  // Don't create directories that don't exist - prevents spurious directory creation
  if (!existsSync(folderPath)) {
    logger.debug('FOLDER_INDEX', 'Skipping non-existent folder', { folderPath });
    return;
  }

  const claudeMdPath = path.join(folderPath, 'CLAUDE.md');
  const tempFile = `${claudeMdPath}.tmp`;

  // Read existing content if file exists
  let existingContent = '';
  if (existsSync(claudeMdPath)) {
    existingContent = readFileSync(claudeMdPath, 'utf-8');
  }

  // Don't create new files with only "No recent activity" content
  // But DO update existing files (user may have added custom content)
  if (!existingContent && newContent.includes('*No recent activity*')) {
    logger.debug('FOLDER_INDEX', 'Skipping empty activity file creation', { folderPath });
    return;
  }

  // Replace only tagged content, preserve user content
  const finalContent = replaceTaggedContent(existingContent, newContent);

  // Atomic write: temp file + rename
  writeFileSync(tempFile, finalContent);
  renameSync(tempFile, claudeMdPath);
}

/**
 * Parsed observation from API response text
 */
interface ParsedObservation {
  id: string;
  time: string;
  typeEmoji: string;
  title: string;
  tokens: string;
  epoch: number; // For date grouping
}

/**
 * Format timeline text from API response to timeline format.
 *
 * Uses the same format as search results:
 * - Grouped by date (### Jan 4, 2026)
 * - Grouped by file within each date (**filename**)
 * - Table with columns: ID, Time, T (type emoji), Title, Read (tokens)
 * - Ditto marks for repeated times
 *
 * @param timelineText - Raw API response text
 * @returns Formatted markdown with date/file grouping
 */
export function formatTimelineForClaudeMd(timelineText: string): string {
  const lines: string[] = [];
  lines.push('# Recent Activity');
  lines.push('');
  lines.push('<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->');
  lines.push('');

  // Parse the API response to extract observation rows
  const apiLines = timelineText.split('\n');

  // Note: We skip file grouping since we're querying by folder - all results are from the same folder

  // Parse observations: | #123 | 4:30 PM | 🔧 | Title | ~250 | ... |
  const observations: ParsedObservation[] = [];
  let lastTimeStr = '';
  let currentDate: Date | null = null;

  for (const line of apiLines) {
    // Check for date headers: ### Jan 4, 2026
    const dateMatch = line.match(/^###\s+(.+)$/);
    if (dateMatch) {
      const dateStr = dateMatch[1].trim();
      const parsedDate = new Date(dateStr);
      // Validate the parsed date
      if (!isNaN(parsedDate.getTime())) {
        currentDate = parsedDate;
      }
      continue;
    }

    // Match table rows: | #123 | 4:30 PM | 🔧 | Title | ~250 | ... |
    // Also handles ditto marks and session IDs (#S123)
    const match = line.match(/^\|\s*(#[S]?\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
    if (match) {
      const [, id, timeStr, typeEmoji, title, tokens] = match;

      // Handle ditto mark (″) - use last time
      let time: string;
      if (timeStr.trim() === '″' || timeStr.trim() === '"') {
        time = lastTimeStr;
      } else {
        time = timeStr.trim();
        lastTimeStr = time;
      }

      // Parse time and combine with current date header (or fallback to today)
      const baseDate = currentDate ? new Date(currentDate) : new Date();
      const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let epoch = baseDate.getTime();
      if (timeParts) {
        let hours = parseInt(timeParts[1], 10);
        const minutes = parseInt(timeParts[2], 10);
        const isPM = timeParts[3].toUpperCase() === 'PM';
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        baseDate.setHours(hours, minutes, 0, 0);
        epoch = baseDate.getTime();
      }

      observations.push({
        id: id.trim(),
        time,
        typeEmoji: typeEmoji.trim(),
        title: title.trim(),
        tokens: tokens.trim(),
        epoch
      });
    }
  }

  if (observations.length === 0) {
    lines.push('*No recent activity*');
    return lines.join('\n');
  }

  // Group by date
  const byDate = groupByDate(observations, obs => new Date(obs.epoch).toISOString());

  // Render each date group
  for (const [day, dayObs] of byDate) {
    lines.push(`### ${day}`);
    lines.push('');
    lines.push('| ID | Time | T | Title | Read |');
    lines.push('|----|------|---|-------|------|');

    let lastTime = '';
    for (const obs of dayObs) {
      const timeDisplay = obs.time === lastTime ? '"' : obs.time;
      lastTime = obs.time;
      lines.push(`| ${obs.id} | ${timeDisplay} | ${obs.typeEmoji} | ${obs.title} | ${obs.tokens} |`);
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Project root indicators - files that typically exist only at project root level.
 * Used to detect project roots even without .git (e.g., reference codebases).
 */
const PROJECT_ROOT_INDICATORS = [
  '.git',
  'package.json',
  'composer.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'setup.py',
  'Gemfile',
  'pom.xml',
  'build.gradle',
  'CMakeLists.txt',
  'Makefile.am',
  'meson.build',
];

/**
 * Check if a folder is a project root.
 * Detects project roots by checking for common project indicators (package.json,
 * composer.json, etc.) in addition to .git. This prevents auto-updating CLAUDE.md
 * in reference codebases that may not have .git directories.
 *
 * Also treats folders with existing user-managed CLAUDE.md (without claude-mem tags)
 * as project roots to preserve user content.
 */
function isProjectRoot(folderPath: string): boolean {
  // Check for common project root indicators
  for (const indicator of PROJECT_ROOT_INDICATORS) {
    const indicatorPath = path.join(folderPath, indicator);
    if (existsSync(indicatorPath)) {
      return true;
    }
  }

  // Check for existing user-managed CLAUDE.md (without claude-mem tags)
  const claudeMdPath = path.join(folderPath, 'CLAUDE.md');
  if (existsSync(claudeMdPath)) {
    try {
      const content = readFileSync(claudeMdPath, 'utf-8');
      // If CLAUDE.md exists but has no claude-mem tags, treat as user-managed project root
      if (!content.includes('<claude-mem-context>')) {
        return true;
      }
    } catch {
      // If we can't read it, err on the side of caution
      return true;
    }
  }

  return false;
}

/**
 * Check if a folder path is excluded from CLAUDE.md generation.
 * A folder is excluded if:
 * 1. It contains an always-excluded directory (node_modules, .git, etc.)
 * 2. It starts with any path in the user's exclude list
 *
 * @param folderPath - Absolute path to check
 * @param excludePaths - Array of user-configured paths to exclude
 * @returns true if folder should be excluded
 */
function isExcludedFolder(folderPath: string, excludePaths: string[]): boolean {
  // Always check for built-in excluded directories first
  if (containsExcludedDir(folderPath)) {
    return true;
  }

  // Check user-configured exclude paths
  const normalizedFolder = path.resolve(folderPath);
  for (const excludePath of excludePaths) {
    const normalizedExclude = path.resolve(excludePath);
    // Check if folder is within excluded path
    if (normalizedFolder === normalizedExclude ||
        normalizedFolder.startsWith(normalizedExclude + path.sep)) {
      return true;
    }
  }
  return false;
}

/**
 * Update CLAUDE.md files for folders containing the given files.
 * Fetches timeline from worker API and writes formatted content.
 *
 * NOTE: Project root folders (containing .git) are excluded to preserve
 * user-managed root CLAUDE.md files. Only subfolder CLAUDE.md files are auto-updated.
 *
 * @param filePaths - Array of absolute file paths (modified or read)
 * @param project - Project identifier for API query
 * @param port - Worker API port
 */
export async function updateFolderClaudeMdFiles(
  filePaths: string[],
  project: string,
  port: number,
  projectRoot?: string
): Promise<void> {
  // Load settings to get configurable observation limit and exclude list
  const settings = SettingsDefaultsManager.loadFromFile(SETTINGS_PATH);

  // Check if folder CLAUDE.md generation is enabled
  if (!settings.CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED) {
    logger.debug('FOLDER_INDEX', 'Folder CLAUDE.md generation disabled by setting');
    return;
  }

  const limit = parseInt(settings.CLAUDE_MEM_CONTEXT_OBSERVATIONS, 10) || 50;

  // Parse exclude paths from settings
  let excludePaths: string[] = [];
  try {
    const parsed = JSON.parse(settings.CLAUDE_MEM_FOLDER_MD_EXCLUDE || '[]');
    if (Array.isArray(parsed)) {
      excludePaths = parsed.filter((p): p is string => typeof p === 'string');
    }
  } catch {
    logger.warn('FOLDER_INDEX', 'Failed to parse CLAUDE_MEM_FOLDER_MD_EXCLUDE setting');
  }

  // Extract unique folder paths from file paths
  const folderPaths = new Set<string>();
  for (const filePath of filePaths) {
    if (!filePath || filePath === '') continue;
    // VALIDATE PATH BEFORE PROCESSING
    if (!isValidPathForClaudeMd(filePath, projectRoot)) {
      logger.debug('FOLDER_INDEX', 'Skipping invalid file path', {
        filePath,
        reason: 'Failed path validation'
      });
      continue;
    }
    // Resolve relative paths to absolute using projectRoot
    let absoluteFilePath = filePath;
    if (projectRoot && !path.isAbsolute(filePath)) {
      absoluteFilePath = path.join(projectRoot, filePath);
    }
    const folderPath = path.dirname(absoluteFilePath);
    if (folderPath && folderPath !== '.' && folderPath !== '/') {
      // Skip .git directories - causes git pull failures
      if (folderPath.includes('/.git') || folderPath.includes('\\.git')) {
        logger.debug('FOLDER_INDEX', 'Skipping .git directory', { folderPath });
        continue;
      }
      // Skip project root - root CLAUDE.md should remain user-managed
      if (isProjectRoot(folderPath)) {
        logger.debug('FOLDER_INDEX', 'Skipping project root CLAUDE.md', { folderPath });
        continue;
      }
      // Skip folders in exclude list
      if (excludePaths.length > 0 && isExcludedFolder(folderPath, excludePaths)) {
        logger.debug('FOLDER_INDEX', 'Skipping excluded folder', { folderPath });
        continue;
      }
      folderPaths.add(folderPath);
    }
  }

  if (folderPaths.size === 0) return;

  logger.debug('FOLDER_INDEX', 'Updating CLAUDE.md files', {
    project,
    folderCount: folderPaths.size
  });

  // Process each folder
  for (const folderPath of folderPaths) {
    try {
      // Fetch timeline via existing API
      const host = getWorkerHost();
      const response = await fetch(
        `http://${host}:${port}/api/search/by-file?filePath=${encodeURIComponent(folderPath)}&limit=${limit}&project=${encodeURIComponent(project)}&isFolder=true`
      );

      if (!response.ok) {
        logger.error('FOLDER_INDEX', 'Failed to fetch timeline', { folderPath, status: response.status });
        continue;
      }

      const result = await response.json();
      if (!result.content?.[0]?.text) {
        logger.debug('FOLDER_INDEX', 'No content for folder', { folderPath });
        continue;
      }

      const formatted = formatTimelineForClaudeMd(result.content[0].text);
      writeClaudeMdToFolder(folderPath, formatted);

      logger.debug('FOLDER_INDEX', 'Updated CLAUDE.md', { folderPath });
    } catch (error) {
      // Fire-and-forget: log warning but don't fail
      const err = error as Error;
      logger.error('FOLDER_INDEX', 'Failed to update CLAUDE.md', {
        folderPath,
        errorMessage: err.message,
        errorStack: err.stack
      });
    }
  }
}
