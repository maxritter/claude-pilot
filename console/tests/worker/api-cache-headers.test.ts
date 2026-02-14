/**
 * Tests for API cache headers - ensures dynamic API responses are never cached
 *
 * Mock Justification: Code-inspection pattern (readFileSync + string assertions)
 * Tests that BaseRouteHandler.wrapHandler sets Cache-Control: no-store on all API responses.
 *
 * Value: Prevents stale data in the viewer UI (e.g., spec progress not updating)
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import path from "path";

const BASE_ROUTE_HANDLER_PATH = path.resolve(
  import.meta.dir,
  "../../src/services/worker/http/BaseRouteHandler.ts",
);

describe("API cache headers", () => {
  const source = readFileSync(BASE_ROUTE_HANDLER_PATH, "utf-8");

  it("should set Cache-Control: no-store in wrapHandler", () => {
    expect(source).toContain("Cache-Control");
    expect(source).toContain("no-store");
  });

  it("should set cache header before handler execution", () => {
    const wrapHandlerBody = source.slice(
      source.indexOf("wrapHandler("),
      source.indexOf("protected parseIntParam"),
    );
    const cacheHeaderIndex = wrapHandlerBody.indexOf("no-store");
    const handlerCallIndex = wrapHandlerBody.indexOf("handler(req, res)");
    expect(cacheHeaderIndex).toBeGreaterThan(-1);
    expect(handlerCallIndex).toBeGreaterThan(-1);
    expect(cacheHeaderIndex).toBeLessThan(handlerCallIndex);
  });
});
