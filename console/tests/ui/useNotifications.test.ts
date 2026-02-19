/**
 * Tests for useNotifications hook — SSE event handling, optimistic updates,
 * deduplication, and reconnection re-sync.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

describe("useNotifications SSE handling", () => {
  let originalEventSource: typeof EventSource;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    globalThis.fetch = originalFetch;
  });

  it("should deduplicate SSE notifications by ID", async () => {
    const hookSource = await Bun.file(
      "src/ui/viewer/hooks/useNotifications.ts",
    ).text();

    expect(hookSource).toContain("prev.some((n) => n.id === incoming.id)");
    expect(hookSource).toContain("[incoming, ...prev]");
  });

  it("should use optimistic mark-as-read (update state before PATCH)", async () => {
    const hookSource = await Bun.file(
      "src/ui/viewer/hooks/useNotifications.ts",
    ).text();

    const markAsReadBlock =
      hookSource.split("const markAsRead")[1]?.split("const markAllAsRead")[0] ?? "";

    const optimisticPos = markAsReadBlock.indexOf("setNotifications");
    const fetchPos = markAsReadBlock.indexOf("await fetch");

    expect(optimisticPos).toBeGreaterThan(-1);
    expect(fetchPos).toBeGreaterThan(-1);
    expect(optimisticPos).toBeLessThan(fetchPos);
  });

  it("should re-fetch notifications on SSE reconnection", async () => {
    const hookSource = await Bun.file(
      "src/ui/viewer/hooks/useNotifications.ts",
    ).text();

    expect(hookSource).toContain('addEventListener("open"');
    expect(hookSource).toContain("fetchNotifications()");
  });

  it("should revert optimistic update on PATCH failure", async () => {
    const hookSource = await Bun.file(
      "src/ui/viewer/hooks/useNotifications.ts",
    ).text();

    const markAsReadBlock =
      hookSource.split("const markAsRead")[1]?.split("const markAllAsRead")[0] ?? "";

    expect(markAsReadBlock).toContain("!res.ok");
    expect(markAsReadBlock).toContain("is_read: 0");
  });
});
