import path from "path";
import { logger } from "../utils/logger.js";
import { HOOK_TIMEOUTS, getTimeout } from "./hook-constants.js";
import { SettingsDefaultsManager } from "./SettingsDefaultsManager.js";
import { getWorkerRestartInstructions } from "../utils/error-messages.js";

declare const __DEFAULT_PACKAGE_VERSION__: string;
const BUILT_IN_VERSION = typeof __DEFAULT_PACKAGE_VERSION__ !== 'undefined'
  ? __DEFAULT_PACKAGE_VERSION__
  : '0.0.0-dev';

const HEALTH_CHECK_TIMEOUT_MS = getTimeout(HOOK_TIMEOUTS.HEALTH_CHECK);

let cachedPort: number | null = null;
let cachedHost: string | null = null;
let cachedBind: string | null = null;

/**
 * Get the worker port number from settings
 * Uses CLAUDE_MEM_WORKER_PORT from settings file or default (37777)
 * Caches the port value to avoid repeated file reads
 */
export function getWorkerPort(): number {
  if (cachedPort !== null) {
    return cachedPort;
  }

  const settingsPath = path.join(SettingsDefaultsManager.get('CLAUDE_MEM_DATA_DIR'), 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  cachedPort = parseInt(settings.CLAUDE_MEM_WORKER_PORT, 10);
  return cachedPort;
}

/**
 * Get the worker host address (for client connections)
 * Uses CLAUDE_MEM_WORKER_HOST from settings file or default (127.0.0.1)
 * Caches the host value to avoid repeated file reads
 */
export function getWorkerHost(): string {
  if (cachedHost !== null) {
    return cachedHost;
  }

  const settingsPath = path.join(SettingsDefaultsManager.get('CLAUDE_MEM_DATA_DIR'), 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  cachedHost = settings.CLAUDE_MEM_WORKER_HOST;
  return cachedHost;
}

/**
 * Get the worker bind address (for server listening)
 * Uses CLAUDE_MEM_WORKER_BIND from settings file or default (127.0.0.1)
 * Set to 0.0.0.0 to allow network access from other machines
 * Caches the bind value to avoid repeated file reads
 */
export function getWorkerBind(): string {
  if (cachedBind !== null) {
    return cachedBind;
  }

  const settingsPath = path.join(SettingsDefaultsManager.get('CLAUDE_MEM_DATA_DIR'), 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  cachedBind = settings.CLAUDE_MEM_WORKER_BIND;
  return cachedBind;
}

/**
 * Clear the cached port, host, and bind values
 * Call this when settings are updated to force re-reading from file
 */
export function clearPortCache(): void {
  cachedPort = null;
  cachedHost = null;
  cachedBind = null;
}

/**
 * Format host for URL (handles IPv6 addresses correctly)
 * IPv6 addresses need to be wrapped in brackets: [::1]
 */
function formatHostForUrl(host: string): string {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }
  return host;
}

/**
 * Get the worker base URL (protocol + host + port)
 * Handles IPv6 addresses correctly by wrapping them in brackets
 * Example: http://127.0.0.1:37777 or http://[::1]:37777
 */
export function getWorkerBaseUrl(): string {
  const host = getWorkerHost();
  const port = getWorkerPort();
  return `http://${formatHostForUrl(host)}:${port}`;
}

/**
 * Check if worker core services are ready (Database + SearchManager)
 * Changed from /api/readiness to /api/core-ready for faster hook startup
 * Hooks don't need MCP, only core services for database operations
 */
async function isWorkerHealthy(): Promise<boolean> {
  // Note: Removed AbortSignal.timeout to avoid Windows Bun cleanup issue (libuv assertion)
  const response = await fetch(`${getWorkerBaseUrl()}/api/core-ready`);
  return response.ok;
}

/**
 * Get the current plugin version from build-time constant
 */
function getPluginVersion(): string {
  return BUILT_IN_VERSION;
}

/**
 * Get the running worker's version from the API
 */
async function getWorkerVersion(): Promise<string> {
  // Note: Removed AbortSignal.timeout to avoid Windows Bun cleanup issue (libuv assertion)
  const response = await fetch(`${getWorkerBaseUrl()}/api/version`);
  if (!response.ok) {
    throw new Error(`Failed to get worker version: ${response.status}`);
  }
  const data = await response.json() as { version: string };
  return data.version;
}

/**
 * Check if worker version matches plugin version
 * Note: Auto-restart on version mismatch is now handled in worker-service.ts start command (issue #484)
 * This function logs for informational purposes only
 */
async function checkWorkerVersion(): Promise<void> {
  const pluginVersion = getPluginVersion();
  const workerVersion = await getWorkerVersion();

  if (pluginVersion !== workerVersion) {
    logger.debug('SYSTEM', 'Version check', {
      pluginVersion,
      workerVersion,
      note: 'Mismatch will be auto-restarted by worker-service start command'
    });
  }
}


/**
 * Result of a non-blocking worker readiness check
 */
export interface WorkerReadyResult {
  ready: boolean;
  waited: number;
}

/**
 * Try to ensure worker is running with a configurable timeout
 * Non-blocking version that returns status instead of throwing
 * @param maxWaitMs Maximum time to wait for worker (default 3000ms)
 * @returns Object with ready status and time waited
 */
export async function tryEnsureWorkerRunning(maxWaitMs: number = 3000): Promise<WorkerReadyResult> {
  const pollInterval = 100;
  const maxRetries = Math.ceil(maxWaitMs / pollInterval);
  const startTime = Date.now();

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (await isWorkerHealthy()) {
        checkWorkerVersion().catch(() => {});
        return { ready: true, waited: Date.now() - startTime };
      }
    } catch (e) {
      if (i === 0) {
        logger.debug('SYSTEM', 'Worker not ready, polling...', {
          maxWaitMs,
          error: e instanceof Error ? e.message : String(e)
        });
      }
    }
    await new Promise(r => setTimeout(r, pollInterval));
  }

  return { ready: false, waited: Date.now() - startTime };
}

/**
 * Ensure worker service is running (blocking version)
 * Polls until worker is ready (assumes worker-service.cjs start was called by hooks.json)
 * @deprecated Prefer tryEnsureWorkerRunning() for non-blocking checks
 */
export async function ensureWorkerRunning(): Promise<void> {
  const maxRetries = 75;
  const pollInterval = 200;

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (await isWorkerHealthy()) {
        await checkWorkerVersion();
        return;
      }
    } catch (e) {
      logger.debug('SYSTEM', 'Worker health check failed, will retry', {
        attempt: i + 1,
        maxRetries,
        error: e instanceof Error ? e.message : String(e)
      });
    }
    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error(getWorkerRestartInstructions({
    port: getWorkerPort(),
    customPrefix: 'Worker did not become ready within 15 seconds.'
  }));
}
