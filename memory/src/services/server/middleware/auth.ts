/**
 * Authentication Middleware for Remote Worker Access
 *
 * Validates bearer tokens or session cookies for remote client connections.
 * Local connections (127.0.0.1, ::1) bypass authentication.
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';
import type { RemoteAuthScope } from '../../../types/remote/index.js';
import { SettingsDefaultsManager } from '../../../shared/SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH } from '../../../shared/paths.js';

/** Session cookie name */
const SESSION_COOKIE = 'claude_mem_session';

/** Session expiry in milliseconds (24 hours) */
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** In-memory session store (simple for now, could be extended to persistent storage) */
const sessions = new Map<string, { createdAt: number; ip: string }>();

/**
 * Extended Express Request with auth info
 */
export interface AuthenticatedRequest extends Request {
  /** Authentication information if token was validated */
  auth?: {
    /** Whether request is from localhost */
    isLocal: boolean;
    /** Client identifier from token */
    clientId?: string;
    /** Granted scopes */
    scopes: RemoteAuthScope[];
  };
}

/**
 * Check if request is from localhost
 */
function isLocalRequest(req: Request): boolean {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  return (
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp === '::ffff:127.0.0.1' ||
    clientIp === 'localhost'
  );
}

/**
 * Get configured token from settings
 */
function getConfiguredToken(): string {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  return settings.CLAUDE_MEM_REMOTE_TOKEN;
}

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate session cookie
 */
function isValidSession(sessionId: string, clientIp: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  // Check expiry
  if (Date.now() - session.createdAt > SESSION_EXPIRY_MS) {
    sessions.delete(sessionId);
    return false;
  }

  return true;
}

/**
 * Create a new session
 */
export function createSession(clientIp: string): string {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    createdAt: Date.now(),
    ip: clientIp,
  });
  return sessionId;
}

/**
 * Invalidate a session
 */
export function invalidateSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Clean up expired sessions (call periodically)
 */
export function cleanupSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_EXPIRY_MS) {
      sessions.delete(id);
    }
  }
}

// Cleanup expired sessions every hour
setInterval(cleanupSessions, 60 * 60 * 1000);

/**
 * Authentication middleware
 * - Localhost requests: Always allowed with full access
 * - Remote requests: Require valid bearer token OR session cookie
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Localhost always allowed
  if (isLocalRequest(req)) {
    req.auth = {
      isLocal: true,
      scopes: ['*'],
    };
    return next();
  }

  // Allow unauthenticated access to login page and auth endpoints
  if (req.path === '/login' || req.path.startsWith('/api/auth/')) {
    return next();
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  // Check for session cookie first (for browser access)
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId && isValidSession(sessionId, clientIp)) {
    req.auth = {
      isLocal: false,
      clientId: 'web-session',
      scopes: ['*'],
    };
    return next();
  }

  // Check for bearer token (for API access)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const configuredToken = getConfiguredToken();

    if (configuredToken && token === configuredToken) {
      req.auth = {
        isLocal: false,
        clientId: 'api-client',
        scopes: ['*'],
      };
      return next();
    }
  }

  // No valid authentication - check if this is a browser request
  const acceptHeader = req.headers.accept || '';
  const isBrowserRequest = acceptHeader.includes('text/html');

  // For browser requests to the viewer, redirect to login
  if (isBrowserRequest && (req.path === '/' || req.path === '/viewer.html')) {
    res.redirect('/login');
    return;
  }

  // For API requests, return 401
  logger.warn('SECURITY', 'Unauthorized request', {
    path: req.path,
    ip: clientIp,
  });

  res.status(401).json({
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
  });
}

/**
 * Scope requirement middleware factory
 * Creates middleware that checks for required scope
 */
export function requireScope(scope: RemoteAuthScope) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const auth = req.auth;

    if (!auth) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    // Full access scope or specific scope
    if (auth.scopes.includes('*') || auth.scopes.includes(scope)) {
      return next();
    }

    logger.warn('SECURITY', 'Insufficient permissions', {
      path: req.path,
      requiredScope: scope,
      grantedScopes: auth.scopes,
    });

    res.status(403).json({
      code: 'FORBIDDEN',
      message: `Scope '${scope}' required`,
    });
  };
}

/**
 * Get the session cookie name (for use in routes)
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

/**
 * Check if remote auth is configured
 */
export function isRemoteAuthConfigured(): boolean {
  return !!getConfiguredToken();
}

export { getConfiguredToken };
