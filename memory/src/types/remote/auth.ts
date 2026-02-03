/**
 * Remote Worker Authentication Types
 *
 * Type definitions for authentication and authorization.
 */

/**
 * Authorization scopes for remote worker access
 */
export type RemoteAuthScope =
  | 'read:context'
  | 'write:observations'
  | 'write:sessions'
  | 'read:search'
  | 'admin:restart'
  | 'admin:shutdown'
  | '*';

/**
 * Authentication token payload
 */
export interface RemoteAuthPayload {
  /** Client identifier (optional, for logging) */
  clientId?: string;
  /** Token issue timestamp */
  issuedAt: number;
  /** Token expiry timestamp (optional) */
  expiresAt?: number;
  /** Granted scopes */
  scopes: RemoteAuthScope[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key extraction strategy */
  keyBy: 'token' | 'ip' | 'both';
}
