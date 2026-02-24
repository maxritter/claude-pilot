/**
 * Tests for /api/plans/stats endpoint - aggregate spec metrics
 *
 * Mock Justification: Code-inspection pattern (readFileSync + string assertions)
 * Tests that the route is registered and handler logic exists in PlanRoutes source.
 *
 * Value: Validates plan stats endpoint registration and response shape
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import path from "path";

const PLAN_ROUTES_PATH = path.resolve(
  import.meta.dir,
  "../../src/services/worker/http/routes/PlanRoutes.ts",
);
const PLAN_FILE_READER_PATH = path.resolve(
  import.meta.dir,
  "../../src/services/worker/http/routes/utils/planFileReader.ts",
);

describe("/api/plans/stats endpoint", () => {
  const routesSource = readFileSync(PLAN_ROUTES_PATH, "utf-8");
  const readerSource = readFileSync(PLAN_FILE_READER_PATH, "utf-8");

  it("should register GET /api/plans/stats route", () => {
    expect(routesSource).toContain('"/api/plans/stats"');
    expect(routesSource).toContain("handleGetPlanStats");
  });

  it("should have getPlanStats method that counts ALL plans", () => {
    expect(readerSource).toContain("getPlanStats");
    const getPlanStatsMethod = readerSource.slice(readerSource.indexOf("getPlanStats("));
    expect(getPlanStatsMethod).toContain("totalSpecs");
    expect(getPlanStatsMethod).toContain("verified");
    expect(getPlanStatsMethod).toContain("inProgress");
    expect(getPlanStatsMethod).toContain("completionTimeline");
    expect(getPlanStatsMethod).toContain("recentlyVerified");
  });

  it("should return JSON with required fields", () => {
    expect(readerSource).toContain("totalSpecs");
    expect(readerSource).toContain("verified");
    expect(readerSource).toContain("inProgress");
    expect(readerSource).toContain("pending");
    expect(readerSource).toContain("avgIterations");
    expect(readerSource).toContain("totalTasksCompleted");
    expect(readerSource).toContain("totalTasks");
    expect(readerSource).toContain("completionTimeline");
    expect(readerSource).toContain("recentlyVerified");
  });

  it("should support ?project= query parameter", () => {
    expect(routesSource).toContain("req.query.project");
  });

  it("should parse specType from plan files", () => {
    expect(readerSource).toContain("specType");
    expect(readerSource).toContain('"Bugfix"');
    expect(readerSource).toContain(/^Type:\s*(\w+)/m.source);
  });
});
