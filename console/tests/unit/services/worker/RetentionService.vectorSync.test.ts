/**
 * Tests for RetentionService vector sync integration.
 * Verifies that all four deletion code paths call vectorSync.deleteDocuments()
 * before deleting from SQLite, and that vector errors don't block SQLite cleanup.
 */

import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { RetentionService } from "../../../../src/services/worker/RetentionService.js";
import type { IVectorSync } from "../../../../src/services/sync/IVectorSync.js";
import type { DatabaseManager } from "../../../../src/services/worker/DatabaseManager.js";

function createMockDb(observations: Array<{ id: number; created_at_epoch: number; project: string; type: string }>) {
  const deletedRows: number[] = [];
  const archivedRows: number[] = [];

  return {
    prepare: mock((sql: string) => ({
      get: mock((...args: any[]) => {
        if (sql.includes("SELECT COUNT(*)")) {
          if (sql.includes("deleted_observations")) {
            return { count: archivedRows.length };
          }
          const filtered = observations.filter((o) => {
            if (sql.includes("created_at_epoch < ?")) {
              return o.created_at_epoch < args[0];
            }
            return true;
          });
          return { count: filtered.length };
        }
        return null;
      }),
      all: mock((...args: any[]) => {
        if (sql.includes("SELECT project")) {
          const grouped = new Map<string, number>();
          for (const o of observations) {
            grouped.set(o.project, (grouped.get(o.project) || 0) + 1);
          }
          const maxCount = args[args.length - 1] as number;
          return Array.from(grouped.entries())
            .filter(([, count]) => count > maxCount)
            .map(([project, count]) => ({ project, count }));
        }
        if (sql.includes("SELECT id FROM observations") && sql.includes("created_at_epoch < ?")) {
          const cutoff = args[0] as number;
          return observations.filter((o) => o.created_at_epoch < cutoff).map((o) => ({ id: o.id }));
        }
        if (sql.includes("SELECT id FROM observations")) {
          const project = args[0] as string;
          const limit = args[args.length - 1] as number;
          return observations
            .filter((o) => o.project === project)
            .sort((a, b) => a.created_at_epoch - b.created_at_epoch)
            .slice(0, limit)
            .map((o) => ({ id: o.id }));
        }
        return [];
      }),
      run: mock((...args: any[]) => {
        if (sql.includes("DELETE FROM observations")) {
          let count = 0;
          if (sql.includes("created_at_epoch < ?")) {
            const cutoff = args[0] as number;
            count = observations.filter((o) => o.created_at_epoch < cutoff).length;
          } else if (sql.includes("IN (")) {
            count = args.length;
          }
          return { changes: count };
        }
        if (sql.includes("INSERT INTO deleted_observations")) {
          return { changes: 0 };
        }
        return { changes: 0 };
      }),
    })),
    exec: mock(() => {}),
    _deletedRows: deletedRows,
    _archivedRows: archivedRows,
  };
}

function createMockDbManager(db: any): DatabaseManager {
  return {
    getSessionStore: () => ({ db }),
    getVectorSyncOrNull: () => null,
  } as any;
}

function createMockVectorSync(shouldFail = false): IVectorSync {
  return {
    deleteDocuments: mock(async (_ids: number[], _docType: string) => {
      if (shouldFail) throw new Error("Vector DB connection failed");
      return _ids.length;
    }),
    syncObservation: mock(async () => {}),
    syncSummary: mock(async () => {}),
    syncUserPrompt: mock(async () => {}),
    ensureBackfilled: mock(async () => {}),
    query: mock(async () => ({ ids: [], distances: [], metadatas: [] })),
    close: mock(async () => {}),
    isHealthy: mock(async () => true),
  } as any;
}

