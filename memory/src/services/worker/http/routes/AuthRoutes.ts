/**
 * Auth Routes
 *
 * Handles authentication endpoints for the web viewer UI.
 * Provides login/logout functionality with cookie-based sessions.
 */

import express, { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import {
  createSession,
  invalidateSession,
  getSessionCookieName,
  getConfiguredToken,
  isRemoteAuthConfigured,
} from '../../../server/middleware/auth.js';

export class AuthRoutes extends BaseRouteHandler {
  setupRoutes(app: express.Application): void {
    // Login page (served for unauthenticated browser requests)
    app.get('/login', this.handleLoginPage.bind(this));

    // Login endpoint
    app.post('/api/auth/login', this.handleLogin.bind(this));

    // Logout endpoint
    app.post('/api/auth/logout', this.handleLogout.bind(this));

    // Check auth status
    app.get('/api/auth/status', this.handleAuthStatus.bind(this));
  }

  /**
   * Serve the login page HTML
   */
  private handleLoginPage = this.wrapHandler((req: Request, res: Response): void => {
    // If no remote auth is configured, redirect to viewer
    if (!isRemoteAuthConfigured()) {
      res.redirect('/');
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Claude Mem</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --bg-card: #16213e;
      --text: #eaeaea;
      --text-muted: #a0a0a0;
      --primary: #e94560;
      --primary-hover: #ff6b6b;
      --border: #2a2a4a;
      --error: #ff4757;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-container {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .logo {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .logo h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--primary);
    }

    .logo p {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      color: var(--text);
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: var(--primary);
    }

    button {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 0.5rem;
    }

    button:hover {
      background: var(--primary-hover);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error {
      color: var(--error);
      font-size: 0.875rem;
      margin-top: 0.5rem;
      display: none;
    }

    .error.visible {
      display: block;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">
      <h1>Claude Mem</h1>
      <p>Enter your access token to continue</p>
    </div>

    <form id="loginForm">
      <div class="form-group">
        <label for="token">Access Token</label>
        <input
          type="password"
          id="token"
          name="token"
          placeholder="Enter your token"
          autocomplete="current-password"
          required
        />
      </div>

      <div class="error" id="errorMsg"></div>

      <button type="submit" id="submitBtn">Login</button>
    </form>
  </div>

  <script>
    const form = document.getElementById('loginForm');
    const tokenInput = document.getElementById('token');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const token = tokenInput.value.trim();
      if (!token) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
      errorMsg.classList.remove('visible');

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          window.location.href = '/';
        } else {
          errorMsg.textContent = data.message || 'Invalid token';
          errorMsg.classList.add('visible');
        }
      } catch (error) {
        errorMsg.textContent = 'Connection failed. Please try again.';
        errorMsg.classList.add('visible');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    });
  </script>
</body>
</html>
    `.trim();

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  /**
   * Handle login request - validate token and create session
   */
  private handleLogin = this.wrapHandler((req: Request, res: Response): void => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        code: 'MISSING_TOKEN',
        message: 'Token is required',
      });
      return;
    }

    const configuredToken = getConfiguredToken();

    if (!configuredToken) {
      res.status(500).json({
        code: 'NOT_CONFIGURED',
        message: 'Remote authentication is not configured',
      });
      return;
    }

    if (token !== configuredToken) {
      logger.warn('SECURITY', 'Failed login attempt', {
        ip: req.ip || req.socket.remoteAddress,
      });
      res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      });
      return;
    }

    // Create session
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const sessionId = createSession(clientIp);

    // Set session cookie
    res.cookie(getSessionCookieName(), sessionId, {
      httpOnly: true,
      secure: req.protocol === 'https',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    logger.info('SECURITY', 'User logged in', { ip: clientIp });

    res.json({
      code: 'SUCCESS',
      message: 'Login successful',
    });
  });

  /**
   * Handle logout request - invalidate session
   */
  private handleLogout = this.wrapHandler((req: Request, res: Response): void => {
    const cookieName = getSessionCookieName();
    const sessionId = req.cookies?.[cookieName];

    if (sessionId) {
      invalidateSession(sessionId);
    }

    // Clear cookie
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: req.protocol === 'https',
      sameSite: 'lax',
      path: '/',
    });

    logger.info('SECURITY', 'User logged out', {
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      code: 'SUCCESS',
      message: 'Logout successful',
    });
  });

  /**
   * Check authentication status
   */
  private handleAuthStatus = this.wrapHandler((req: Request, res: Response): void => {
    const isConfigured = isRemoteAuthConfigured();

    res.json({
      authRequired: isConfigured,
      authenticated: !isConfigured || !!(req as any).auth,
    });
  });
}
