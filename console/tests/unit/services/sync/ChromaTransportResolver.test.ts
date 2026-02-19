/**
 * Tests for ChromaTransportResolver - transport option resolution.
 * Extracted from ChromaConnectionManager.venv.test.ts.
 */

import { describe, it, expect } from "bun:test";
import { resolveTransportOptions } from "../../../../src/services/sync/ChromaTransportResolver.js";
import type { TransportOptions } from "../../../../src/services/sync/ChromaTransportResolver.js";

describe("resolveTransportOptions", () => {
  it("should export TransportOptions interface with required fields", () => {
    const opts: TransportOptions = {
      command: "test",
      args: ["--foo"],
      stderr: "ignore",
    };
    expect(opts.command).toBe("test");
    expect(opts.stderr).toBe("ignore");
  });

  it("should be a function", () => {
    expect(typeof resolveTransportOptions).toBe("function");
  });
});
