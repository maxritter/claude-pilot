/**
 * Tests for ChromaSync.vacuum() — HNSW index rebuild.
 * Verifies: collection delete + recreate, backfill call, partial failure handling.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ChromaSync } from "../../../../src/services/sync/ChromaSync.js";

const mockConnect = mock(async () => {});
const mockClose = mock(async () => {});
const mockCallTool = mock(async (_args: any) => ({
  content: [{ type: "text", text: '{"name":"test"}' }],
}));

mock.module("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class MockClient {
    connect = mockConnect;
    close = mockClose;
    callTool = mockCallTool;
    listTools = mock(async () => ({ tools: [] }));
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

mock.module("../../../../src/services/sqlite/SessionStore.js", () => ({
  SessionStore: class MockSessionStore {
    db = {
      prepare: () => ({
        all: () => [],
        get: () => ({ count: 0 }),
      }),
    };
    close = mock(() => {});
  },
}));

describe("ChromaSync.vacuum", () => {
  let callToolCalls: any[];

  beforeEach(() => {
    mockConnect.mockReset();
    mockClose.mockReset();
    mockCallTool.mockReset();
    callToolCalls = [];

    mockConnect.mockImplementation(async () => {});
    mockCallTool.mockImplementation(async (args: any) => {
      callToolCalls.push(args);

      if (args.name === "chroma_get_collection_info") {
        return { content: [{ type: "text", text: '{"name":"cm__test"}' }] };
      }
      if (args.name === "chroma_delete_collection") {
        return { content: [{ type: "text", text: '{"status":"deleted"}' }] };
      }
      if (args.name === "chroma_create_collection") {
        return { content: [{ type: "text", text: '{"name":"cm__test"}' }] };
      }
      if (args.name === "chroma_get_documents") {
        return { content: [{ type: "text", text: '{"metadatas":[]}' }] };
      }
      return { content: [{ type: "text", text: "{}" }] };
    });
  });

  it("should delete collection, recreate, and backfill", async () => {
    const sync = new ChromaSync("test");
    const result = await sync.vacuum();

    const toolNames = callToolCalls.map((c: any) => c.name);
    expect(toolNames).toContain("chroma_delete_collection");
    expect(toolNames).toContain("chroma_create_collection");

    const deleteIdx = toolNames.indexOf("chroma_delete_collection");
    const createIdx = toolNames.indexOf("chroma_create_collection");
    expect(deleteIdx).toBeLessThan(createIdx);

    expect(result.deletedDocuments).toBeGreaterThanOrEqual(0);
    expect(result.reindexedDocuments).toBeGreaterThanOrEqual(0);

    await sync.close();
  });

  it("should use the correct collection name", async () => {
    const sync = new ChromaSync("my-project");
    await sync.vacuum();

    const deleteCall = callToolCalls.find((c: any) => c.name === "chroma_delete_collection");
    expect(deleteCall.arguments.collection_name).toBe("cm__my-project");

    const createCall = callToolCalls.find((c: any) => c.name === "chroma_create_collection");
    expect(createCall.arguments.collection_name).toBe("cm__my-project");

    await sync.close();
  });

  it("should return partial result on backfill failure", async () => {
    let callCount = 0;
    mockCallTool.mockImplementation(async (args: any) => {
      callToolCalls.push(args);
      callCount++;

      if (args.name === "chroma_delete_collection") {
        return { content: [{ type: "text", text: '{"status":"deleted"}' }] };
      }
      if (args.name === "chroma_create_collection") {
        return { content: [{ type: "text", text: '{"name":"cm__test"}' }] };
      }
      if (args.name === "chroma_get_collection_info") {
        if (callCount > 3) {
          throw new Error("Connection lost");
        }
        return { content: [{ type: "text", text: '{"name":"cm__test"}' }] };
      }
      if (args.name === "chroma_get_documents") {
        throw new Error("Connection lost during backfill");
      }
      return { content: [{ type: "text", text: "{}" }] };
    });

    const sync = new ChromaSync("test");
    const result = await sync.vacuum();

    expect(result.error).toBeDefined();
    expect(result.error).toContain("run again");

    await sync.close();
  });

  it("should throw if collection deletion fails", async () => {
    mockCallTool.mockImplementation(async (args: any) => {
      callToolCalls.push(args);

      if (args.name === "chroma_get_collection_info") {
        return { content: [{ type: "text", text: '{"name":"cm__test"}' }] };
      }
      if (args.name === "chroma_delete_collection") {
        throw new Error("Permission denied");
      }
      return { content: [{ type: "text", text: "{}" }] };
    });

    const sync = new ChromaSync("test");
    try {
      await sync.vacuum();
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain("Permission denied");
    }

    await sync.close();
  });
});
