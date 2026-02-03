/**
 * Data Routes
 *
 * Handles data retrieval operations: observations, summaries, prompts, stats, processing status.
 * All endpoints use direct database access via service layer.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { readFileSync, statSync, existsSync } from 'fs';
import { logger } from '../../../../utils/logger.js';
import { homedir } from 'os';
import { getPackageRoot } from '../../../../shared/paths.js';
import { getWorkerPort } from '../../../../shared/worker-utils.js';
import { PaginationHelper } from '../../PaginationHelper.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { SessionManager } from '../../SessionManager.js';
import { SSEBroadcaster } from '../../SSEBroadcaster.js';
import type { WorkerService } from '../../../worker-service.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

export class DataRoutes extends BaseRouteHandler {
  constructor(
    private paginationHelper: PaginationHelper,
    private dbManager: DatabaseManager,
    private sessionManager: SessionManager,
    private sseBroadcaster: SSEBroadcaster,
    private workerService: WorkerService,
    private startTime: number
  ) {
    super();
  }

  setupRoutes(app: express.Application): void {
    // Pagination endpoints
    app.get('/api/observations', this.handleGetObservations.bind(this));
    app.get('/api/summaries', this.handleGetSummaries.bind(this));
    app.get('/api/prompts', this.handleGetPrompts.bind(this));

    // Fetch by ID endpoints
    app.get('/api/observation/:id', this.handleGetObservationById.bind(this));
    app.post('/api/observations/batch', this.handleGetObservationsByIds.bind(this));
    app.get('/api/session/:id', this.handleGetSessionById.bind(this));
    app.get('/api/sessions', this.handleGetSessions.bind(this));
    app.get('/api/sessions/:id/timeline', this.handleGetSessionTimeline.bind(this));
    app.post('/api/sdk-sessions/batch', this.handleGetSdkSessionsByIds.bind(this));
    app.get('/api/prompt/:id', this.handleGetPromptById.bind(this));

    // Metadata endpoints
    app.get('/api/stats', this.handleGetStats.bind(this));
    app.get('/api/projects', this.handleGetProjects.bind(this));

    // Processing status endpoints
    app.get('/api/processing-status', this.handleGetProcessingStatus.bind(this));
    app.post('/api/processing', this.handleSetProcessing.bind(this));

    // Pending queue management endpoints
    app.get('/api/pending-queue', this.handleGetPendingQueue.bind(this));
    app.post('/api/pending-queue/process', this.handleProcessPendingQueue.bind(this));
    app.post('/api/pending-queue/:id/retry', this.handleRetryMessage.bind(this));
    app.delete('/api/pending-queue/failed', this.handleClearFailedQueue.bind(this));
    app.delete('/api/pending-queue/all', this.handleClearAllQueue.bind(this));

    // Import endpoint
    app.post('/api/import', this.handleImport.bind(this));

    // Export endpoint
    app.get('/api/export', this.handleExport.bind(this));

    // Delete endpoints
    app.delete('/api/observation/:id', this.handleDeleteObservation.bind(this));
    app.post('/api/observations/delete', this.handleBulkDeleteObservations.bind(this));

    // Analytics endpoints
    app.get('/api/analytics/timeline', this.handleGetAnalyticsTimeline.bind(this));
    app.get('/api/analytics/types', this.handleGetAnalyticsTypes.bind(this));
    app.get('/api/analytics/projects', this.handleGetAnalyticsProjects.bind(this));
    app.get('/api/analytics/tokens', this.handleGetAnalyticsTokens.bind(this));
  }

  /**
   * Get paginated observations
   */
  private handleGetObservations = this.wrapHandler((req: Request, res: Response): void => {
    const { offset, limit, project } = this.parsePaginationParams(req);
    const result = this.paginationHelper.getObservations(offset, limit, project);
    res.json(result);
  });

  /**
   * Get paginated summaries
   */
  private handleGetSummaries = this.wrapHandler((req: Request, res: Response): void => {
    const { offset, limit, project } = this.parsePaginationParams(req);
    const result = this.paginationHelper.getSummaries(offset, limit, project);
    res.json(result);
  });

  /**
   * Get paginated user prompts
   */
  private handleGetPrompts = this.wrapHandler((req: Request, res: Response): void => {
    const { offset, limit, project } = this.parsePaginationParams(req);
    const result = this.paginationHelper.getPrompts(offset, limit, project);
    res.json(result);
  });

  /**
   * Get observation by ID
   * GET /api/observation/:id
   */
  private handleGetObservationById = this.wrapHandler((req: Request, res: Response): void => {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const store = this.dbManager.getSessionStore();
    const observation = store.getObservationById(id);

    if (!observation) {
      this.notFound(res, `Observation #${id} not found`);
      return;
    }

    res.json(observation);
  });

  /**
   * Get observations by array of IDs
   * POST /api/observations/batch
   * Body: { ids: number[], orderBy?: 'date_desc' | 'date_asc', limit?: number, project?: string }
   */
  private handleGetObservationsByIds = this.wrapHandler((req: Request, res: Response): void => {
    const { ids, orderBy, limit, project } = req.body;

    if (!ids || !Array.isArray(ids)) {
      this.badRequest(res, 'ids must be an array of numbers');
      return;
    }

    if (ids.length === 0) {
      res.json([]);
      return;
    }

    // Validate all IDs are numbers
    if (!ids.every(id => typeof id === 'number' && Number.isInteger(id))) {
      this.badRequest(res, 'All ids must be integers');
      return;
    }

    const store = this.dbManager.getSessionStore();
    const observations = store.getObservationsByIds(ids, { orderBy, limit, project });

    res.json(observations);
  });

  /**
   * Get session by ID
   * GET /api/session/:id
   */
  private handleGetSessionById = this.wrapHandler((req: Request, res: Response): void => {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const store = this.dbManager.getSessionStore();
    const sessions = store.getSessionSummariesByIds([id]);

    if (sessions.length === 0) {
      this.notFound(res, `Session #${id} not found`);
      return;
    }

    res.json(sessions[0]);
  });

  /**
   * Get paginated list of sessions
   * GET /api/sessions?offset=0&limit=20&project=<name>
   */
  private handleGetSessions = this.wrapHandler((req: Request, res: Response): void => {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const project = req.query.project as string | undefined;

    const db = this.dbManager.getSessionStore().db;

    // Build query with observation counts
    let whereClause = '';
    const params: any[] = [];

    if (project) {
      whereClause = 'WHERE o.project = ?';
      params.push(project);
    }

    // Get sessions with counts
    const query = `
      SELECT
        s.id,
        s.content_session_id,
        s.memory_session_id,
        s.project,
        s.user_prompt,
        s.started_at,
        s.started_at_epoch,
        s.completed_at,
        s.completed_at_epoch,
        s.status,
        COUNT(DISTINCT o.id) as observation_count,
        COUNT(DISTINCT p.id) as prompt_count
      FROM sdk_sessions s
      LEFT JOIN observations o ON o.memory_session_id = s.memory_session_id ${project ? 'AND o.project = ?' : ''}
      LEFT JOIN user_prompts p ON p.content_session_id = s.content_session_id
      ${project ? 'WHERE EXISTS (SELECT 1 FROM observations WHERE memory_session_id = s.memory_session_id AND project = ?)' : ''}
      GROUP BY s.id
      ORDER BY s.started_at_epoch DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = project ? [project, project, limit, offset] : [limit, offset];
    const sessions = db.prepare(query).all(...queryParams);

    // Get total count
    const countQuery = project
      ? `SELECT COUNT(DISTINCT s.id) as total FROM sdk_sessions s
         INNER JOIN observations o ON o.memory_session_id = s.memory_session_id WHERE o.project = ?`
      : 'SELECT COUNT(*) as total FROM sdk_sessions';
    const countParams = project ? [project] : [];
    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    res.json({
      items: sessions,
      total,
      offset,
      limit,
      hasMore: offset + sessions.length < total
    });
  });

  /**
   * Get session timeline with all observations, prompts, and summary
   * GET /api/sessions/:id/timeline
   */
  private handleGetSessionTimeline = this.wrapHandler((req: Request, res: Response): void => {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const db = this.dbManager.getSessionStore().db;

    // Get session info
    const session = db.prepare('SELECT * FROM sdk_sessions WHERE id = ?').get(id) as { memory_session_id: string; content_session_id: string } | undefined;
    if (!session) {
      this.notFound(res, `Session #${id} not found`);
      return;
    }

    // Get observations for this session (by memory_session_id)
    const observations = db.prepare(`
      SELECT id, type, title, narrative, text, created_at, created_at_epoch, files_read, files_modified, concepts
      FROM observations
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch ASC
    `).all(session.memory_session_id);

    // Get prompts for this session (by content_session_id)
    const prompts = db.prepare(`
      SELECT id, prompt_text, prompt_number, created_at, created_at_epoch
      FROM user_prompts
      WHERE content_session_id = ?
      ORDER BY created_at_epoch ASC
    `).all(session.content_session_id);

    // Get summary for this session (by memory_session_id)
    const summary = db.prepare(`
      SELECT request, investigated, learned, completed, next_steps, created_at
      FROM session_summaries
      WHERE memory_session_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(session.memory_session_id);

    // Combine into timeline
    const timeline: any[] = [];

    // Add prompts to timeline
    for (const prompt of prompts as any[]) {
      timeline.push({
        type: 'prompt',
        id: prompt.id,
        timestamp: prompt.created_at_epoch,
        data: prompt
      });
    }

    // Add observations to timeline
    for (const obs of observations as any[]) {
      timeline.push({
        type: 'observation',
        id: obs.id,
        timestamp: obs.created_at_epoch,
        data: obs
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      session,
      timeline,
      summary,
      stats: {
        observations: observations.length,
        prompts: prompts.length
      }
    });
  });

  /**
   * Get SDK sessions by SDK session IDs
   * POST /api/sdk-sessions/batch
   * Body: { memorySessionIds: string[] }
   */
  private handleGetSdkSessionsByIds = this.wrapHandler((req: Request, res: Response): void => {
    const { memorySessionIds } = req.body;

    if (!Array.isArray(memorySessionIds)) {
      this.badRequest(res, 'memorySessionIds must be an array');
      return;
    }

    const store = this.dbManager.getSessionStore();
    const sessions = store.getSdkSessionsBySessionIds(memorySessionIds);
    res.json(sessions);
  });

  /**
   * Get user prompt by ID
   * GET /api/prompt/:id
   */
  private handleGetPromptById = this.wrapHandler((req: Request, res: Response): void => {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const store = this.dbManager.getSessionStore();
    const prompts = store.getUserPromptsByIds([id]);

    if (prompts.length === 0) {
      this.notFound(res, `Prompt #${id} not found`);
      return;
    }

    res.json(prompts[0]);
  });

  /**
   * Get database statistics (with worker metadata)
   */
  private handleGetStats = this.wrapHandler((req: Request, res: Response): void => {
    const db = this.dbManager.getSessionStore().db;

    // Read version from package.json
    const packageRoot = getPackageRoot();
    const packageJsonPath = path.join(packageRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;

    // Get database stats
    const totalObservations = db.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number };
    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sdk_sessions').get() as { count: number };
    const totalSummaries = db.prepare('SELECT COUNT(*) as count FROM session_summaries').get() as { count: number };

    // Get database file size and path
    const dbPath = path.join(homedir(), '.claude-mem', 'claude-mem.db');
    let dbSize = 0;
    if (existsSync(dbPath)) {
      dbSize = statSync(dbPath).size;
    }

    // Worker metadata
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const sseClients = this.sseBroadcaster.getClientCount();

    // Session stats for monitoring
    const sessionStats = this.sessionManager.getSessionStats();

    res.json({
      worker: {
        version,
        uptime,
        activeSessions: sessionStats.activeSessions,
        sessionsWithGenerators: sessionStats.sessionsWithGenerators,
        queueDepth: sessionStats.totalQueueDepth,
        oldestSessionAgeMs: sessionStats.oldestSessionAge,
        sseClients,
        port: getWorkerPort()
      },
      database: {
        path: dbPath,
        size: dbSize,
        observations: totalObservations.count,
        sessions: totalSessions.count,
        summaries: totalSummaries.count
      }
    });
  });

  /**
   * Get list of distinct projects from observations
   * GET /api/projects
   */
  private handleGetProjects = this.wrapHandler((req: Request, res: Response): void => {
    const db = this.dbManager.getSessionStore().db;

    const rows = db.prepare(`
      SELECT DISTINCT project
      FROM observations
      WHERE project IS NOT NULL
      GROUP BY project
      ORDER BY MAX(created_at_epoch) DESC
    `).all() as Array<{ project: string }>;

    const projects = rows.map(row => row.project);

    res.json({ projects });
  });

  /**
   * Get current processing status
   * GET /api/processing-status
   */
  private handleGetProcessingStatus = this.wrapHandler((req: Request, res: Response): void => {
    const isProcessing = this.sessionManager.isAnySessionProcessing();
    const queueDepth = this.sessionManager.getTotalActiveWork(); // Includes queued + actively processing
    res.json({ isProcessing, queueDepth });
  });

  /**
   * Set processing status (called by hooks)
   * NOTE: This now broadcasts computed status based on active processing (ignores input)
   */
  private handleSetProcessing = this.wrapHandler((req: Request, res: Response): void => {
    // Broadcast current computed status (ignores manual input)
    this.workerService.broadcastProcessingStatus();

    const isProcessing = this.sessionManager.isAnySessionProcessing();
    const queueDepth = this.sessionManager.getTotalQueueDepth();
    const activeSessions = this.sessionManager.getActiveSessionCount();

    res.json({ status: 'ok', isProcessing, queueDepth, activeSessions });
  });

  /**
   * Parse pagination parameters from request query
   */
  private parsePaginationParams(req: Request): { offset: number; limit: number; project?: string } {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100); // Max 100
    const project = req.query.project as string | undefined;

    return { offset, limit, project };
  }

  /**
   * Import memories from export file
   * POST /api/import
   * Body: { sessions: [], summaries: [], observations: [], prompts: [] }
   */
  private handleImport = this.wrapHandler((req: Request, res: Response): void => {
    const { sessions, summaries, observations, prompts } = req.body;

    const stats = {
      sessionsImported: 0,
      sessionsSkipped: 0,
      summariesImported: 0,
      summariesSkipped: 0,
      observationsImported: 0,
      observationsSkipped: 0,
      promptsImported: 0,
      promptsSkipped: 0
    };

    const store = this.dbManager.getSessionStore();

    // Import sessions first (dependency for everything else)
    if (Array.isArray(sessions)) {
      for (const session of sessions) {
        const result = store.importSdkSession(session);
        if (result.imported) {
          stats.sessionsImported++;
        } else {
          stats.sessionsSkipped++;
        }
      }
    }

    // Import summaries (depends on sessions)
    if (Array.isArray(summaries)) {
      for (const summary of summaries) {
        const result = store.importSessionSummary(summary);
        if (result.imported) {
          stats.summariesImported++;
        } else {
          stats.summariesSkipped++;
        }
      }
    }

    // Import observations (depends on sessions)
    if (Array.isArray(observations)) {
      for (const obs of observations) {
        const result = store.importObservation(obs);
        if (result.imported) {
          stats.observationsImported++;
        } else {
          stats.observationsSkipped++;
        }
      }
    }

    // Import prompts (depends on sessions)
    if (Array.isArray(prompts)) {
      for (const prompt of prompts) {
        const result = store.importUserPrompt(prompt);
        if (result.imported) {
          stats.promptsImported++;
        } else {
          stats.promptsSkipped++;
        }
      }
    }

    res.json({
      success: true,
      stats
    });
  });

  /**
   * Export all data for backup
   * GET /api/export?project=<name>&format=json|csv|markdown&ids=1,2,3
   * Exports sessions, summaries, observations, and prompts
   * Optional project filter and format selection
   */
  private handleExport = this.wrapHandler((req: Request, res: Response): void => {
    const project = req.query.project as string | undefined;
    const format = (req.query.format as string || 'json').toLowerCase();
    const idsParam = req.query.ids as string | undefined;
    const store = this.dbManager.getSessionStore();
    const db = store.db;

    // Validate format
    if (!['json', 'csv', 'markdown', 'md'].includes(format)) {
      this.badRequest(res, 'Invalid format. Supported: json, csv, markdown');
      return;
    }

    // Parse specific IDs if provided
    let specificIds: number[] | undefined;
    if (idsParam) {
      specificIds = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    }

    // Build WHERE clause for project filter
    const projectFilter = project ? 'WHERE project = ?' : '';
    const projectParam = project ? [project] : [];

    // Export observations (main export target)
    let observations: any[];
    if (specificIds && specificIds.length > 0) {
      const placeholders = specificIds.map(() => '?').join(',');
      observations = db.prepare(`SELECT * FROM observations WHERE id IN (${placeholders})`).all(...specificIds);
    } else {
      observations = db.prepare(`SELECT * FROM observations ${projectFilter}`).all(...projectParam);
    }

    // For JSON format, include full export with all related data
    if (format === 'json') {
      // Export sessions - get all or filter by project via observations
      let sessions;
      if (project) {
        const sessionIds = db.prepare(`
          SELECT DISTINCT s.id
          FROM sdk_sessions s
          INNER JOIN observations o ON o.memory_session_id = s.memory_session_id
          WHERE o.project = ?
        `).all(project) as Array<{ id: number }>;

        if (sessionIds.length > 0) {
          const ids = sessionIds.map(s => s.id);
          sessions = db.prepare(`
            SELECT * FROM sdk_sessions
            WHERE id IN (${ids.map(() => '?').join(',')})
          `).all(...ids);
        } else {
          sessions = [];
        }
      } else {
        sessions = db.prepare('SELECT * FROM sdk_sessions').all();
      }

      // Export summaries
      let summaries;
      if (project) {
        summaries = db.prepare(`
          SELECT ss.* FROM session_summaries ss
          INNER JOIN sdk_sessions s ON ss.memory_session_id = s.memory_session_id
          INNER JOIN observations o ON o.memory_session_id = s.memory_session_id
          WHERE o.project = ?
          GROUP BY ss.id
        `).all(project);
      } else {
        summaries = db.prepare('SELECT * FROM session_summaries').all();
      }

      // Export prompts
      let prompts;
      if (project) {
        prompts = db.prepare(`
          SELECT p.* FROM user_prompts p
          INNER JOIN sdk_sessions s ON p.content_session_id = s.content_session_id
          INNER JOIN observations o ON o.memory_session_id = s.memory_session_id
          WHERE o.project = ?
          GROUP BY p.id
        `).all(project);
      } else {
        prompts = db.prepare('SELECT * FROM user_prompts').all();
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        project: project || 'all',
        stats: {
          sessions: sessions.length,
          summaries: summaries.length,
          observations: observations.length,
          prompts: prompts.length
        },
        sessions,
        summaries,
        observations,
        prompts
      };

      const filename = project
        ? `claude-mem-export-${project}-${new Date().toISOString().split('T')[0]}.json`
        : `claude-mem-export-${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(exportData);
      return;
    }

    // CSV format
    if (format === 'csv') {
      const headers = ['id', 'type', 'title', 'project', 'created_at', 'text', 'files_read', 'files_modified'];
      const csvRows = [headers.join(',')];

      for (const obs of observations) {
        const row = [
          obs.id,
          `"${(obs.type || '').replace(/"/g, '""')}"`,
          `"${(obs.title || '').replace(/"/g, '""')}"`,
          `"${(obs.project || '').replace(/"/g, '""')}"`,
          obs.created_at || '',
          `"${(obs.text || '').replace(/"/g, '""').substring(0, 500)}"`,
          `"${(obs.files_read || '').replace(/"/g, '""')}"`,
          `"${(obs.files_modified || '').replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(','));
      }

      const filename = project
        ? `claude-mem-export-${project}-${new Date().toISOString().split('T')[0]}.csv`
        : `claude-mem-export-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csvRows.join('\n'));
      return;
    }

    // Markdown format
    if (format === 'markdown' || format === 'md') {
      const lines: string[] = [
        `# Claude-Mem Export`,
        ``,
        `**Exported:** ${new Date().toISOString()}`,
        `**Project:** ${project || 'All'}`,
        `**Total Memories:** ${observations.length}`,
        ``,
        `---`,
        ``
      ];

      for (const obs of observations) {
        const date = obs.created_at ? new Date(obs.created_at).toLocaleString() : 'Unknown';
        lines.push(`## #${obs.id}: ${obs.title || 'Untitled'}`);
        lines.push(``);
        lines.push(`- **Type:** ${obs.type || 'unknown'}`);
        lines.push(`- **Project:** ${obs.project || 'none'}`);
        lines.push(`- **Date:** ${date}`);

        if (obs.files_read) {
          try {
            const files = JSON.parse(obs.files_read);
            if (files.length > 0) {
              lines.push(`- **Files Read:** ${files.join(', ')}`);
            }
          } catch {}
        }

        if (obs.files_modified) {
          try {
            const files = JSON.parse(obs.files_modified);
            if (files.length > 0) {
              lines.push(`- **Files Modified:** ${files.join(', ')}`);
            }
          } catch {}
        }

        lines.push(``);
        lines.push(obs.text || '*No content*');
        lines.push(``);
        lines.push(`---`);
        lines.push(``);
      }

      const filename = project
        ? `claude-mem-export-${project}-${new Date().toISOString().split('T')[0]}.md`
        : `claude-mem-export-${new Date().toISOString().split('T')[0]}.md`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/markdown');
      res.send(lines.join('\n'));
      return;
    }
  });

  /**
   * Get pending queue contents
   * GET /api/pending-queue
   * Returns all pending, processing, and failed messages with optional recently processed
   */
  private handleGetPendingQueue = this.wrapHandler((req: Request, res: Response): void => {
    const { PendingMessageStore } = require('../../../sqlite/PendingMessageStore.js');
    const pendingStore = new PendingMessageStore(this.dbManager.getSessionStore().db, 3);

    // Get queue contents (pending, processing, failed)
    const queueMessages = pendingStore.getQueueMessages();

    // Get recently processed (last 30 min, up to 20)
    const recentlyProcessed = pendingStore.getRecentlyProcessed(20, 30);

    // Get stuck message count (processing > 5 min)
    const stuckCount = pendingStore.getStuckCount(5 * 60 * 1000);

    // Get sessions with pending work
    const sessionsWithPending = pendingStore.getSessionsWithPendingMessages();

    res.json({
      queue: {
        messages: queueMessages,
        totalPending: queueMessages.filter((m: { status: string }) => m.status === 'pending').length,
        totalProcessing: queueMessages.filter((m: { status: string }) => m.status === 'processing').length,
        totalFailed: queueMessages.filter((m: { status: string }) => m.status === 'failed').length,
        stuckCount
      },
      recentlyProcessed,
      sessionsWithPendingWork: sessionsWithPending
    });
  });

  /**
   * Process pending queue
   * POST /api/pending-queue/process
   * Body: { sessionLimit?: number } - defaults to 10
   * Starts SDK agents for sessions with pending messages
   */
  private handleProcessPendingQueue = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const sessionLimit = Math.min(
      Math.max(parseInt(req.body.sessionLimit, 10) || 10, 1),
      100 // Max 100 sessions at once
    );

    const result = await this.workerService.processPendingQueues(sessionLimit);

    res.json({
      success: true,
      ...result
    });
  });

  /**
   * Clear all failed messages from the queue
   * DELETE /api/pending-queue/failed
   * Returns the number of messages cleared
   */
  private handleClearFailedQueue = this.wrapHandler((req: Request, res: Response): void => {
    const { PendingMessageStore } = require('../../../sqlite/PendingMessageStore.js');
    const pendingStore = new PendingMessageStore(this.dbManager.getSessionStore().db, 3);

    const clearedCount = pendingStore.clearFailed();

    logger.info('QUEUE', 'Cleared failed queue messages', { clearedCount });

    res.json({
      success: true,
      clearedCount
    });
  });

  /**
   * Clear all messages from the queue (pending, processing, and failed)
   * DELETE /api/pending-queue/all
   * Returns the number of messages cleared
   */
  private handleClearAllQueue = this.wrapHandler((req: Request, res: Response): void => {
    const { PendingMessageStore } = require('../../../sqlite/PendingMessageStore.js');
    const pendingStore = new PendingMessageStore(this.dbManager.getSessionStore().db, 3);

    const clearedCount = pendingStore.clearAll();

    logger.warn('QUEUE', 'Cleared ALL queue messages (pending, processing, failed)', { clearedCount });

    res.json({
      success: true,
      clearedCount
    });
  });

  /**
   * Retry a failed message
   * POST /api/pending-queue/:id/retry
   * Resets the message to pending status for reprocessing
   */
  private handleRetryMessage = this.wrapHandler((req: Request, res: Response): void => {
    const messageId = parseInt(req.params.id, 10);
    if (isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid message ID' });
      return;
    }

    const { PendingMessageStore } = require('../../../sqlite/PendingMessageStore.js');
    const pendingStore = new PendingMessageStore(this.dbManager.getSessionStore().db, 3);

    const success = pendingStore.retryMessage(messageId);

    if (success) {
      logger.info('QUEUE', 'Retried failed message', { messageId });
      res.json({ success: true, messageId });
    } else {
      res.status(404).json({ error: 'Message not found or not in failed status' });
    }
  });

  /**
   * Delete a single observation
   * DELETE /api/observation/:id
   */
  private handleDeleteObservation = this.wrapHandler((req: Request, res: Response): void => {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const store = this.dbManager.getSessionStore();
    const deleted = store.deleteObservation(id);

    if (deleted) {
      logger.info('DATA', 'Deleted observation', { id });
      res.json({ success: true, id });
    } else {
      this.notFound(res, `Observation #${id} not found`);
    }
  });

  /**
   * Bulk delete observations
   * POST /api/observations/delete
   * Body: { ids: number[] }
   */
  private handleBulkDeleteObservations = this.wrapHandler((req: Request, res: Response): void => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      this.badRequest(res, 'ids must be an array of numbers');
      return;
    }

    if (ids.length === 0) {
      res.json({ success: true, deletedCount: 0 });
      return;
    }

    // Validate all IDs are numbers
    if (!ids.every(id => typeof id === 'number' && Number.isInteger(id))) {
      this.badRequest(res, 'All ids must be integers');
      return;
    }

    const store = this.dbManager.getSessionStore();
    const deletedCount = store.deleteObservations(ids);

    logger.info('DATA', 'Bulk deleted observations', { count: deletedCount, requested: ids.length });

    res.json({ success: true, deletedCount });
  });

  /**
   * Get analytics timeline - memories created over time
   * GET /api/analytics/timeline?range=7d|30d|90d|all&project=<name>
   * Returns daily counts for line chart
   */
  private handleGetAnalyticsTimeline = this.wrapHandler((req: Request, res: Response): void => {
    const range = (req.query.range as string) || '30d';
    const project = req.query.project as string | undefined;
    const db = this.dbManager.getSessionStore().db;

    // Calculate date range
    let daysBack = 30;
    if (range === '7d') daysBack = 7;
    else if (range === '90d') daysBack = 90;
    else if (range === 'all') daysBack = 365 * 10; // 10 years = "all"

    const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    // Build query with optional project filter
    const projectFilter = project ? 'AND project = ?' : '';
    const params = project ? [startDate, project] : [startDate];

    const rows = db.prepare(`
      SELECT
        date(created_at_epoch / 1000, 'unixepoch', 'localtime') as date,
        COUNT(*) as count
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
      GROUP BY date(created_at_epoch / 1000, 'unixepoch', 'localtime')
      ORDER BY date ASC
    `).all(...params) as Array<{ date: string; count: number }>;

    res.json({
      range,
      project: project || 'all',
      data: rows
    });
  });

  /**
   * Get analytics by type - distribution of observation types
   * GET /api/analytics/types?range=7d|30d|90d|all&project=<name>
   * Returns counts per type for pie chart
   */
  private handleGetAnalyticsTypes = this.wrapHandler((req: Request, res: Response): void => {
    const range = (req.query.range as string) || '30d';
    const project = req.query.project as string | undefined;
    const db = this.dbManager.getSessionStore().db;

    // Calculate date range
    let daysBack = 30;
    if (range === '7d') daysBack = 7;
    else if (range === '90d') daysBack = 90;
    else if (range === 'all') daysBack = 365 * 10;

    const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    // Build query with optional project filter
    const projectFilter = project ? 'AND project = ?' : '';
    const params = project ? [startDate, project] : [startDate];

    const rows = db.prepare(`
      SELECT
        type,
        COUNT(*) as count
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
      GROUP BY type
      ORDER BY count DESC
    `).all(...params) as Array<{ type: string; count: number }>;

    // Add colors for each type
    const typeColors: Record<string, string> = {
      bugfix: '#ef4444',    // red
      feature: '#8b5cf6',   // purple
      discovery: '#3b82f6', // blue
      refactor: '#f59e0b',  // amber
      decision: '#10b981',  // emerald
      change: '#6b7280'     // gray
    };

    const data = rows.map(row => ({
      ...row,
      color: typeColors[row.type] || '#6b7280'
    }));

    res.json({
      range,
      project: project || 'all',
      data
    });
  });

  /**
   * Get analytics by project - most active projects
   * GET /api/analytics/projects?range=7d|30d|90d|all&limit=10
   * Returns top projects by observation count for bar chart
   */
  private handleGetAnalyticsProjects = this.wrapHandler((req: Request, res: Response): void => {
    const range = (req.query.range as string) || '30d';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
    const db = this.dbManager.getSessionStore().db;

    // Calculate date range
    let daysBack = 30;
    if (range === '7d') daysBack = 7;
    else if (range === '90d') daysBack = 90;
    else if (range === 'all') daysBack = 365 * 10;

    const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    const rows = db.prepare(`
      SELECT
        COALESCE(project, 'Unknown') as project,
        COUNT(*) as count,
        SUM(COALESCE(discovery_tokens, 0)) as tokens
      FROM observations
      WHERE created_at_epoch >= ?
        AND project IS NOT NULL
        AND project != ''
      GROUP BY project
      ORDER BY count DESC
      LIMIT ?
    `).all(startDate, limit) as Array<{ project: string; count: number; tokens: number }>;

    res.json({
      range,
      limit,
      data: rows
    });
  });

  /**
   * Get token usage analytics
   * GET /api/analytics/tokens?range=7d|30d|90d|all&project=<name>
   * Returns token usage statistics
   */
  private handleGetAnalyticsTokens = this.wrapHandler((req: Request, res: Response): void => {
    const range = (req.query.range as string) || '30d';
    const project = req.query.project as string | undefined;
    const db = this.dbManager.getSessionStore().db;

    // Calculate date range
    let daysBack = 30;
    if (range === '7d') daysBack = 7;
    else if (range === '90d') daysBack = 90;
    else if (range === 'all') daysBack = 365 * 10;

    const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    // Build query with optional project filter
    const projectFilter = project ? 'AND project = ?' : '';
    const params = project ? [startDate, project] : [startDate];

    // Get total tokens and daily breakdown
    const totals = db.prepare(`
      SELECT
        SUM(COALESCE(discovery_tokens, 0)) as totalTokens,
        AVG(COALESCE(discovery_tokens, 0)) as avgTokens,
        COUNT(*) as totalObservations
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
    `).get(...params) as { totalTokens: number; avgTokens: number; totalObservations: number };

    // Daily token usage
    const daily = db.prepare(`
      SELECT
        date(created_at_epoch / 1000, 'unixepoch', 'localtime') as date,
        SUM(COALESCE(discovery_tokens, 0)) as tokens,
        COUNT(*) as observations
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
      GROUP BY date(created_at_epoch / 1000, 'unixepoch', 'localtime')
      ORDER BY date ASC
    `).all(...params) as Array<{ date: string; tokens: number; observations: number }>;

    // Tokens by type
    const byType = db.prepare(`
      SELECT
        type,
        SUM(COALESCE(discovery_tokens, 0)) as tokens,
        COUNT(*) as count
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
      GROUP BY type
      ORDER BY tokens DESC
    `).all(...params) as Array<{ type: string; tokens: number; count: number }>;

    res.json({
      range,
      project: project || 'all',
      totals: {
        totalTokens: totals.totalTokens || 0,
        avgTokensPerObservation: Math.round(totals.avgTokens || 0),
        totalObservations: totals.totalObservations || 0
      },
      daily,
      byType
    });
  });
}
