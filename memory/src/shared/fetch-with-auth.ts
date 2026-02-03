/**
 * Authenticated Fetch
 *
 * Fetch wrapper that adds authentication headers for remote worker calls.
 */

import type { WorkerEndpointConfig } from '../types/remote/index.js';
import { fetchWithRetry, type FetchWithRetryOptions } from './fetch-utils.js';

/**
 * Options for authenticated fetch
 */
export interface AuthenticatedFetchOptions extends FetchWithRetryOptions {
  /** Worker endpoint configuration for auth headers */
  endpointConfig?: WorkerEndpointConfig;
}

/**
 * Fetch with authentication and automatic retry
 * Adds auth headers from endpoint configuration
 */
export async function fetchWithAuth(
  url: string | URL,
  init?: RequestInit,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { endpointConfig, ...retryOptions } = options;

  const headers = new Headers(init?.headers);

  // Add auth headers from endpoint config
  if (endpointConfig?.authHeaders) {
    for (const [key, value] of Object.entries(endpointConfig.authHeaders)) {
      headers.set(key, value);
    }
  }

  // Add content-type if body is present and not already set
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetchWithRetry(url, { ...init, headers }, retryOptions);
}
