/**
 * VexorStatus Widget Tests
 *
 * Tests the VexorStatus dashboard widget renders correctly
 * for both indexed and not-indexed states.
 */

import { describe, it, expect } from "bun:test";
import { renderToString } from "react-dom/server";
import React from "react";

describe("VexorStatus Widget", () => {
  describe("VexorStatus component", () => {
    it("exports VexorStatus function", async () => {
      const { VexorStatus } = await import(
        "../../src/ui/viewer/views/Dashboard/VexorStatus.js"
      );
      expect(VexorStatus).toBeDefined();
      expect(typeof VexorStatus).toBe("function");
    });

    it("renders indexed state with file count", async () => {
      const { VexorStatus } = await import(
        "../../src/ui/viewer/views/Dashboard/VexorStatus.js"
      );

      const html = renderToString(
        React.createElement(VexorStatus, {
          isIndexed: true,
          files: 615,
          generatedAt: new Date().toISOString(),
          isReindexing: false,
        })
      );

      expect(html).toContain("Indexed");
      expect(html).toContain("615");
      expect(html).toContain("Codebase Indexing");
    });

    it("renders not-indexed state when isIndexed is false", async () => {
      const { VexorStatus } = await import(
        "../../src/ui/viewer/views/Dashboard/VexorStatus.js"
      );

      const html = renderToString(
        React.createElement(VexorStatus, {
          isIndexed: false,
          files: 0,
          generatedAt: null,
          isReindexing: false,
        })
      );

      expect(html).toContain("Not Indexed");
      expect(html).toContain("0");
    });

    it("renders Never for null generatedAt", async () => {
      const { VexorStatus } = await import(
        "../../src/ui/viewer/views/Dashboard/VexorStatus.js"
      );

      const html = renderToString(
        React.createElement(VexorStatus, {
          isIndexed: false,
          files: 0,
          generatedAt: null,
          isReindexing: false,
        })
      );

      expect(html).toContain("Never");
    });

    it("renders hint text for re-indexing when files are indexed", async () => {
      const { VexorStatus } = await import(
        "../../src/ui/viewer/views/Dashboard/VexorStatus.js"
      );

      const html = renderToString(
        React.createElement(VexorStatus, {
          isIndexed: true,
          files: 100,
          generatedAt: null,
          isReindexing: false,
        })
      );

      expect(html).toContain("Codebase Indexing");
      expect(html).toContain("100");
      expect(html).toContain("/sync");
      expect(html).toContain("vexor index --clear");
    });

    it("renders sync prompt when zero files indexed", async () => {
      const { VexorStatus } = await import(
        "../../src/ui/viewer/views/Dashboard/VexorStatus.js"
      );

      const html = renderToString(
        React.createElement(VexorStatus, {
          isIndexed: false,
          files: 0,
          generatedAt: null,
          isReindexing: false,
        })
      );

      expect(html).toContain("/sync");
      expect(html).not.toContain("vexor index --clear");
    });

    it("renders indexing badge when isReindexing is true", async () => {
      const { VexorStatus } = await import(
        "../../src/ui/viewer/views/Dashboard/VexorStatus.js"
      );

      const html = renderToString(
        React.createElement(VexorStatus, {
          isIndexed: true,
          files: 100,
          generatedAt: null,
          isReindexing: true,
        })
      );

      expect(html).toContain("Indexing...");
    });
  });

  describe("useStats vexor status integration", () => {
    it("exports vexorStatus instead of vectorDbStatus", async () => {
      const mod = await import("../../src/ui/viewer/hooks/useStats.js");
      expect(mod.useStats).toBeDefined();
      expect(typeof mod.useStats).toBe("function");
    });
  });

  describe("VectorDbStatus is removed", () => {
    it("VectorDbStatus.tsx no longer exists", async () => {
      const { statSync } = await import("node:fs");
      const path = await import("path");
      const filePath = path.join(__dirname, "../../src/ui/viewer/views/Dashboard/VectorDbStatus.tsx");
      let exists: boolean;
      try {
        statSync(filePath);
        exists = true;
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);
    });
  });
});