describe("RetentionService vector sync integration", () => {
  const now = Date.now();
  const oldEpoch = now - 100 * 24 * 60 * 60 * 1000;

  describe("age-based hard-delete", () => {
    it("should call vectorSync.deleteDocuments before deleting from SQLite", async () => {
      const observations = [
        { id: 1, created_at_epoch: oldEpoch, project: "test", type: "discovery" },
        { id: 2, created_at_epoch: oldEpoch, project: "test", type: "discovery" },
        { id: 3, created_at_epoch: now, project: "test", type: "discovery" },
      ];
      const db = createMockDb(observations);
      const dbManager = createMockDbManager(db);
      const vectorSync = createMockVectorSync();

      const service = new RetentionService(dbManager, vectorSync);
      const result = await service.run({
        enabled: true,
        maxAgeDays: 30,
        maxCount: 0,
        excludeTypes: [],
        softDelete: false,
      });

      expect(vectorSync.deleteDocuments).toHaveBeenCalled();
      const call = (vectorSync.deleteDocuments as any).mock.calls[0];
      expect(call[0]).toEqual([1, 2]);
      expect(call[1]).toBe("observation");
    });
  });

  describe("age-based soft-delete (archive)", () => {
    it("should call vectorSync.deleteDocuments before archiving from SQLite", async () => {
      const observations = [
        { id: 10, created_at_epoch: oldEpoch, project: "test", type: "discovery" },
        { id: 11, created_at_epoch: oldEpoch, project: "test", type: "discovery" },
      ];
      const db = createMockDb(observations);
      const dbManager = createMockDbManager(db);
      const vectorSync = createMockVectorSync();

      const service = new RetentionService(dbManager, vectorSync);
      await service.run({
        enabled: true,
        maxAgeDays: 30,
        maxCount: 0,
        excludeTypes: [],
        softDelete: true,
      });

      expect(vectorSync.deleteDocuments).toHaveBeenCalled();
      const call = (vectorSync.deleteDocuments as any).mock.calls[0];
      expect(call[0]).toEqual([10, 11]);
      expect(call[1]).toBe("observation");
    });
  });

  describe("count-based hard-delete", () => {
    it("should call vectorSync.deleteDocuments with collected IDs", async () => {
      const observations = [
        { id: 20, created_at_epoch: oldEpoch, project: "proj1", type: "discovery" },
        { id: 21, created_at_epoch: oldEpoch + 1000, project: "proj1", type: "discovery" },
        { id: 22, created_at_epoch: now, project: "proj1", type: "discovery" },
      ];
      const db = createMockDb(observations);
      const dbManager = createMockDbManager(db);
      const vectorSync = createMockVectorSync();

      const service = new RetentionService(dbManager, vectorSync);
      await service.run({
        enabled: true,
        maxAgeDays: 0,
        maxCount: 1,
        excludeTypes: [],
        softDelete: false,
      });

      expect(vectorSync.deleteDocuments).toHaveBeenCalled();
      const call = (vectorSync.deleteDocuments as any).mock.calls[0];
      expect(call[0]).toEqual([20, 21]);
      expect(call[1]).toBe("observation");
    });
  });

  describe("count-based soft-delete (archive)", () => {
    it("should call vectorSync.deleteDocuments before archiving", async () => {
      const observations = [
        { id: 30, created_at_epoch: oldEpoch, project: "proj1", type: "discovery" },
        { id: 31, created_at_epoch: oldEpoch + 1000, project: "proj1", type: "discovery" },
        { id: 32, created_at_epoch: now, project: "proj1", type: "discovery" },
      ];
      const db = createMockDb(observations);
      const dbManager = createMockDbManager(db);
      const vectorSync = createMockVectorSync();

      const service = new RetentionService(dbManager, vectorSync);
      await service.run({
        enabled: true,
        maxAgeDays: 0,
        maxCount: 1,
        excludeTypes: [],
        softDelete: true,
      });

      expect(vectorSync.deleteDocuments).toHaveBeenCalled();
      const call = (vectorSync.deleteDocuments as any).mock.calls[0];
      expect(call[0]).toEqual([30, 31]);
      expect(call[1]).toBe("observation");
    });
  });

  describe("vector deletion errors", () => {
    it("should log error but not block SQLite deletion when vectorSync fails", async () => {
      const observations = [
        { id: 40, created_at_epoch: oldEpoch, project: "test", type: "discovery" },
      ];
      const db = createMockDb(observations);
      const dbManager = createMockDbManager(db);
      const vectorSync = createMockVectorSync(true);

      const service = new RetentionService(dbManager, vectorSync);
      const result = await service.run({
        enabled: true,
        maxAgeDays: 30,
        maxCount: 0,
        excludeTypes: [],
        softDelete: false,
      });

      expect(result.deleted).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("vectorSync=null", () => {
    it("should skip vector deletion without error when vectorSync is null", async () => {
      const observations = [
        { id: 50, created_at_epoch: oldEpoch, project: "test", type: "discovery" },
      ];
      const db = createMockDb(observations);
      const dbManager = createMockDbManager(db);

      const service = new RetentionService(dbManager, undefined);
      const result = await service.run({
        enabled: true,
        maxAgeDays: 30,
        maxCount: 0,
        excludeTypes: [],
        softDelete: false,
      });

      expect(result.deleted).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("DatabaseManager.getVectorSyncOrNull", () => {
    it("should return null when vectorSync is not initialized", () => {
      const { DatabaseManager } = require("../../../../src/services/worker/DatabaseManager.js");
      const dm = new DatabaseManager();
      expect(dm.getVectorSyncOrNull()).toBeNull();
    });
  });

  describe("dry run", () => {
    it("should not call vectorSync.deleteDocuments during dry run", async () => {
      const observations = [
        { id: 60, created_at_epoch: oldEpoch, project: "test", type: "discovery" },
      ];
      const db = createMockDb(observations);
      const dbManager = createMockDbManager(db);
      const vectorSync = createMockVectorSync();

      const service = new RetentionService(dbManager, vectorSync);
      await service.run(
        {
          enabled: true,
          maxAgeDays: 30,
          maxCount: 0,
          excludeTypes: [],
          softDelete: false,
        },
        true,
      );

      expect(vectorSync.deleteDocuments).not.toHaveBeenCalled();
    });
  });
});
