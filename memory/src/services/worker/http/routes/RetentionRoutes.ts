/**
 * Retention Routes
 *
 * API endpoints for memory retention policy management and cleanup.
 */

import express, { Request, Response } from 'express';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { RetentionService, RetentionPolicy } from '../../RetentionService.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { logger } from '../../../../utils/logger.js';

export class RetentionRoutes extends BaseRouteHandler {
  private retentionService: RetentionService;

  constructor(dbManager: DatabaseManager) {
    super();
    this.retentionService = new RetentionService(dbManager);
  }

  setupRoutes(app: express.Application): void {
    // Get current retention policy
    app.get('/api/retention/policy', this.handleGetPolicy.bind(this));

    // Preview cleanup (dry run)
    app.get('/api/retention/preview', this.handlePreview.bind(this));

    // Run cleanup
    app.post('/api/retention/run', this.handleRun.bind(this));

    // Get archive stats
    app.get('/api/retention/archive', this.handleGetArchive.bind(this));

    // List archived observations
    app.get('/api/retention/archive/list', this.handleListArchived.bind(this));

    // Restore from archive
    app.post('/api/retention/restore', this.handleRestore.bind(this));
  }

  /**
   * Get current retention policy from settings
   * GET /api/retention/policy
   */
  private handleGetPolicy = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const policy = this.retentionService.getPolicy();
    res.json({ policy });
  });

  /**
   * Preview what would be deleted
   * GET /api/retention/preview
   * Query params: maxAgeDays, maxCount, excludeTypes (optional overrides)
   */
  private handlePreview = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    // Allow custom policy via query params
    const customPolicy = this.parseQueryPolicy(req.query);
    const preview = await this.retentionService.preview(customPolicy);
    res.json({ preview, policy: customPolicy || this.retentionService.getPolicy() });
  });

  /**
   * Run retention cleanup
   * POST /api/retention/run
   * Body: { dryRun?: boolean, policy?: RetentionPolicy }
   */
  private handleRun = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { dryRun = false, policy: customPolicy } = req.body;

    // Parse custom policy if provided
    let policy: RetentionPolicy | undefined;
    if (customPolicy) {
      policy = {
        enabled: customPolicy.enabled ?? true,
        maxAgeDays: parseInt(customPolicy.maxAgeDays, 10) || 0,
        maxCount: parseInt(customPolicy.maxCount, 10) || 0,
        excludeTypes: Array.isArray(customPolicy.excludeTypes) ? customPolicy.excludeTypes : [],
        softDelete: customPolicy.softDelete ?? true,
      };
    }

    logger.info('RETENTION', `Running cleanup (dryRun: ${dryRun})`, {
      policy: policy || this.retentionService.getPolicy(),
    });

    const result = await this.retentionService.run(policy, dryRun);

    res.json({
      success: result.errors.length === 0,
      result,
      policy: policy || this.retentionService.getPolicy(),
    });
  });

  /**
   * Get archive stats
   * GET /api/retention/archive
   */
  private handleGetArchive = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const count = this.retentionService.getArchiveCount();
    res.json({ archived: count });
  });

  /**
   * List archived observations
   * GET /api/retention/archive/list?limit=100
   */
  private handleListArchived = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const observations = this.retentionService.listArchived(limit);
    res.json({
      observations,
      count: observations.length,
      total: this.retentionService.getArchiveCount(),
    });
  });

  /**
   * Restore observations from archive
   * POST /api/retention/restore
   * Body: { ids?: number[] } - if empty, restores all
   */
  private handleRestore = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;

    const idsArray = Array.isArray(ids) ? ids.map((id: unknown) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id)) : undefined;

    logger.info('RETENTION', `Restoring from archive`, { ids: idsArray?.length ?? 'all' });

    const result = await this.retentionService.restore(idsArray);

    res.json({
      success: result.errors.length === 0,
      restored: result.restored,
      errors: result.errors,
    });
  });

  /**
   * Parse query params into a partial policy
   */
  private parseQueryPolicy(query: Record<string, unknown>): RetentionPolicy | undefined {
    if (!query.maxAgeDays && !query.maxCount) {
      return undefined;
    }

    const defaultPolicy = this.retentionService.getPolicy();

    return {
      enabled: true,
      maxAgeDays: query.maxAgeDays ? parseInt(query.maxAgeDays as string, 10) : defaultPolicy.maxAgeDays,
      maxCount: query.maxCount ? parseInt(query.maxCount as string, 10) : defaultPolicy.maxCount,
      excludeTypes: query.excludeTypes
        ? (query.excludeTypes as string).split(',').filter(Boolean)
        : defaultPolicy.excludeTypes,
      softDelete: query.softDelete !== 'false',
    };
  }
}
