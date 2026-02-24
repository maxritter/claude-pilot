/**
 * Integration tests for cross-session memory isolation.
 *
 * Mock Justification: NONE (0% mock code)
 * - Uses real SQLite with ':memory:' - tests actual query pipeline
 * - All operations tested against real database joins and filtering
 *
 * Value: Proves that observations from one spec plan don't leak into
 * another plan's context injection. End-to-end validation of the
 * plan-scoped filtering through ObservationCompiler queries.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { SessionStore } from "../../src/services/sqlite/SessionStore.js";
import {
  queryObservations,
  queryObservationsExcludingOtherPlans,
  querySummaries,
  querySummariesExcludingOtherPlans,
} from "../../src/services/context/ObservationCompiler.js";
import { associatePlan } from "../../src/services/sqlite/plans/store.js";
import type { ContextConfig } from "../../src/services/context/types.js";

function makeConfig(): ContextConfig {
  return {
    totalObservationCount: 50,
    fullObservationCount: 5,
    sessionCount: 5,
    showReadTokens: false,
    showWorkTokens: false,
    showSavingsAmount: false,
    showSavingsPercent: false,
    observationTypes: new Set(["discovery", "bugfix", "feature", "change"]),
    observationConcepts: new Set(["general"]),
    fullObservationField: "narrative",
    showLastSummary: false,
    showLastMessage: false,
  };
}

function insertObservation(
  store: SessionStore,
  memorySessionId: string,
  project: string,
  title: string,
  epoch: number,
  type: string = "discovery",
): void {
  store.db
    .prepare(
      `INSERT INTO observations
      (memory_session_id, project, text, type, title, subtitle, narrative, facts, concepts,
       files_read, files_modified, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, 0, ?, ?)`,
    )
    .run(memorySessionId, project, title, type, title, "narrative", '["fact1"]', '["general"]', new Date(epoch).toISOString(), epoch);
}

function insertSummary(
  store: SessionStore,
  memorySessionId: string,
  project: string,
  request: string,
  epoch: number,
): void {
  store.db
    .prepare(
      `INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed, next_steps,
       created_at, created_at_epoch)
      VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`,
    )
    .run(memorySessionId, project, request, new Date(epoch).toISOString(), epoch);
}

describe("Cross-session memory isolation (integration)", () => {
  let store: SessionStore;
  const PROJECT = "pilot-shell";
  const config = makeConfig();

  beforeEach(() => {
    store = new SessionStore(":memory:");

    store.createSDKSession("cc-uuid-session-1", PROJECT, "implement auth feature");
    store.updateMemorySessionId(1, "mem-session-1");
    associatePlan(store.db, 1, "docs/plans/2026-02-06-add-auth.md", "PENDING");

    store.createSDKSession("cc-uuid-session-2", PROJECT, "fix performance issues");
    store.updateMemorySessionId(2, "mem-session-2");
    associatePlan(store.db, 2, "docs/plans/2026-02-06-fix-perf.md", "PENDING");

    store.createSDKSession("cc-uuid-session-3", PROJECT, "quick fix typo");
    store.updateMemorySessionId(3, "mem-session-3");

    insertObservation(store, "mem-session-1", PROJECT, "Explored auth middleware", 1000);
    insertObservation(store, "mem-session-1", PROJECT, "Implemented JWT validation", 2000);
    insertObservation(store, "mem-session-1", PROJECT, "Added auth tests", 3000);

    insertObservation(store, "mem-session-2", PROJECT, "Profiled database queries", 1500);
    insertObservation(store, "mem-session-2", PROJECT, "Added query caching", 2500);

    insertObservation(store, "mem-session-3", PROJECT, "Fixed typo in README", 1800);

    insertSummary(store, "mem-session-1", PROJECT, "Auth implementation session", 4000);
    insertSummary(store, "mem-session-2", PROJECT, "Performance optimization session", 4500);
    insertSummary(store, "mem-session-3", PROJECT, "Quick typo fix", 2000);
  });

  afterEach(() => {
    store.close();
  });

  describe("Scenario: Session A restarts with plan-a context", () => {
    it("sees only its own observations plus quick-mode observations", () => {
      const results = queryObservationsExcludingOtherPlans(
        store,
        PROJECT,
        config,
        "docs/plans/2026-02-06-add-auth.md",
      );

      const titles = results.map((o) => o.title);

      expect(titles).toContain("Explored auth middleware");
      expect(titles).toContain("Implemented JWT validation");
      expect(titles).toContain("Added auth tests");
      expect(titles).toContain("Fixed typo in README");

      expect(titles).not.toContain("Profiled database queries");
      expect(titles).not.toContain("Added query caching");

      expect(results).toHaveLength(4);
    });

    it("sees only its own summaries plus quick-mode summaries", () => {
      const results = querySummariesExcludingOtherPlans(
        store,
        PROJECT,
        config,
        "docs/plans/2026-02-06-add-auth.md",
      );

      const requests = results.map((s) => s.request);
      expect(requests).toContain("Auth implementation session");
      expect(requests).toContain("Quick typo fix");
      expect(requests).not.toContain("Performance optimization session");
    });
  });

  describe("Scenario: Session B restarts with plan-b context", () => {
    it("sees only its own observations plus quick-mode observations", () => {
      const results = queryObservationsExcludingOtherPlans(
        store,
        PROJECT,
        config,
        "docs/plans/2026-02-06-fix-perf.md",
      );

      const titles = results.map((o) => o.title);

      expect(titles).toContain("Profiled database queries");
      expect(titles).toContain("Added query caching");
      expect(titles).toContain("Fixed typo in README");

      expect(titles).not.toContain("Explored auth middleware");
      expect(titles).not.toContain("Implemented JWT validation");
      expect(titles).not.toContain("Added auth tests");

      expect(results).toHaveLength(3);
    });
  });

  describe("Scenario: No plan filter (backward compatibility)", () => {
    it("returns ALL observations when no planPath is provided", () => {
      const results = queryObservations(store, PROJECT, config);

      expect(results).toHaveLength(6);
      const titles = results.map((o) => o.title);
      expect(titles).toContain("Explored auth middleware");
      expect(titles).toContain("Profiled database queries");
      expect(titles).toContain("Fixed typo in README");
    });

    it("returns ALL summaries when no planPath is provided", () => {
      const results = querySummaries(store, PROJECT, config);

      expect(results).toHaveLength(3);
    });
  });

  describe("Scenario: Continued session (new content_session_id, same plan)", () => {
    it("sees observations from all sessions associated with the same plan", () => {
      store.createSDKSession("cc-uuid-session-1-continued", PROJECT, "continue auth");
      store.updateMemorySessionId(4, "mem-session-1-cont");
      associatePlan(store.db, 4, "docs/plans/2026-02-06-add-auth.md", "PENDING");

      insertObservation(store, "mem-session-1-cont", PROJECT, "Finished auth middleware", 5000);

      const results = queryObservationsExcludingOtherPlans(
        store,
        PROJECT,
        config,
        "docs/plans/2026-02-06-add-auth.md",
      );

      const titles = results.map((o) => o.title);

      expect(titles).toContain("Explored auth middleware");
      expect(titles).toContain("Finished auth middleware");
      expect(titles).toContain("Fixed typo in README");

      expect(titles).not.toContain("Profiled database queries");
    });
  });

  describe("Scenario: Unassociated sessions always included", () => {
    it("quick-mode observations appear in ALL plan-scoped queries", () => {
      const planA = queryObservationsExcludingOtherPlans(store, PROJECT, config, "docs/plans/2026-02-06-add-auth.md");
      const planB = queryObservationsExcludingOtherPlans(store, PROJECT, config, "docs/plans/2026-02-06-fix-perf.md");

      const planATitles = planA.map((o) => o.title);
      const planBTitles = planB.map((o) => o.title);

      expect(planATitles).toContain("Fixed typo in README");
      expect(planBTitles).toContain("Fixed typo in README");
    });
  });
});
