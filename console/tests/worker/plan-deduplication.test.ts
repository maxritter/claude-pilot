/**
 * Tests for plan deduplication logic.
 *
 * When a spec uses a worktree, the same plan file exists in both
 * docs/plans/ (main) and .worktrees/<slug>/docs/plans/ (worktree copy).
 * deduplicatePlans ensures each plan name appears only once, preferring
 * the worktree version over the main copy.
 */
import { describe, it, expect } from "bun:test";
import { deduplicatePlans } from "../../src/services/worker/http/routes/utils/planFileReader.js";
import type { PlanInfo } from "../../src/services/worker/http/routes/utils/planFileReader.js";

function makePlan(overrides: Partial<PlanInfo> & { name: string; filePath: string }): PlanInfo {
  return {
    status: "PENDING",
    completed: 0,
    total: 3,
    phase: "implement",
    iterations: 0,
    approved: true,
    worktree: true,
    specType: "Feature",
    modifiedAt: "2026-02-24T10:00:00.000Z",
    ...overrides,
  };
}

describe("deduplicatePlans", () => {
  it("should return empty array for empty input", () => {
    expect(deduplicatePlans([])).toEqual([]);
  });

  it("should return plans unchanged when no duplicates", () => {
    const plans = [
      makePlan({ name: "feature-a", filePath: "/proj/docs/plans/feature-a.md" }),
      makePlan({ name: "feature-b", filePath: "/proj/docs/plans/feature-b.md" }),
    ];
    expect(deduplicatePlans(plans)).toHaveLength(2);
  });

  it("should prefer worktree copy over main copy for same plan name", () => {
    const mainCopy = makePlan({
      name: "rename-to-pilot-shell",
      filePath: "/proj/docs/plans/2026-02-24-rename-to-pilot-shell.md",
      modifiedAt: "2026-02-24T12:00:00.000Z",
    });
    const worktreeCopy = makePlan({
      name: "rename-to-pilot-shell",
      filePath: "/proj/.worktrees/spec-rename-b44c/docs/plans/2026-02-24-rename-to-pilot-shell.md",
      modifiedAt: "2026-02-24T10:00:00.000Z",
    });
    const result = deduplicatePlans([mainCopy, worktreeCopy]);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toContain(".worktrees/");
  });

  it("should prefer worktree copy regardless of input order", () => {
    const mainCopy = makePlan({
      name: "my-feature",
      filePath: "/proj/docs/plans/2026-02-24-my-feature.md",
    });
    const worktreeCopy = makePlan({
      name: "my-feature",
      filePath: "/proj/.worktrees/spec-my-feature-abc123/docs/plans/2026-02-24-my-feature.md",
    });
    const result1 = deduplicatePlans([worktreeCopy, mainCopy]);
    expect(result1).toHaveLength(1);
    expect(result1[0].filePath).toContain(".worktrees/");

    const result2 = deduplicatePlans([mainCopy, worktreeCopy]);
    expect(result2).toHaveLength(1);
    expect(result2[0].filePath).toContain(".worktrees/");
  });

  it("should keep newer copy when both are from main dirs", () => {
    const older = makePlan({
      name: "same-name",
      filePath: "/proj/docs/plans/2026-02-20-same-name.md",
      modifiedAt: "2026-02-20T10:00:00.000Z",
    });
    const newer = makePlan({
      name: "same-name",
      filePath: "/proj/docs/plans/2026-02-24-same-name.md",
      modifiedAt: "2026-02-24T10:00:00.000Z",
    });
    const result = deduplicatePlans([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].modifiedAt).toBe("2026-02-24T10:00:00.000Z");
  });

  it("should keep newer copy when both are from worktree dirs", () => {
    const older = makePlan({
      name: "wt-plan",
      filePath: "/proj/.worktrees/slug-a/docs/plans/2026-02-20-wt-plan.md",
      modifiedAt: "2026-02-20T10:00:00.000Z",
    });
    const newer = makePlan({
      name: "wt-plan",
      filePath: "/proj/.worktrees/slug-b/docs/plans/2026-02-24-wt-plan.md",
      modifiedAt: "2026-02-24T10:00:00.000Z",
    });
    const result = deduplicatePlans([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].modifiedAt).toBe("2026-02-24T10:00:00.000Z");
  });

  it("should deduplicate only matching names, keeping others intact", () => {
    const plans = [
      makePlan({ name: "dup", filePath: "/proj/docs/plans/dup.md" }),
      makePlan({ name: "dup", filePath: "/proj/.worktrees/s/docs/plans/dup.md" }),
      makePlan({ name: "unique-a", filePath: "/proj/docs/plans/unique-a.md" }),
      makePlan({ name: "unique-b", filePath: "/proj/.worktrees/s/docs/plans/unique-b.md" }),
    ];
    const result = deduplicatePlans(plans);
    expect(result).toHaveLength(3);
    const names = result.map((p) => p.name).sort();
    expect(names).toEqual(["dup", "unique-a", "unique-b"]);
    const dupResult = result.find((p) => p.name === "dup")!;
    expect(dupResult.filePath).toContain(".worktrees/");
  });
});
