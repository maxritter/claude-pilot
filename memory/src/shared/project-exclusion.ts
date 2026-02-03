/**
 * Project Exclusion Utilities
 *
 * Check if a project should be excluded from tracking:
 * 1. Project-level config via .claude-mem.json (highest priority)
 * 2. Global exclusion patterns via CLAUDE_MEM_EXCLUDE_PROJECTS setting
 *
 * Supports: exact match, prefix (*), suffix (*), single char wildcard (?)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SettingsDefaultsManager } from './SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH } from './paths.js';

/**
 * Project-level config structure for .claude-mem.json
 */
interface ProjectMemConfig {
  enabled?: boolean;
  reason?: string;
  captureObservations?: boolean;
  captureSessions?: boolean;
  capturePrompts?: boolean;
}

/**
 * Check for .claude-mem.json in a directory and read its config.
 * Returns null if file doesn't exist or is invalid.
 */
function readProjectConfig(cwd: string): ProjectMemConfig | null {
  const configPath = join(cwd, '.claude-mem.json');
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as ProjectMemConfig;
    return config;
  } catch {
    // Invalid JSON or read error - ignore
    return null;
  }
}

/**
 * Check if memory is disabled via project-level .claude-mem.json
 * Returns true if memory should be disabled for this project.
 */
export function isMemoryDisabledByProjectConfig(cwd: string): boolean {
  const config = readProjectConfig(cwd);
  if (!config) return false;

  // If enabled is explicitly false, memory is disabled
  if (config.enabled === false) {
    return true;
  }

  return false;
}

/**
 * Convert a glob pattern to a RegExp
 * Supports: *, ?, and escapes other regex chars
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
    .replace(/\*/g, '.*')                   // * -> .*
    .replace(/\?/g, '.');                   // ? -> .
  return new RegExp(`^${escaped}$`, 'i');   // Case insensitive, full match
}

/**
 * Check if a project name matches any exclusion pattern
 */
function matchesExclusionPattern(projectName: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = globToRegex(pattern);
    if (regex.test(projectName)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a project should be excluded from tracking.
 * Uses CLAUDE_MEM_EXCLUDE_PROJECTS setting with glob pattern matching.
 *
 * @param projectName - The project name to check
 * @returns true if project should be excluded
 */
export function isProjectExcluded(projectName: string): boolean {
  if (!projectName) return false;

  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);

  // Parse exclusion patterns
  let patterns: string[] = [];
  try {
    const parsed = JSON.parse(settings.CLAUDE_MEM_EXCLUDE_PROJECTS || '[]');
    if (Array.isArray(parsed)) {
      patterns = parsed.filter((p): p is string => typeof p === 'string' && p.length > 0);
    }
  } catch {
    // Invalid JSON - no patterns
    return false;
  }

  if (patterns.length === 0) return false;

  return matchesExclusionPattern(projectName, patterns);
}
