/**
 * Tests for ChromaConnectionManager: mutex serialization and circuit breaker.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ChromaConnectionManager } from "../../../../src/services/sync/ChromaConnectionManager.js";

const mockConnect = mock(async () => {});
const mockClose = mock(async () => {});
const mockCallTool = mock(async () => ({ content: [{ text: '{"name":"test"}' }] }));
const mockListTools = mock(async () => ({ tools: [] }));

mock.module("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class MockClient {
    connect = mockConnect;
    close = mockClose;
    callTool = mockCallTool;
    listTools = mockListTools;
  },
}));

mock.module("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: class MockTransport {
    close = mockClose;
  },
}));

mock.module("child_process", () => ({
  spawnSync: () => ({ status: 0, stdout: "1.0.0", stderr: "" }),
}));

describe("ChromaConnectionManager", () => {
  beforeEach(() => {
    mockConnect.mockReset();
    mockClose.mockReset();
    mockConnect.mockImplementation(async () => {});
  });

  describe("connection mutex", () => {
    it("should serialize concurrent ensureConnection calls", async () => {
      const manager = new ChromaConnectionManager("test-project");
      let connectCount = 0;
      mockConnect.mockImplementation(async () => {
        connectCount++;
        await new Promise((r) => setTimeout(r, 50));
      });

      const results = await Promise.all([
        manager.getClient(),
        manager.getClient(),
        manager.getClient(),
      ]);

      expect(connectCount).toBe(1);
      expect(results[0]).toBeTruthy();
      expect(results[1]).toBeTruthy();
      expect(results[2]).toBeTruthy();

      await manager.close();
    });

    it("should allow reconnection after close", async () => {
      const manager = new ChromaConnectionManager("test-project");
      let connectCount = 0;
      mockConnect.mockImplementation(async () => { connectCount++; });

      await manager.getClient();
      expect(connectCount).toBe(1);

      await manager.close();
      await manager.getClient();
      expect(connectCount).toBe(2);

      await manager.close();
    });
  });

  describe("circuit breaker", () => {
    it("should open after 3 consecutive failures", async () => {
      const manager = new ChromaConnectionManager("test-project");
      mockConnect.mockImplementation(async () => {
        throw new Error("Connection refused");
      });

      for (let i = 0; i < 3; i++) {
        try { await manager.getClient(); } catch {}
      }

      try {
        await manager.getClient();
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toContain("Circuit breaker open");
      }

      await manager.close();
    });

    it("should reset after successful connection", async () => {
      const manager = new ChromaConnectionManager("test-project");
      let callCount = 0;
      mockConnect.mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) throw new Error("Connection refused");
      });

      try { await manager.getClient(); } catch {}
      try { await manager.getClient(); } catch {}

      const client = await manager.getClient();
      expect(client).toBeTruthy();

      mockConnect.mockImplementation(async () => {});
      const client2 = await manager.getClient();
      expect(client2).toBeTruthy();

      await manager.close();
    });

    it("should allow half-open retry after cooldown", async () => {
      const manager = new ChromaConnectionManager("test-project", { cooldownMs: 100 });
      mockConnect.mockImplementation(async () => {
        throw new Error("Connection refused");
      });

      for (let i = 0; i < 3; i++) {
        try { await manager.getClient(); } catch {}
      }

      await new Promise((r) => setTimeout(r, 150));

      mockConnect.mockImplementation(async () => {});
      const client = await manager.getClient();
      expect(client).toBeTruthy();

      await manager.close();
    });
  });

  describe("isHealthy", () => {
    it("should return true when connected", async () => {
      const manager = new ChromaConnectionManager("test-project");
      await manager.getClient();
      expect(await manager.isHealthy()).toBe(true);
      await manager.close();
    });

    it("should return false when not connected", async () => {
      const manager = new ChromaConnectionManager("test-project");
      expect(await manager.isHealthy()).toBe(false);
    });
  });

  describe("getCollectionName", () => {
    it("should return cm__<project>", () => {
      const manager = new ChromaConnectionManager("my-project");
      expect(manager.getCollectionName()).toBe("cm__my-project");
    });
  });
});
