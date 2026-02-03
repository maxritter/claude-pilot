/**
 * Remote Worker Configuration
 *
 * Functions for reading and caching remote worker configuration.
 */

import type { RemoteWorkerConfig, WorkerMode } from '../types/remote/index.js';
import { SettingsDefaultsManager } from './SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH } from './paths.js';

/** Cached remote configuration */
let cachedConfig: RemoteWorkerConfig | null = null;

/**
 * Clear the remote configuration cache
 * Call when settings are updated
 */
export function clearRemoteConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get remote worker configuration from settings
 * Caches the result to avoid repeated file reads
 */
export function getRemoteConfig(): RemoteWorkerConfig {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);

  cachedConfig = {
    enabled: settings.CLAUDE_MEM_REMOTE_MODE,
    url: settings.CLAUDE_MEM_REMOTE_URL,
    token: settings.CLAUDE_MEM_REMOTE_TOKEN,
    verifySsl: settings.CLAUDE_MEM_REMOTE_VERIFY_SSL,
    timeoutMs: parseInt(settings.CLAUDE_MEM_REMOTE_TIMEOUT_MS, 10),
  };

  return cachedConfig;
}

/**
 * Determine the current worker mode
 */
export function getWorkerMode(): WorkerMode {
  const config = getRemoteConfig();
  return config.enabled && config.url ? 'remote' : 'local';
}

/**
 * Check if running in remote mode
 */
export function isRemoteMode(): boolean {
  return getWorkerMode() === 'remote';
}
