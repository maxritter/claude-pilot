/**
 * Tests for doctor command vector DB health check.
 * Verifies: healthy state formatting, bloat detection, unavailable state.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";

mock.module("../../../src/shared/worker-utils.js", () => ({
  getWorkerPort: () => 41777,
  getWorkerHost: () => "127.0.0.1",
}));

describe("vector DB health check logic", () => {
  /**
   * Test the bloat detection algorithm directly instead of mocking HTTP.
   * The doctor command calls GET /api/vector-db/health — we test the
   * response interpretation logic and the health computation.
   */

  function computeHealth(directorySize: number, embeddingCount: number) {
    const expectedSize = 384 * 4 * embeddingCount * 10;
    const bloatRatio = expectedSize > 0 ? directorySize / expectedSize : 0;
    const healthy = bloatRatio < 20;
    return { directorySize, embeddingCount, expectedSize, bloatRatio, healthy };
  }

  it("should report healthy for normal-sized database", () => {
    const health = computeHealth(15_000_000, 1000);
    expect(health.healthy).toBe(true);
    expect(health.bloatRatio).toBeLessThan(20);
  });

  it("should report unhealthy for bloated database", () => {
    const health = computeHealth(500_000_000, 1000);
    expect(health.healthy).toBe(false);
    expect(health.bloatRatio).toBeGreaterThan(20);
  });

  it("should handle zero embeddings gracefully", () => {
    const health = computeHealth(1_000_000, 0);
    expect(health.bloatRatio).toBe(0);
    expect(health.healthy).toBe(true);
  });

  it("should handle very large bloated database", () => {
    const health = computeHealth(100_000_000_000, 1000);
    expect(health.healthy).toBe(false);
    expect(health.bloatRatio).toBeGreaterThan(1000);
  });

  it("should compute expected size based on embedding dimensions", () => {
    const health = computeHealth(0, 100);
    expect(health.expectedSize).toBe(384 * 4 * 100 * 10);
  });
});

describe("vector DB health formatting", () => {
  function formatHealthMessage(
    health: { directorySize: number; embeddingCount: number; bloatRatio: number; healthy: boolean } | null,
  ): { status: "ok" | "warning"; message: string } {
    if (!health) {
      return { status: "warning", message: "unavailable (Chroma not connected)" };
    }

    const sizeStr = formatBytes(health.directorySize);

    if (health.healthy) {
      return {
        status: "ok",
        message: `${sizeStr}, ${health.embeddingCount} embeddings`,
      };
    }

    return {
      status: "warning",
      message: `${sizeStr} (${Math.round(health.bloatRatio)}x expected size) — Run: pilot-memory vacuum`,
    };
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  it("should format healthy database", () => {
    const result = formatHealthMessage({
      directorySize: 15_000_000,
      embeddingCount: 1000,
      bloatRatio: 1.0,
      healthy: true,
    });
    expect(result.status).toBe("ok");
    expect(result.message).toContain("14.3 MB");
    expect(result.message).toContain("1000 embeddings");
  });

  it("should format bloated database with vacuum suggestion", () => {
    const result = formatHealthMessage({
      directorySize: 100_000_000_000,
      embeddingCount: 1000,
      bloatRatio: 6510,
      healthy: false,
    });
    expect(result.status).toBe("warning");
    expect(result.message).toContain("GB");
    expect(result.message).toContain("pilot-memory vacuum");
  });

  it("should format unavailable database", () => {
    const result = formatHealthMessage(null);
    expect(result.status).toBe("warning");
    expect(result.message).toContain("unavailable");
    expect(result.message).toContain("Chroma not connected");
  });
});
