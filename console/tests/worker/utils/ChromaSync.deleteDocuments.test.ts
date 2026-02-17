/**
 * Behavioral tests for ChromaSync.deleteDocuments.
 * Verifies correct document ID generation, batch splitting, and MCP tool calls.
 */
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ChromaSync } from "../../../src/services/sync/ChromaSync.js";

const mockConnect = mock(async () => {});
const mockClose = mock(async () => {});
const mockCallTool = mock(async (_args: unknown) => ({
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

describe("ChromaSync.deleteDocuments", () => {
  let callToolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;

  beforeEach(() => {
    mockConnect.mockReset();
    mockClose.mockReset();
    mockCallTool.mockReset();
    callToolCalls = [];

    mockConnect.mockImplementation(async () => {});
    mockCallTool.mockImplementation(async (args: unknown) => {
      const typedArgs = args as { name: string; arguments: Record<string, unknown> };
      callToolCalls.push(typedArgs);

      if (typedArgs.name === "chroma_get_collection_info") {
        return { content: [{ type: "text", text: '{"name":"cm__test"}' }] };
      }
      return { content: [{ type: "text", text: "{}" }] };
    });
  });

  it("should generate 202 ChromaDB IDs per observation (narrative + text + 200 facts)", async () => {
    const sync = new ChromaSync("test");
    const result = await sync.deleteDocuments([42], "observation");

    const deleteCalls = callToolCalls.filter(
      (c) => c.name === "chroma_delete_documents",
    );
    const allIds = deleteCalls.flatMap(
      (c) => c.arguments.ids as string[],
    );

    expect(allIds).toContain("obs_42_narrative");
    expect(allIds).toContain("obs_42_text");
    expect(allIds).toContain("obs_42_fact_0");
    expect(allIds).toContain("obs_42_fact_199");
    expect(allIds).not.toContain("obs_42_fact_200");
    expect(allIds.length).toBe(202);

    await sync.close();
  });

  it("should generate correct IDs for session summaries", async () => {
    const sync = new ChromaSync("test");
    await sync.deleteDocuments([7], "session_summary");

    const deleteCalls = callToolCalls.filter(
      (c) => c.name === "chroma_delete_documents",
    );
    const allIds = deleteCalls.flatMap(
      (c) => c.arguments.ids as string[],
    );

    expect(allIds).toContain("summary_7_request");
    expect(allIds).toContain("summary_7_investigated");
    expect(allIds).toContain("summary_7_learned");
    expect(allIds).toContain("summary_7_completed");
    expect(allIds).toContain("summary_7_next_steps");
    expect(allIds).toContain("summary_7_notes");
    expect(allIds.length).toBe(6);

    await sync.close();
  });

  it("should generate correct IDs for user prompts", async () => {
    const sync = new ChromaSync("test");
    await sync.deleteDocuments([3], "user_prompt");

    const deleteCalls = callToolCalls.filter(
      (c) => c.name === "chroma_delete_documents",
    );
    const allIds = deleteCalls.flatMap(
      (c) => c.arguments.ids as string[],
    );

    expect(allIds).toEqual(["prompt_3"]);

    await sync.close();
  });

  it("should batch deletions into groups of BATCH_SIZE (100)", async () => {
    const sync = new ChromaSync("test");
    await sync.deleteDocuments([1], "observation");

    const deleteCalls = callToolCalls.filter(
      (c) => c.name === "chroma_delete_documents",
    );

    expect(deleteCalls.length).toBe(3);
    expect((deleteCalls[0].arguments.ids as string[]).length).toBe(100);
    expect((deleteCalls[1].arguments.ids as string[]).length).toBe(100);
    expect((deleteCalls[2].arguments.ids as string[]).length).toBe(2);

    await sync.close();
  });

  it("should return 0 for empty input", async () => {
    const sync = new ChromaSync("test");
    const result = await sync.deleteDocuments([], "observation");

    expect(result).toBe(0);
    const deleteCalls = callToolCalls.filter(
      (c) => c.name === "chroma_delete_documents",
    );
    expect(deleteCalls.length).toBe(0);

    await sync.close();
  });

  it("should handle multiple SQLite IDs", async () => {
    const sync = new ChromaSync("test");
    await sync.deleteDocuments([1, 2], "user_prompt");

    const deleteCalls = callToolCalls.filter(
      (c) => c.name === "chroma_delete_documents",
    );
    const allIds = deleteCalls.flatMap(
      (c) => c.arguments.ids as string[],
    );

    expect(allIds).toContain("prompt_1");
    expect(allIds).toContain("prompt_2");
    expect(allIds.length).toBe(2);

    await sync.close();
  });
});
