/**
 * Plan file reading utilities.
 * Pure functions for reading and parsing plan files from docs/plans/ directories,
 * including plans inside git worktrees (.worktrees/<slug>/docs/plans/).
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import path from "path";
import { logger } from "../../../../../utils/logger.js";

export interface PlanInfo {
  name: string;
  status: "PENDING" | "COMPLETE" | "VERIFIED";
  completed: number;
  total: number;
  phase: "plan" | "implement" | "verify";
  iterations: number;
  approved: boolean;
  worktree: boolean;
  specType?: "Feature" | "Bugfix";
  filePath: string;
  modifiedAt: string;
}

export function parsePlanContent(
  content: string,
  fileName: string,
  filePath: string,
  modifiedAt: Date,
): PlanInfo | null {
  const statusMatch = content.match(/^Status:\s*(\w+)/m);
  if (!statusMatch) {
    return null;
  }

  const status = statusMatch[1] as "PENDING" | "COMPLETE" | "VERIFIED";

  const completedTasks = (content.match(/^- \[x\] Task \d+:/gm) || []).length;
  const remainingTasks = (content.match(/^- \[ \] Task \d+:/gm) || []).length;
  const total = completedTasks + remainingTasks;

  const approvedMatch = content.match(/^Approved:\s*(\w+)/m);
  const approved = approvedMatch
    ? approvedMatch[1].toLowerCase() === "yes"
    : false;

  const iterMatch = content.match(/^Iterations:\s*(\d+)/m);
  const iterations = iterMatch ? parseInt(iterMatch[1], 10) : 0;

  const worktreeMatch = content.match(/^Worktree:\s*(\w+)/m);
  const worktree = worktreeMatch
    ? worktreeMatch[1].toLowerCase() !== "no"
    : true;

  const typeMatch = content.match(/^Type:\s*(\w+)/m);
  const specType: "Feature" | "Bugfix" =
    typeMatch?.[1] === "Bugfix" ? "Bugfix" : "Feature";

  let phase: "plan" | "implement" | "verify";
  if (status === "PENDING" && !approved) {
    phase = "plan";
  } else if (status === "PENDING" && approved) {
    phase = "implement";
  } else {
    phase = "verify";
  }

  let name = fileName.replace(".md", "");
  if (name.match(/^\d{4}-\d{2}-\d{2}-/)) {
    name = name.split("-").slice(3).join("-");
  }

  return {
    name,
    status,
    completed: completedTasks,
    total,
    phase,
    iterations,
    approved,
    worktree,
    specType,
    filePath,
    modifiedAt: modifiedAt.toISOString(),
  };
}

/**
 * Returns all docs/plans/ directories found in .worktrees/<slug>/docs/plans/
 * subdirectories under the project root.
 */
export function getWorktreePlansDirs(projectRoot: string): string[] {
  const worktreesDir = path.join(projectRoot, ".worktrees");
  if (!existsSync(worktreesDir)) {
    return [];
  }

  const dirs: string[] = [];
  try {
    const entries = readdirSync(worktreesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const plansDir = path.join(worktreesDir, entry.name, "docs", "plans");
      if (existsSync(plansDir)) {
        dirs.push(plansDir);
      }
    }
  } catch (error) {
    logger.error(
      "HTTP",
      "Failed to read worktrees directory",
      { worktreesDir },
      error as Error,
    );
  }
  return dirs;
}

/**
 * Scan a plans directory and return parsed PlanInfo entries.
 */
