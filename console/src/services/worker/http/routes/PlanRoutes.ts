/**
 * Plan Routes
 *
 * Provides information about active spec-driven development plans.
 * Reads from docs/plans/ directory to show plan status in the viewer.
 */

import { Database } from "bun:sqlite";
import express, { Request, Response } from "express";
import { readFileSync, existsSync, statSync, unlinkSync } from "fs";
import path from "path";
import { BaseRouteHandler } from "../BaseRouteHandler.js";
import type { DatabaseManager } from "../../DatabaseManager.js";
import type { SSEBroadcaster } from "../../SSEBroadcaster.js";
import { resolveProjectRoot } from "./utils/resolveProjectRoot.js";
import { getGitInfo } from "./utils/gitInfo.js";
import {
  getActivePlans,
  getAllPlans,
  getActiveSpecs,
  getPlanStats,
  parsePlanContent,
} from "./utils/planFileReader.js";
import type { PlanInfo } from "./utils/planFileReader.js";
import type { GitInfo } from "./utils/gitInfo.js";
import {
  associatePlan,
  getPlanForSession,
  getPlanByContentSessionId,
  updatePlanStatus,
  clearPlanAssociation,
} from "../../../sqlite/plans/store.js";

export type { PlanInfo, GitInfo };

/**
 * Validates that a resolved file path is within an allowed plans directory:
 * - {projectRoot}/docs/plans/ (main plans)
 * - {projectRoot}/.worktrees/<slug>/docs/plans/ (worktree plans)
 */
function isValidPlanPath(projectRoot: string, resolvedPath: string): boolean {
  if (!resolvedPath.endsWith(".md")) return false;
  const normalizedRoot = path.resolve(projectRoot);
  const mainPlansDir = path.join(normalizedRoot, "docs", "plans");
  if (resolvedPath.startsWith(mainPlansDir + path.sep) || resolvedPath.startsWith(mainPlansDir + "/")) {
    return true;
  }
  const worktreesDir = path.join(normalizedRoot, ".worktrees");
  if (resolvedPath.startsWith(worktreesDir) && resolvedPath.includes("/docs/plans/")) {
    return true;
  }
  return false;
}

export class PlanRoutes extends BaseRouteHandler {
  private dbManager: DatabaseManager | null;
  private sseBroadcaster: SSEBroadcaster | null;

  constructor(dbManager?: DatabaseManager, sseBroadcaster?: SSEBroadcaster) {
    super();
    this.dbManager = dbManager ?? null;
    this.sseBroadcaster = sseBroadcaster ?? null;
  }

  private static VALID_PLAN_STATUSES = new Set(["PENDING", "COMPLETE", "VERIFIED"]);

  private isValidPlanStatus(status: unknown): status is PlanInfo["status"] {
    return typeof status === "string" && PlanRoutes.VALID_PLAN_STATUSES.has(status);
  }

  setupRoutes(app: express.Application): void {
    app.get("/api/plan", this.handleGetActivePlan.bind(this));
    app.get("/api/plans", this.handleGetAllPlans.bind(this));
    app.get("/api/plans/active", this.handleGetActiveSpecs.bind(this));
    app.get("/api/plan/content", this.handleGetPlanContent.bind(this));
    app.delete("/api/plan", this.handleDeletePlan.bind(this));
    app.get("/api/plans/stats", this.handleGetPlanStats.bind(this));
    app.get("/api/git", this.handleGetGitInfo.bind(this));

    app.post("/api/sessions/:sessionDbId/plan", this.handleAssociatePlan.bind(this));
    app.post(
      "/api/sessions/by-content-id/:contentSessionId/plan",
      this.handleAssociatePlanByContentId.bind(this),
    );
    app.get("/api/sessions/:sessionDbId/plan", this.handleGetSessionPlan.bind(this));
    app.get(
      "/api/sessions/by-content-id/:contentSessionId/plan",
      this.handleGetSessionPlanByContentId.bind(this),
    );
    app.delete("/api/sessions/:sessionDbId/plan", this.handleClearSessionPlan.bind(this));
    app.put("/api/sessions/:sessionDbId/plan/status", this.handleUpdatePlanStatus.bind(this));
  }

  private handleGetPlanStats = this.wrapHandler((req: Request, res: Response): void => {
    const project = req.query.project as string | undefined;
    const projectRoot = resolveProjectRoot(this.dbManager, project);
    res.json(getPlanStats(projectRoot));
  });

  private handleGetActivePlan = this.wrapHandler((req: Request, res: Response): void => {
    const project = req.query.project as string | undefined;
    const projectRoot = resolveProjectRoot(this.dbManager, project);
    const plans = getActivePlans(projectRoot);
    res.json({ active: plans.length > 0, plans, plan: plans[0] || null });
  });

  private handleGetAllPlans = this.wrapHandler((req: Request, res: Response): void => {
    const project = req.query.project as string | undefined;
    const projectRoot = resolveProjectRoot(this.dbManager, project);
    res.json({ plans: getAllPlans(projectRoot) });
  });

  private handleGetGitInfo = this.wrapHandler((req: Request, res: Response): void => {
    const project = req.query.project as string | undefined;
    const projectRoot = resolveProjectRoot(this.dbManager, project);
    res.json(getGitInfo(projectRoot));
  });

  private handleGetActiveSpecs = this.wrapHandler((req: Request, res: Response): void => {
    const project = req.query.project as string | undefined;
    const projectRoot = resolveProjectRoot(this.dbManager, project);
    res.json({ specs: getActiveSpecs(projectRoot) });
  });

