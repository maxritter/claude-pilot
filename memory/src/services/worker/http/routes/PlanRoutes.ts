/**
 * Plan Routes
 *
 * Provides information about active spec-driven development plans.
 * Reads from docs/plans/ directory to show plan status in the viewer.
 */

import express, { Request, Response } from 'express';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

export interface GitInfo {
  branch: string | null;
  staged: number;
  unstaged: number;
  untracked: number;
}

export interface PlanInfo {
  name: string;
  status: 'PENDING' | 'COMPLETE' | 'VERIFIED';
  completed: number;
  total: number;
  phase: 'plan' | 'implement' | 'verify';
  iterations: number;
  approved: boolean;
  filePath: string;
  modifiedAt: string;
}

export class PlanRoutes extends BaseRouteHandler {
  constructor() {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/plan', this.handleGetActivePlan.bind(this));
    app.get('/api/plans', this.handleGetAllPlans.bind(this));
    app.get('/api/git', this.handleGetGitInfo.bind(this));
  }

  /**
   * Get active plan info (most recent non-VERIFIED plan modified today)
   */
  private handleGetActivePlan = this.wrapHandler((_req: Request, res: Response): void => {
    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const plan = this.getActivePlanInfo(projectRoot);

    if (!plan) {
      res.json({ active: false, plan: null });
      return;
    }

    res.json({ active: true, plan });
  });

  /**
   * Get all plans from docs/plans/ directory
   */
  private handleGetAllPlans = this.wrapHandler((_req: Request, res: Response): void => {
    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const plans = this.getAllPlans(projectRoot);
    res.json({ plans });
  });

  /**
   * Get git repository info (branch, staged/unstaged counts)
   */
  private handleGetGitInfo = this.wrapHandler((_req: Request, res: Response): void => {
    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const gitInfo = this.getGitInfo(projectRoot);
    res.json(gitInfo);
  });

  /**
   * Get info about active plan from docs/plans/ directory.
   * Only considers specs modified today to avoid showing stale plans.
   */
  private getActivePlanInfo(projectRoot: string): PlanInfo | null {
    const plansDir = path.join(projectRoot, 'docs', 'plans');
    if (!existsSync(plansDir)) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const planFiles = readdirSync(plansDir)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse();

      for (const planFile of planFiles) {
        const filePath = path.join(plansDir, planFile);
        const stat = statSync(filePath);
        const mtime = new Date(stat.mtime);
        mtime.setHours(0, 0, 0, 0);

        if (mtime.getTime() !== today.getTime()) {
          continue;
        }

        const content = readFileSync(filePath, 'utf-8');
        const planInfo = this.parsePlanContent(content, planFile, filePath, stat.mtime);

        if (planInfo && planInfo.status !== 'VERIFIED') {
          return planInfo;
        }
      }
    } catch (error) {
    }

    return null;
  }

  /**
   * Get all plans from docs/plans/ directory
   */
  private getAllPlans(projectRoot: string): PlanInfo[] {
    const plansDir = path.join(projectRoot, 'docs', 'plans');
    if (!existsSync(plansDir)) {
      return [];
    }

    const plans: PlanInfo[] = [];

    try {
      const planFiles = readdirSync(plansDir)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse();

      for (const planFile of planFiles) {
        const filePath = path.join(plansDir, planFile);
        const stat = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        const planInfo = this.parsePlanContent(content, planFile, filePath, stat.mtime);

        if (planInfo) {
          plans.push(planInfo);
        }
      }
    } catch (error) {
    }

    return plans.slice(0, 10);
  }

  /**
   * Parse plan file content to extract status information
   */
  private parsePlanContent(
    content: string,
    fileName: string,
    filePath: string,
    modifiedAt: Date
  ): PlanInfo | null {
    const statusMatch = content.match(/^Status:\s*(\w+)/m);
    if (!statusMatch) {
      return null;
    }

    const status = statusMatch[1] as 'PENDING' | 'COMPLETE' | 'VERIFIED';

    const completedTasks = (content.match(/^- \[x\] Task \d+:/gm) || []).length;
    const remainingTasks = (content.match(/^- \[ \] Task \d+:/gm) || []).length;
    const total = completedTasks + remainingTasks;

    const approvedMatch = content.match(/^Approved:\s*(\w+)/m);
    const approved = approvedMatch ? approvedMatch[1].toLowerCase() === 'yes' : false;

    const iterMatch = content.match(/^Iterations:\s*(\d+)/m);
    const iterations = iterMatch ? parseInt(iterMatch[1], 10) : 0;

    let phase: 'plan' | 'implement' | 'verify';
    if (status === 'PENDING' && !approved) {
      phase = 'plan';
    } else if (status === 'PENDING' && approved) {
      phase = 'implement';
    } else {
      phase = 'verify';
    }

    let name = fileName.replace('.md', '');
    if (name.match(/^\d{4}-\d{2}-\d{2}-/)) {
      name = name.split('-').slice(3).join('-');
    }

    return {
      name,
      status,
      completed: completedTasks,
      total,
      phase,
      iterations,
      approved,
      filePath,
      modifiedAt: modifiedAt.toISOString(),
    };
  }

  /**
   * Get git repository info
   */
  private getGitInfo(projectRoot: string): GitInfo {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 2000,
      }).trim();

      const status = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 2000,
      });

      let staged = 0;
      let unstaged = 0;
      let untracked = 0;

      for (const line of status.split('\n')) {
        if (!line) continue;
        const idx = line[0] || ' ';
        const wt = line[1] || ' ';

        if (idx === '?' && wt === '?') {
          untracked++;
        } else {
          if (idx !== ' ' && idx !== '?') staged++;
          if (wt !== ' ') unstaged++;
        }
      }

      return { branch, staged, unstaged, untracked };
    } catch {
      return { branch: null, staged: 0, unstaged: 0, untracked: 0 };
    }
  }
}