function scanPlansDir(plansDir: string): PlanInfo[] {
  const plans: PlanInfo[] = [];
  try {
    const planFiles = readdirSync(plansDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    for (const planFile of planFiles) {
      const filePath = path.join(plansDir, planFile);
      const stat = statSync(filePath);
      const content = readFileSync(filePath, "utf-8");
      const planInfo = parsePlanContent(
        content,
        planFile,
        filePath,
        stat.mtime,
      );
      if (planInfo) {
        plans.push(planInfo);
      }
    }
  } catch (error) {
    logger.error(
      "HTTP",
      "Failed to read plans from directory",
      { plansDir },
      error as Error,
    );
  }
  return plans;
}

/**
 * Returns all plans directories to scan: main docs/plans/ plus all worktree plans dirs.
 */
function getAllPlansDirs(projectRoot: string): string[] {
  const dirs: string[] = [];
  const mainPlansDir = path.join(projectRoot, "docs", "plans");
  if (existsSync(mainPlansDir)) {
    dirs.push(mainPlansDir);
  }
  dirs.push(...getWorktreePlansDirs(projectRoot));
  return dirs;
}

/**
 * Deduplicate plans by name. When the same plan exists in both the main
 * docs/plans/ dir and a .worktrees/ copy, keep the worktree version
 * (that's where active work happens). For same-source duplicates, keep
 * the most recently modified.
 */
export function deduplicatePlans(plans: PlanInfo[]): PlanInfo[] {
  const byName = new Map<string, PlanInfo>();
  for (const plan of plans) {
    const existing = byName.get(plan.name);
    if (!existing) {
      byName.set(plan.name, plan);
      continue;
    }
    const planIsWorktree = plan.filePath.includes("/.worktrees/");
    const existingIsWorktree = existing.filePath.includes("/.worktrees/");
    if (planIsWorktree && !existingIsWorktree) {
      byName.set(plan.name, plan);
    } else if (!planIsWorktree && existingIsWorktree) {
    } else if (
      new Date(plan.modifiedAt).getTime() >
      new Date(existing.modifiedAt).getTime()
    ) {
      byName.set(plan.name, plan);
    }
  }
  return Array.from(byName.values());
}

export function getActivePlans(projectRoot: string): PlanInfo[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activePlans: PlanInfo[] = [];

  for (const plansDir of getAllPlansDirs(projectRoot)) {
    try {
      const planFiles = readdirSync(plansDir)
        .filter((f) => f.endsWith(".md"))
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

        const content = readFileSync(filePath, "utf-8");
        const planInfo = parsePlanContent(
          content,
          planFile,
          filePath,
          stat.mtime,
        );

        if (planInfo && planInfo.status !== "VERIFIED") {
          activePlans.push(planInfo);
        }
      }
    } catch (error) {
      logger.error(
        "HTTP",
        "Failed to read active plans",
        { plansDir },
        error as Error,
      );
    }
  }

  return deduplicatePlans(activePlans);
}

export function getAllPlans(projectRoot: string): PlanInfo[] {
  const allPlans: PlanInfo[] = [];

  for (const plansDir of getAllPlansDirs(projectRoot)) {
    allPlans.push(...scanPlansDir(plansDir));
  }

  return deduplicatePlans(allPlans)
    .sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    )
    .slice(0, 10);
}

export function getActiveSpecs(projectRoot: string): PlanInfo[] {
  const allPlans: PlanInfo[] = [];

  for (const plansDir of getAllPlansDirs(projectRoot)) {
    allPlans.push(...scanPlansDir(plansDir));
  }

  return deduplicatePlans(allPlans).sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  );
}

export function getPlanStats(projectRoot: string): {
  totalSpecs: number;
  verified: number;
  inProgress: number;
  pending: number;
  avgIterations: number;
  totalTasksCompleted: number;
  totalTasks: number;
  completionTimeline: Array<{ date: string; count: number }>;
  recentlyVerified: Array<{ name: string; verifiedAt: string }>;
} {
  const rawPlans: PlanInfo[] = [];

  for (const plansDir of getAllPlansDirs(projectRoot)) {
    rawPlans.push(...scanPlansDir(plansDir));
  }

  const allPlans = deduplicatePlans(rawPlans);

  if (allPlans.length === 0) {
    return {
      totalSpecs: 0,
      verified: 0,
      inProgress: 0,
      pending: 0,
      avgIterations: 0,
      totalTasksCompleted: 0,
      totalTasks: 0,
      completionTimeline: [],
      recentlyVerified: [],
    };
  }

  const verified = allPlans.filter((p) => p.status === "VERIFIED");
  const inProgress = allPlans.filter(
    (p) => (p.status === "PENDING" && p.approved) || p.status === "COMPLETE",
  );
  const pending = allPlans.filter((p) => p.status === "PENDING" && !p.approved);
  const verifiedIter = verified.reduce((sum, p) => sum + p.iterations, 0);
  const totalTasksCompleted = allPlans.reduce((sum, p) => sum + p.completed, 0);
  const totalTasks = allPlans.reduce((sum, p) => sum + p.total, 0);

  const dateMap = new Map<string, number>();
  for (const p of verified) {
    const date = p.modifiedAt.slice(0, 10);
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  }
  const completionTimeline = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const recentlyVerified = verified
    .sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    )
    .slice(0, 5)
    .map((p) => ({ name: p.name, verifiedAt: p.modifiedAt }));

  return {
    totalSpecs: allPlans.length,
    verified: verified.length,
    inProgress: inProgress.length,
    pending: pending.length,
    avgIterations:
      verified.length > 0
        ? Math.round((verifiedIter / verified.length) * 10) / 10
        : 0,
    totalTasksCompleted,
    totalTasks,
    completionTimeline,
    recentlyVerified,
  };
}
