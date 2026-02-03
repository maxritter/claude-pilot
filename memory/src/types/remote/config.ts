/**
 * Remote Worker Configuration Types
 *
 * Type definitions for configuring remote worker connections.
 */

/**
 * Worker operation mode
 */
export type WorkerMode = 'local' | 'remote';

/**
 * Remote worker configuration from settings
 */
export interface RemoteWorkerConfig {
  /** Whether remote mode is enabled */
  enabled: boolean;
  /** Full base URL of remote worker (e.g., "https://claude-mem.example.com") */
  url: string;
  /** Bearer token for authentication */
  token: string;
  /** Whether to verify SSL certificates */
  verifySsl: boolean;
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Resolved worker endpoint configuration
 * Used by hooks and services for API calls
 */
export interface WorkerEndpointConfig {
  /** The worker mode (local or remote) */
  mode: WorkerMode;
  /** Base URL to use for API calls */
  baseUrl: string;
  /** Auth headers to include in requests */
  authHeaders: Record<string, string>;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Whether SSL should be verified */
  verifySsl: boolean;
}
