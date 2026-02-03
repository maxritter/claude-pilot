/**
 * HealthMonitor - Port monitoring, health checks, and version checking
 *
 * Extracted from worker-service.ts monolith to provide centralized health monitoring.
 * Handles:
 * - Port availability checking
 * - Worker health/readiness polling
 * - Version mismatch detection (critical for plugin updates)
 * - HTTP-based shutdown requests
 */

import { logger } from '../../utils/logger.js';
import { getWorkerHost } from '../../shared/worker-utils.js';

declare const __DEFAULT_PACKAGE_VERSION__: string;
const BUILT_IN_VERSION = typeof __DEFAULT_PACKAGE_VERSION__ !== 'undefined'
  ? __DEFAULT_PACKAGE_VERSION__
  : '0.0.0-dev';

/**
 * Format worker URL with correct host (supports IPv6)
 * IPv6 addresses need to be wrapped in brackets: [::1]
 */
function formatWorkerUrl(port: number): string {
  const host = getWorkerHost();
  const formattedHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  return `http://${formattedHost}:${port}`;
}

/**
 * Check if a port is in use by querying the health endpoint
 */
export async function isPortInUse(port: number): Promise<boolean> {
  try {
    // Note: Removed AbortSignal.timeout to avoid Windows Bun cleanup issue (libuv assertion)
    const response = await fetch(`${formatWorkerUrl(port)}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for the worker to become fully ready (passes readiness check)
 * @param port Worker port to check
 * @param timeoutMs Maximum time to wait in milliseconds
 * @returns true if worker became ready, false if timeout
 */
export async function waitForHealth(port: number, timeoutMs: number = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // Note: Removed AbortSignal.timeout to avoid Windows Bun cleanup issue (libuv assertion)
      const response = await fetch(`${formatWorkerUrl(port)}/api/readiness`);
      if (response.ok) return true;
    } catch (error) {
      logger.debug('SYSTEM', 'Service not ready yet, will retry', { port }, error as Error);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

/**
 * Wait for a port to become free (no longer responding to health checks)
 * Used after shutdown to confirm the port is available for restart
 */
export async function waitForPortFree(port: number, timeoutMs: number = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await isPortInUse(port))) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

/**
 * Send HTTP shutdown request to a running worker
 * @param port Worker port
 * @returns true if shutdown request was acknowledged, false otherwise
 */
export async function httpShutdown(port: number): Promise<boolean> {
  try {
    // Note: Removed AbortSignal.timeout to avoid Windows Bun cleanup issue (libuv assertion)
    const response = await fetch(`${formatWorkerUrl(port)}/api/admin/shutdown`, {
      method: 'POST'
    });
    if (!response.ok) {
      logger.warn('SYSTEM', 'Shutdown request returned error', { port, status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    if (error instanceof Error && error.message?.includes('ECONNREFUSED')) {
      logger.debug('SYSTEM', 'Worker already stopped', { port }, error);
      return false;
    }
    logger.error('SYSTEM', 'Shutdown request failed unexpectedly', { port }, error as Error);
    return false;
  }
}

/**
 * Get the plugin version from the build-time constant
 * This is the "expected" version that should be running
 */
export function getInstalledPluginVersion(): string {
  return BUILT_IN_VERSION;
}

/**
 * Get the running worker's version via API
 * This is the "actual" version currently running
 */
export async function getRunningWorkerVersion(port: number): Promise<string | null> {
  try {
    const response = await fetch(`${formatWorkerUrl(port)}/api/version`);
    if (!response.ok) return null;
    const data = await response.json() as { version: string };
    return data.version;
  } catch {
    logger.debug('SYSTEM', 'Could not fetch worker version', { port });
    return null;
  }
}

export interface VersionCheckResult {
  matches: boolean;
  pluginVersion: string;
  workerVersion: string | null;
}

/**
 * Check if worker version matches plugin version
 * Critical for detecting when plugin is updated but worker is still running old code
 * Returns true if versions match or if we can't determine (assume match for graceful degradation)
 */
export async function checkVersionMatch(port: number): Promise<VersionCheckResult> {
  const pluginVersion = getInstalledPluginVersion();
  const workerVersion = await getRunningWorkerVersion(port);

  if (!workerVersion) {
    return { matches: true, pluginVersion, workerVersion };
  }

  return { matches: pluginVersion === workerVersion, pluginVersion, workerVersion };
}
