/**
 * Auto-Retention Scheduler Tests
 *
 * Tests that retention cleanup runs automatically and the maxCount default is updated.
 * Validates scheduler lifecycle: start, stop, re-entrant safety.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";

describe("Auto-Retention", () => {
  describe("maxCount default updated to 5000", () => {
    it("has CLAUDE_PILOT_RETENTION_MAX_COUNT set to 5000", async () => {
      const { SettingsDefaultsManager } = await import(
        "../../src/shared/SettingsDefaultsManager.js"
      );
      const defaults = SettingsDefaultsManager.getAllDefaults();
      expect(defaults.CLAUDE_PILOT_RETENTION_MAX_COUNT).toBe("5000");
    });
  });

  describe("RetentionScheduler", () => {
    it("exports startRetentionScheduler and stopRetentionScheduler", async () => {
      const mod = await import(
        "../../src/services/worker/RetentionScheduler.js"
      );
      expect(mod.startRetentionScheduler).toBeDefined();
      expect(typeof mod.startRetentionScheduler).toBe("function");
      expect(mod.stopRetentionScheduler).toBeDefined();
      expect(typeof mod.stopRetentionScheduler).toBe("function");
    });

    it("stopRetentionScheduler can be called safely when no scheduler is running", async () => {
      const { stopRetentionScheduler } = await import(
        "../../src/services/worker/RetentionScheduler.js"
      );
      expect(() => stopRetentionScheduler()).not.toThrow();
    });

    it("startRetentionScheduler sets a startup timeout", async () => {
      const { startRetentionScheduler, stopRetentionScheduler } = await import(
        "../../src/services/worker/RetentionScheduler.js"
      );

      const setTimeoutSpy = spyOn(globalThis, "setTimeout");
      const mockDbManager = {} as any;

      try {
        startRetentionScheduler(mockDbManager);

        const calls = setTimeoutSpy.mock.calls;
        const startupCall = calls.find(
          (call) => call[1] === 30_000
        );
        expect(startupCall).toBeDefined();
      } finally {
        stopRetentionScheduler();
        setTimeoutSpy.mockRestore();
      }
    });

    it("stopRetentionScheduler clears all timers after start", async () => {
      const { startRetentionScheduler, stopRetentionScheduler } = await import(
        "../../src/services/worker/RetentionScheduler.js"
      );

      const clearTimeoutSpy = spyOn(globalThis, "clearTimeout");
      const mockDbManager = {} as any;

      try {
        startRetentionScheduler(mockDbManager);
        stopRetentionScheduler();

        expect(clearTimeoutSpy).toHaveBeenCalled();
      } finally {
        clearTimeoutSpy.mockRestore();
      }
    });

    it("calling startRetentionScheduler twice stops previous scheduler first", async () => {
      const { startRetentionScheduler, stopRetentionScheduler } = await import(
        "../../src/services/worker/RetentionScheduler.js"
      );

      const clearTimeoutSpy = spyOn(globalThis, "clearTimeout");
      const mockDbManager = {} as any;

      try {
        startRetentionScheduler(mockDbManager);
        startRetentionScheduler(mockDbManager);

        expect(clearTimeoutSpy).toHaveBeenCalled();
      } finally {
        stopRetentionScheduler();
        clearTimeoutSpy.mockRestore();
      }
    });
  });
});
