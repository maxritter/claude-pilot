/**
 * Remote Worker Response Types
 *
 * Type definitions for API responses.
 */

/**
 * Health check response from remote worker
 */
export interface RemoteHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  services: {
    database: boolean;
    searchManager: boolean;
    mcp: boolean;
    vectorDb: boolean;
  };
}

/**
 * Remote worker error codes
 */
export type RemoteErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'INVALID_REQUEST';

/**
 * Error response from remote worker
 */
export interface RemoteErrorResponse {
  error: string;
  code: RemoteErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
