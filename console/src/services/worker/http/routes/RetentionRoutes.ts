/**
 * Retention Routes
 *
 * API endpoints for memory retention policy management and cleanup.
 */

import express, { Request, Response } from "express";
import { BaseRouteHandler } from "../BaseRouteHandler.js";
import { RetentionService, RetentionPolicy } from "../../RetentionService.js";
import { DatabaseManager } from "../../DatabaseManager.js";
import { logger } from "../../../../utils/logger.js";
import fs from "fs";
import path from "path";
import os from "os";

export class RetentionRoutes extends BaseRouteHandler {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    super();
    this.dbManager = dbManager;
  }

  private getRetentionService(): RetentionService {
    return new RetentionService(this.dbManager, this.dbManager.getVectorSyncOrNull());
  }

  setupRoutes(app: express.Application): void {
    app.get("/api/retention/policy", this.handleGetPolicy.bind(this));

    app.get("/api/retention/preview", this.handlePreview.bind(this));

    app.post("/api/retention/run", this.handleRun.bind(this));

    app.get("/api/retention/archive", this.handleGetArchive.bind(this));

    app.get("/api/retention/archive/list", this.handleListArchived.bind(this));

    app.post("/api/retention/restore", this.handleRestore.bind(this));

    app.post("/api/retention/vacuum", this.handleVacuum.bind(this));

    app.get("/api/vector-db/health", this.handleVectorDbHealth.bind(this));
  }

  /**
   * Get current retention policy from settings
   * GET /api/retention/policy
   */
  private handleGetPolicy = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const policy = this.getRetentionService().getPolicy();
    res.json({ policy });
  });

  /**
   * Preview what would be deleted
   * GET /api/retention/preview
   * Query params: maxAgeDays, maxCount, excludeTypes (optional overrides)
   */
  private handlePreview = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const customPolicy = this.parseQueryPolicy(req.query);
    const preview = await this.getRetentionService().preview(customPolicy);
    res.json({ preview, policy: customPolicy || this.getRetentionService().getPolicy() });
  });

  /**
   * Run retention cleanup
   * POST /api/retention/run
   * Body: { dryRun?: boolean, policy?: RetentionPolicy }
   */
  private handleRun = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { dryRun = false, policy: customPolicy } = req.body;

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

    logger.info("RETENTION", `Running cleanup (dryRun: ${dryRun})`, {
      policy: policy || this.getRetentionService().getPolicy(),
    });

    const result = await this.getRetentionService().run(policy, dryRun);

    res.json({
      success: result.errors.length === 0,
      result,
      policy: policy || this.getRetentionService().getPolicy(),
    });
  });

  /**
   * Get archive stats
   * GET /api/retention/archive
   */
  private handleGetArchive = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const count = this.getRetentionService().getArchiveCount();
    res.json({ archived: count });
  });

  /**
   * List archived observations
   * GET /api/retention/archive/list?limit=100
   */
  private handleListArchived = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const observations = this.getRetentionService().listArchived(limit);
    res.json({
      observations,
      count: observations.length,
      total: this.getRetentionService().getArchiveCount(),
    });
  });

  /**
   * Restore observations from archive
   * POST /api/retention/restore
   * Body: { ids?: number[] } - if empty, restores all
   */
  private handleRestore = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;

    const idsArray = Array.isArray(ids)
      ? ids.map((id: unknown) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id))
      : undefined;

    logger.info("RETENTION", `Restoring from archive`, { ids: idsArray?.length ?? "all" });

    const result = await this.getRetentionService().restore(idsArray);

    res.json({
      success: result.errors.length === 0,
      restored: result.restored,
      errors: result.errors,
    });
  });

  /**
   * Vacuum vector database — rebuild HNSW index from scratch
   * POST /api/retention/vacuum
   */
  private handleVacuum = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const vectorSync = this.dbManager.getVectorSyncOrNull();
    if (!vectorSync) {
      res.status(400).json({ success: false, error: "Vector database is not enabled" });
      return;
    }

    logger.info("RETENTION", "Starting vacuum — rebuilding vector database index");

    const result = await vectorSync.vacuum();

    res.json({
      success: !result.error,
      ...result,
    });
  });

  /**
   * Vector DB health check — directory size, embedding count, bloat detection
   * GET /api/vector-db/health
   */
  private handleVectorDbHealth = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const vectorDbDir = path.join(os.homedir(), ".pilot/memory/vector-db");
    const directorySize = this.getDirectorySize(vectorDbDir);

    const vectorSync = this.dbManager.getVectorSyncOrNull();
    if (!vectorSync) {
      res.json({
        directorySize,
        embeddingCount: 0,
        expectedSize: 0,
        bloatRatio: 0,
        healthy: true,
        available: false,
      });
      return;
    }

    let embeddingCount = 0;
    try {
      const isUp = await vectorSync.isHealthy();
      if (isUp) {
        embeddingCount = await vectorSync.getEmbeddingCount();
      }
    } catch {
    }

    const expectedSize = 384 * 4 * embeddingCount * 10;
    const bloatRatio = expectedSize > 0 ? directorySize / expectedSize : 0;
    const healthy = bloatRatio < 20;

    res.json({
      directorySize,
      embeddingCount,
      expectedSize,
      bloatRatio,
      healthy,
      available: true,
    });
  });

  /**
   * Recursively calculate total size of a directory
   */
  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    try {
      if (!fs.existsSync(dirPath)) return 0;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += this.getDirectorySize(fullPath);
        } else {
          try {
            totalSize += fs.statSync(fullPath).size;
          } catch {}
        }
      }
    } catch {}
    return totalSize;
  }

  /**
   * Parse query params into a partial policy
   */
  private parseQueryPolicy(query: Record<string, unknown>): RetentionPolicy | undefined {
    if (!query.maxAgeDays && !query.maxCount) {
      return undefined;
    }

    const defaultPolicy = this.getRetentionService().getPolicy();

    return {
      enabled: true,
      maxAgeDays: query.maxAgeDays ? parseInt(query.maxAgeDays as string, 10) : defaultPolicy.maxAgeDays,
      maxCount: query.maxCount ? parseInt(query.maxCount as string, 10) : defaultPolicy.maxCount,
      excludeTypes: query.excludeTypes
        ? (query.excludeTypes as string).split(",").filter(Boolean)
        : defaultPolicy.excludeTypes,
      softDelete: query.softDelete !== "false",
    };
  }
}