  private handleGetPlanContent = this.wrapHandler((req: Request, res: Response): void => {
    const project = req.query.project as string | undefined;
    const projectRoot = resolveProjectRoot(this.dbManager, project);
    const requestedPath = req.query.path as string | undefined;

    if (!requestedPath) {
      const specs = getActiveSpecs(projectRoot);
      if (specs.length === 0) {
        res.status(404).json({ error: "No active specs found" });
        return;
      }
      const firstSpec = specs[0];
      try {
        const content = readFileSync(firstSpec.filePath, "utf-8");
        res.json({ content, name: firstSpec.name, status: firstSpec.status, filePath: firstSpec.filePath });
      } catch {
        res.status(404).json({ error: "Plan file not found" });
      }
      return;
    }

    const resolvedPath = path.resolve(projectRoot, requestedPath);

    if (!isValidPlanPath(projectRoot, resolvedPath)) {
      res.status(403).json({ error: "Access denied: path must be within docs/plans/ or .worktrees/*/docs/plans/" });
      return;
    }

    if (!existsSync(resolvedPath)) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const content = readFileSync(resolvedPath, "utf-8");
    const fileName = path.basename(resolvedPath);
    const stat = statSync(resolvedPath);
    const planInfo = parsePlanContent(content, fileName, resolvedPath, stat.mtime);

    res.json({
      content,
      name: planInfo?.name || fileName.replace(".md", ""),
      status: planInfo?.status || "UNKNOWN",
      filePath: resolvedPath,
    });
  });

  private handleDeletePlan = this.wrapHandler((req: Request, res: Response): void => {
    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const requestedPath = req.query.path as string | undefined;

    if (!requestedPath) {
      this.badRequest(res, "Missing path query parameter");
      return;
    }

    const resolvedPath = path.resolve(projectRoot, requestedPath);

    if (!isValidPlanPath(projectRoot, resolvedPath)) {
      res.status(403).json({ error: "Access denied: path must be within docs/plans/ or .worktrees/*/docs/plans/" });
      return;
    }

    if (!existsSync(resolvedPath)) {
      this.notFound(res, "Plan not found");
      return;
    }

    unlinkSync(resolvedPath);
    res.json({ success: true });
  });

  private handleAssociatePlan = this.wrapHandler((req: Request, res: Response): void => {
    const sessionDbId = this.parseIntParam(req, res, "sessionDbId");
    if (sessionDbId === null) return;
    if (!this.validateRequired(req, res, ["planPath", "status"])) return;
    if (!this.isValidPlanStatus(req.body.status)) {
      this.badRequest(res, `Invalid status: ${req.body.status}. Must be PENDING, COMPLETE, or VERIFIED`);
      return;
    }
    const db = this.getDb(res);
    if (!db) return;

    const result = associatePlan(db, sessionDbId, req.body.planPath, req.body.status);
    this.broadcastPlanChange();
    res.json({ plan: result });
  });

  private handleAssociatePlanByContentId = this.wrapHandler((req: Request, res: Response): void => {
    const contentSessionId = req.params.contentSessionId;
    if (!contentSessionId) {
      this.badRequest(res, "Missing contentSessionId");
      return;
    }
    if (!this.validateRequired(req, res, ["planPath", "status"])) return;
    if (!this.isValidPlanStatus(req.body.status)) {
      this.badRequest(res, `Invalid status: ${req.body.status}. Must be PENDING, COMPLETE, or VERIFIED`);
      return;
    }
    const db = this.getDb(res);
    if (!db) return;

    const row = db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(contentSessionId) as
      | { id: number }
      | null;
    if (!row) {
      this.notFound(res, "Session not found");
      return;
    }

    const result = associatePlan(db, row.id, req.body.planPath, req.body.status);
    this.broadcastPlanChange();
    res.json({ plan: result });
  });

  private handleGetSessionPlan = this.wrapHandler((req: Request, res: Response): void => {
    const sessionDbId = this.parseIntParam(req, res, "sessionDbId");
    if (sessionDbId === null) return;
    const db = this.getDb(res);
    if (!db) return;
    res.json({ plan: getPlanForSession(db, sessionDbId) });
  });

  private handleGetSessionPlanByContentId = this.wrapHandler((req: Request, res: Response): void => {
    const contentSessionId = req.params.contentSessionId;
    if (!contentSessionId) {
      this.badRequest(res, "Missing contentSessionId");
      return;
    }
    const db = this.getDb(res);
    if (!db) return;
    res.json({ plan: getPlanByContentSessionId(db, contentSessionId) });
  });

  private handleClearSessionPlan = this.wrapHandler((req: Request, res: Response): void => {
    const sessionDbId = this.parseIntParam(req, res, "sessionDbId");
    if (sessionDbId === null) return;
    const db = this.getDb(res);
    if (!db) return;
    clearPlanAssociation(db, sessionDbId);
    this.broadcastPlanChange();
    res.json({ success: true });
  });

  private handleUpdatePlanStatus = this.wrapHandler((req: Request, res: Response): void => {
    const sessionDbId = this.parseIntParam(req, res, "sessionDbId");
    if (sessionDbId === null) return;
    if (!this.validateRequired(req, res, ["status"])) return;
    if (!this.isValidPlanStatus(req.body.status)) {
      this.badRequest(res, `Invalid status: ${req.body.status}. Must be PENDING, COMPLETE, or VERIFIED`);
      return;
    }
    const db = this.getDb(res);
    if (!db) return;
    updatePlanStatus(db, sessionDbId, req.body.status);
    this.broadcastPlanChange();
    res.json({ plan: getPlanForSession(db, sessionDbId) });
  });

  private broadcastPlanChange(): void {
    this.sseBroadcaster?.broadcast({ type: "plan_association_changed" });
  }

  private getDb(res: Response): Database | null {
    if (!this.dbManager) {
      res.status(503).json({ error: "Database not available" });
      return null;
    }
    return this.dbManager.getSessionStore().db;
  }
}
