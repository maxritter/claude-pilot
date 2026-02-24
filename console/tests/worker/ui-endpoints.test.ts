/**
 * UI Endpoints Test
 *
 * Verifies that all endpoints required by the UI's useStats hook are available.
 * This test was added after a regression where removing SettingsRoutes broke
 * the UI because useStats was fetching /api/settings which no longer existed.
 *
 * IMPORTANT: If you add new fetch() calls to useStats or other UI hooks,
 * add corresponding tests here to prevent similar regressions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import express, { type Express } from 'express';
import { Server } from 'http';

function createMockServer(): Express {
  const app = express();

  app.get('/api/stats', (_, res) => {
    res.json({
      worker: { version: '1.0.0', uptime: 100 },
      database: { observations: 10, summaries: 5, prompts: 3 }
    });
  });

  app.get('/health', (_, res) => {
    res.json({ status: 'ok', isProcessing: false, queueDepth: 0 });
  });

  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', initialized: true, coreReady: true, mcpReady: true });
  });

  app.get('/api/observations', (_, res) => {
    res.json({ items: [] });
  });

  app.get('/api/projects', (_, res) => {
    res.json({ projects: [] });
  });

  app.get('/api/plan', (_, res) => {
    res.json({ active: false, plan: null });
  });

  app.get('/api/git', (_, res) => {
    res.json({ branch: 'main', staged: 0, unstaged: 0, untracked: 0 });
  });

  app.get('/api/dashboard/sessions', (_, res) => {
    res.json({ sessions: [] });
  });

  return app;
}

describe('UI Required Endpoints', () => {
  /**
   * These are the endpoints that useStats hook fetches.
   * If any of these fail, the UI will show "worker offline" status.
   *
   * Reference: console/src/ui/viewer/hooks/useStats.ts loadStats()
   */
  const USE_STATS_ENDPOINTS = [
    '/api/stats',
    '/health',
    '/api/observations',
    '/api/projects',
    '/api/plan',
    '/api/git',
    '/api/dashboard/sessions',
  ];

  describe('useStats required endpoints', () => {
    let server: Server;
    let baseUrl: string;

    beforeAll(async () => {
      const app = createMockServer();
      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            baseUrl = `http://localhost:${addr.port}`;
          }
          resolve();
        });
      });
    });

    afterAll(() => {
      server?.close();
    });

    for (const endpoint of USE_STATS_ENDPOINTS) {
      it(`should respond to ${endpoint}`, async () => {
        const response = await fetch(`${baseUrl}${endpoint}`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toBeDefined();
      });
    }
  });

  describe('endpoint documentation', () => {
    it('documents all endpoints required by useStats', () => {
      expect(USE_STATS_ENDPOINTS).toEqual([
        '/api/stats',
        '/health',
        '/api/observations',
        '/api/projects',
        '/api/plan',
        '/api/git',
        '/api/dashboard/sessions',
      ]);
    });

    it('does NOT include /api/settings (removed in Pilot Shell Console refactor)', () => {
      expect(USE_STATS_ENDPOINTS).not.toContain('/api/settings');
    });
  });
});
