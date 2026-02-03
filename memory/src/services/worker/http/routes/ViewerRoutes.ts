/**
 * Viewer Routes
 *
 * Handles health check, viewer UI, and SSE stream endpoints.
 * These are used by the web viewer UI at http://localhost:37777
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { logger } from '../../../../utils/logger.js';
import { getPackageRoot, getVersion } from '../../../../shared/paths.js';
import { SSEBroadcaster } from '../../SSEBroadcaster.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { SessionManager } from '../../SessionManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

export class ViewerRoutes extends BaseRouteHandler {
  constructor(
    private sseBroadcaster: SSEBroadcaster,
    private dbManager: DatabaseManager,
    private sessionManager: SessionManager
  ) {
    super();
  }

  setupRoutes(app: express.Application): void {
    // Serve static UI assets (JS, CSS, fonts, etc.) with cache-busting headers
    const packageRoot = getPackageRoot();
    const uiPath = path.join(packageRoot, 'ui');
    logger.info('VIEWER', 'Setting up static file serving', { packageRoot, uiPath, exists: existsSync(uiPath) });

    // Disable caching for JS/CSS files to prevent stale UI issues
    app.use(express.static(uiPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
          // No caching for JS/CSS - always fetch fresh
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.endsWith('.html')) {
          // No caching for HTML
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          // Images and other assets can be cached for 1 hour
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    }));

    app.get('/health', this.handleHealth.bind(this));
    app.get('/api/health', this.handleHealth.bind(this));
    app.get('/api/version', this.handleVersion.bind(this));
    app.post('/api/restart', this.handleRestart.bind(this));
    app.get('/', this.handleViewerUI.bind(this));
    app.get('/stream', this.handleSSEStream.bind(this));
  }

  /**
   * Health check endpoint with queue status
   */
  private handleHealth = this.wrapHandler((req: Request, res: Response): void => {
    const queueDepth = this.sessionManager.getTotalActiveWork();
    const isProcessing = this.sessionManager.isAnySessionProcessing();
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      queueDepth,
      isProcessing
    });
  });

  /**
   * Restart worker endpoint - exits cleanly so wrapper can restart
   */
  private handleRestart = this.wrapHandler((req: Request, res: Response): void => {
    logger.info('SYSTEM', 'Restart requested via API');
    res.json({ status: 'restarting', message: 'Worker will restart' });
    // Give time for response to be sent, then exit
    setTimeout(() => {
      logger.info('SYSTEM', 'Exiting for restart...');
      process.exit(0);
    }, 500);
  });

  /**
   * Version endpoint - returns current package version
   */
  private handleVersion = this.wrapHandler((req: Request, res: Response): void => {
    const version = getVersion();
    res.json({ version });
  });

  /**
   * Serve viewer UI with cache-busting and version injection
   */
  private handleViewerUI = this.wrapHandler((req: Request, res: Response): void => {
    const packageRoot = getPackageRoot();
    const version = getVersion();

    // Try cache structure first (ui/viewer.html), then marketplace structure (plugin/ui/viewer.html)
    const viewerPaths = [
      path.join(packageRoot, 'ui', 'viewer.html'),
      path.join(packageRoot, 'plugin', 'ui', 'viewer.html')
    ];

    const viewerPath = viewerPaths.find(p => existsSync(p));

    if (!viewerPath) {
      throw new Error('Viewer UI not found at any expected location');
    }

    let html = readFileSync(viewerPath, 'utf-8');

    // Add version query parameter to JS/CSS for cache-busting
    html = html.replace(/viewer-bundle\.js/g, `viewer-bundle.js?v=${version}`);
    html = html.replace(/viewer\.css/g, `viewer.css?v=${version}`);

    // Inject version meta tag for UI to read
    html = html.replace('</head>', `  <meta name="claude-mem-version" content="${version}">\n</head>`);

    // Set cache-control headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(html);
  });

  /**
   * SSE stream endpoint
   */
  private handleSSEStream = this.wrapHandler((req: Request, res: Response): void => {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add client to broadcaster
    this.sseBroadcaster.addClient(res);

    // Send initial_load event with projects list
    const allProjects = this.dbManager.getSessionStore().getAllProjects();
    this.sseBroadcaster.broadcast({
      type: 'initial_load',
      projects: allProjects,
      timestamp: Date.now()
    });

    // Send initial processing status (based on queue depth + active generators)
    const isProcessing = this.sessionManager.isAnySessionProcessing();
    const queueDepth = this.sessionManager.getTotalActiveWork(); // Includes queued + actively processing
    this.sseBroadcaster.broadcast({
      type: 'processing_status',
      isProcessing,
      queueDepth
    });
  });
}
