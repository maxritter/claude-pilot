/**
 * ChromaSync Service
 *
 * Automatically syncs observations and session summaries to ChromaDB via MCP.
 * This service provides real-time semantic search capabilities by maintaining
 * a vector database synchronized with SQLite.
 *
 * Design: Fail-fast with no fallbacks - if Chroma is unavailable, syncing fails.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ParsedObservation, ParsedSummary } from "../../sdk/parser.js";
import { SessionStore } from "../sqlite/SessionStore.js";
import { logger } from "../../utils/logger.js";
import {
  IVectorSync,
  VectorMetadata,
  VectorQueryResult,
} from "./IVectorSync.js";
import { ChromaConnectionManager } from "./ChromaConnectionManager.js";

interface ChromaDocument {
  id: string;
  document: string;
  metadata: Record<string, string | number>;
}

/** MCP tool response content item */
interface McpContentItem {
  type: string;
  text?: string;
}

/** MCP tool response */
interface McpToolResult {
  content: McpContentItem[];
}

interface StoredObservation {
  id: number;
  memory_session_id: string;
  project: string;
  text: string | null;
  type: string;
  title: string | null;
  subtitle: string | null;
  facts: string | null;
  narrative: string | null;
  concepts: string | null;
  files_read: string | null;
  files_modified: string | null;
  prompt_number: number;
  discovery_tokens: number;
  created_at: string;
  created_at_epoch: number;
}

interface StoredSummary {
  id: number;
  memory_session_id: string;
  project: string;
  request: string | null;
  investigated: string | null;
  learned: string | null;
  completed: string | null;
  next_steps: string | null;
  notes: string | null;
  prompt_number: number;
  discovery_tokens: number;
  created_at: string;
  created_at_epoch: number;
}

interface StoredUserPrompt {
  id: number;
  content_session_id: string;
  prompt_number: number;
  prompt_text: string;
  created_at: string;
  created_at_epoch: number;
  memory_session_id: string;
  project: string;
}

export class ChromaSync implements IVectorSync {
  private readonly connectionManager: ChromaConnectionManager;
  private project: string;
  private collectionName: string;
  private readonly BATCH_SIZE = 100;

  constructor(project: string) {
    this.project = project;
    this.collectionName = `cm__${project}`;
    this.connectionManager = new ChromaConnectionManager(project);
  }

  /**
   * Get connected MCP client via ChromaConnectionManager.
   * Handles mutex serialization, circuit breaker, and transport lifecycle.
   */
  private async getClient(): Promise<Client> {
    return this.connectionManager.getClient();
  }

  /**
   * Invalidate current connection (e.g. after detecting a mid-use connection loss).
   * The next getClient() call will establish a fresh connection.
   */
  private async invalidateConnection(): Promise<void> {
    await this.connectionManager.close();
  }

  /**
   * Ensure collection exists, create if needed
   * Throws error if collection creation fails
   */
  private async ensureCollection(): Promise<Client> {
    const client = await this.getClient();

    try {
      await client.callTool({
        name: "chroma_get_collection_info",
        arguments: {
          collection_name: this.collectionName,
        },
      });

      logger.debug("CHROMA_SYNC", "Collection exists", {
        collection: this.collectionName,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isConnectionError =
        errorMessage.includes("Not connected") ||
        errorMessage.includes("Connection closed") ||
        errorMessage.includes("MCP error -32000");

      if (isConnectionError) {
        const recovered =
          await this.connectionManager.recoverFromCorruptedDatabase();
        if (recovered) {
          logger.warn(
            "CHROMA_SYNC",
            "Corruption recovery triggered, retrying collection check",
          );
          return this.ensureCollection();
        }

        await this.invalidateConnection();
        logger.error(
          "CHROMA_SYNC",
          "Connection lost during collection check",
          { collection: this.collectionName },
          error as Error,
        );
        throw new Error(`Chroma connection lost: ${errorMessage}`);
      }

      logger.error(
        "CHROMA_SYNC",
        "Collection check failed, attempting to create",
        { collection: this.collectionName },
        error as Error,
      );
      logger.info("CHROMA_SYNC", "Creating collection", {
        collection: this.collectionName,
      });

      try {
        await client.callTool({
          name: "chroma_create_collection",
          arguments: {
            collection_name: this.collectionName,
            embedding_function_name: "default",
          },
        });

        logger.info("CHROMA_SYNC", "Collection created", {
          collection: this.collectionName,
        });
      } catch (createError) {
        logger.error(
          "CHROMA_SYNC",
          "Failed to create collection",
          { collection: this.collectionName },
          createError as Error,
        );
        throw new Error(
          `Collection creation failed: ${createError instanceof Error ? createError.message : String(createError)}`,
        );
      }
    }

    return client;
  }

  /**
   * Format observation into Chroma documents (granular approach)
   * Each semantic field becomes a separate vector document
   */
  private formatObservationDocs(obs: StoredObservation): ChromaDocument[] {
    const documents: ChromaDocument[] = [];

    const facts = obs.facts ? JSON.parse(obs.facts) : [];
    const concepts = obs.concepts ? JSON.parse(obs.concepts) : [];
    const files_read = obs.files_read ? JSON.parse(obs.files_read) : [];
    const files_modified = obs.files_modified
      ? JSON.parse(obs.files_modified)
      : [];

    const baseMetadata: Record<string, string | number> = {
      sqlite_id: obs.id,
      doc_type: "observation",
      memory_session_id: obs.memory_session_id,
      project: obs.project,
      created_at_epoch: obs.created_at_epoch,
      type: obs.type || "discovery",
      title: obs.title || "Untitled",
    };

    if (obs.subtitle) {
      baseMetadata.subtitle = obs.subtitle;
    }
    if (concepts.length > 0) {
      baseMetadata.concepts = concepts.join(",");
    }
    if (files_read.length > 0) {
      baseMetadata.files_read = files_read.join(",");
    }
    if (files_modified.length > 0) {
      baseMetadata.files_modified = files_modified.join(",");
    }

    if (obs.narrative) {
      documents.push({
        id: `obs_${obs.id}_narrative`,
        document: obs.narrative,
        metadata: { ...baseMetadata, field_type: "narrative" },
      });
    }

    if (obs.text) {
      documents.push({
        id: `obs_${obs.id}_text`,
        document: obs.text,
        metadata: { ...baseMetadata, field_type: "text" },
      });
    }

    facts.forEach((fact: string, index: number) => {
      documents.push({
        id: `obs_${obs.id}_fact_${index}`,
        document: fact,
        metadata: { ...baseMetadata, field_type: "fact", fact_index: index },
      });
    });

    return documents;
  }

  /**
   * Format summary into Chroma documents (granular approach)
   * Each summary field becomes a separate vector document
   */
  private formatSummaryDocs(summary: StoredSummary): ChromaDocument[] {
    const documents: ChromaDocument[] = [];

    const baseMetadata: Record<string, string | number> = {
      sqlite_id: summary.id,
      doc_type: "session_summary",
      memory_session_id: summary.memory_session_id,
      project: summary.project,
      created_at_epoch: summary.created_at_epoch,
      prompt_number: summary.prompt_number || 0,
    };

    if (summary.request) {
      documents.push({
        id: `summary_${summary.id}_request`,
        document: summary.request,
        metadata: { ...baseMetadata, field_type: "request" },
      });
    }

    if (summary.investigated) {
      documents.push({
        id: `summary_${summary.id}_investigated`,
        document: summary.investigated,
        metadata: { ...baseMetadata, field_type: "investigated" },
      });
    }

    if (summary.learned) {
      documents.push({
        id: `summary_${summary.id}_learned`,
        document: summary.learned,
        metadata: { ...baseMetadata, field_type: "learned" },
      });
    }

    if (summary.completed) {
      documents.push({
        id: `summary_${summary.id}_completed`,
        document: summary.completed,
        metadata: { ...baseMetadata, field_type: "completed" },
      });
    }

    if (summary.next_steps) {
      documents.push({
        id: `summary_${summary.id}_next_steps`,
        document: summary.next_steps,
        metadata: { ...baseMetadata, field_type: "next_steps" },
      });
    }

    if (summary.notes) {
      documents.push({
        id: `summary_${summary.id}_notes`,
        document: summary.notes,
        metadata: { ...baseMetadata, field_type: "notes" },
      });
    }

    return documents;
  }

  /**
   * Add documents to Chroma in batch
   * Throws error if batch add fails
   */
  private async addDocuments(documents: ChromaDocument[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    const client = await this.ensureCollection();

    try {
      await client.callTool({
        name: "chroma_add_documents",
        arguments: {
          collection_name: this.collectionName,
          documents: documents.map((d) => d.document),
          ids: documents.map((d) => d.id),
          metadatas: documents.map((d) => d.metadata),
        },
      });

      logger.debug("CHROMA_SYNC", "Documents added", {
        collection: this.collectionName,
        count: documents.length,
      });
    } catch (error) {
      logger.error(
        "CHROMA_SYNC",
        "Failed to add documents",
        {
          collection: this.collectionName,
          count: documents.length,
        },
        error as Error,
      );
      throw new Error(
        `Document add failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Sync a single observation to Chroma
   * Blocks until sync completes, throws on error
   */
  async syncObservation(
    observationId: number,
    memorySessionId: string,
    project: string,
    obs: ParsedObservation,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens: number = 0,
  ): Promise<void> {
    const stored: StoredObservation = {
      id: observationId,
      memory_session_id: memorySessionId,
      project: project,
      text: null,
      type: obs.type,
      title: obs.title,
      subtitle: obs.subtitle,
      facts: JSON.stringify(obs.facts),
      narrative: obs.narrative,
      concepts: JSON.stringify(obs.concepts),
      files_read: JSON.stringify(obs.files_read),
      files_modified: JSON.stringify(obs.files_modified),
      prompt_number: promptNumber,
      discovery_tokens: discoveryTokens,
      created_at: new Date(createdAtEpoch * 1000).toISOString(),
      created_at_epoch: createdAtEpoch,
    };

    const documents = this.formatObservationDocs(stored);

    logger.info("CHROMA_SYNC", "Syncing observation", {
      observationId,
      documentCount: documents.length,
      project,
    });

    await this.addDocuments(documents);
  }

  /**
   * Sync a single summary to Chroma
   * Blocks until sync completes, throws on error
   */
  async syncSummary(
    summaryId: number,
    memorySessionId: string,
    project: string,
    summary: ParsedSummary,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens: number = 0,
  ): Promise<void> {
    const stored: StoredSummary = {
      id: summaryId,
      memory_session_id: memorySessionId,
      project: project,
      request: summary.request,
      investigated: summary.investigated,
      learned: summary.learned,
      completed: summary.completed,
      next_steps: summary.next_steps,
      notes: summary.notes,
      prompt_number: promptNumber,
      discovery_tokens: discoveryTokens,
      created_at: new Date(createdAtEpoch * 1000).toISOString(),
      created_at_epoch: createdAtEpoch,
    };

    const documents = this.formatSummaryDocs(stored);

    logger.info("CHROMA_SYNC", "Syncing summary", {
      summaryId,
      documentCount: documents.length,
      project,
    });

    await this.addDocuments(documents);
  }

  /**
   * Format user prompt into Chroma document
   * Each prompt becomes a single document (unlike observations/summaries which split by field)
   */
  private formatUserPromptDoc(prompt: StoredUserPrompt): ChromaDocument {
    return {
      id: `prompt_${prompt.id}`,
      document: prompt.prompt_text,
      metadata: {
        sqlite_id: prompt.id,
        doc_type: "user_prompt",
        memory_session_id: prompt.memory_session_id,
        project: prompt.project,
        created_at_epoch: prompt.created_at_epoch,
        prompt_number: prompt.prompt_number,
      },
    };
  }

  /**
   * Sync a single user prompt to Chroma
   * Blocks until sync completes, throws on error
   */
  async syncUserPrompt(
    promptId: number,
    memorySessionId: string,
    project: string,
    promptText: string,
    promptNumber: number,
    createdAtEpoch: number,
  ): Promise<void> {
    const stored: StoredUserPrompt = {
      id: promptId,
      content_session_id: "",
      prompt_number: promptNumber,
      prompt_text: promptText,
      created_at: new Date(createdAtEpoch * 1000).toISOString(),
      created_at_epoch: createdAtEpoch,
      memory_session_id: memorySessionId,
      project: project,
    };

    const document = this.formatUserPromptDoc(stored);

    logger.info("CHROMA_SYNC", "Syncing user prompt", {
      promptId,
      project,
    });

    await this.addDocuments([document]);
  }

  /**
   * Fetch all existing document IDs from Chroma collection
   * Returns Sets of SQLite IDs for observations, summaries, and prompts
   */
  private async getExistingChromaIds(): Promise<{
    observations: Set<number>;
    summaries: Set<number>;
    prompts: Set<number>;
  }> {
    const client = await this.getClient();

    const observationIds = new Set<number>();
    const summaryIds = new Set<number>();
    const promptIds = new Set<number>();

    let offset = 0;
    const limit = 1000;

    logger.info("CHROMA_SYNC", "Fetching existing Chroma document IDs...", {
      project: this.project,
    });

    while (true) {
      try {
        const result = (await client.callTool({
          name: "chroma_get_documents",
          arguments: {
            collection_name: this.collectionName,
            limit,
            offset,
            where: { project: this.project },
            include: ["metadatas"],
          },
        })) as McpToolResult;

        const data = result.content[0];
        if (!data || data.type !== "text" || !data.text) {
          throw new Error("Unexpected response type from chroma_get_documents");
        }

        const parsed = JSON.parse(data.text);
        const metadatas = parsed.metadatas || [];

        if (metadatas.length === 0) {
          break;
        }

        for (const meta of metadatas) {
          if (meta.sqlite_id) {
            if (meta.doc_type === "observation") {
              observationIds.add(meta.sqlite_id);
            } else if (meta.doc_type === "session_summary") {
              summaryIds.add(meta.sqlite_id);
            } else if (meta.doc_type === "user_prompt") {
              promptIds.add(meta.sqlite_id);
            }
          }
        }

        offset += limit;

        logger.debug("CHROMA_SYNC", "Fetched batch of existing IDs", {
          project: this.project,
          offset,
          batchSize: metadatas.length,
        });
      } catch (error) {
        logger.error(
          "CHROMA_SYNC",
          "Failed to fetch existing IDs",
          { project: this.project },
          error as Error,
        );
        throw error;
      }
    }

    logger.info("CHROMA_SYNC", "Existing IDs fetched", {
      project: this.project,
      observations: observationIds.size,
      summaries: summaryIds.size,
      prompts: promptIds.size,
    });

    return {
      observations: observationIds,
      summaries: summaryIds,
      prompts: promptIds,
    };
  }

  /**
   * Backfill: Sync all observations missing from Chroma
   * Reads from SQLite and syncs in batches
   * Throws error if backfill fails
   */
  async ensureBackfilled(): Promise<void> {
    logger.info("CHROMA_SYNC", "Starting smart backfill", {
      project: this.project,
    });

    await this.ensureCollection();

    const existing = await this.getExistingChromaIds();

    const db = new SessionStore();

    try {
      const existingObsIds = Array.from(existing.observations);
      const obsExclusionClause =
        existingObsIds.length > 0
          ? `AND id NOT IN (${existingObsIds.join(",")})`
          : "";

      const observations = db.db
        .prepare(
          `
        SELECT * FROM observations
        WHERE project = ? ${obsExclusionClause}
        ORDER BY id ASC
      `,
        )
        .all(this.project) as StoredObservation[];

      const totalObsCount = db.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM observations WHERE project = ?
      `,
        )
        .get(this.project) as { count: number };

      logger.info("CHROMA_SYNC", "Backfilling observations", {
        project: this.project,
        missing: observations.length,
        existing: existing.observations.size,
        total: totalObsCount.count,
      });

      const allDocs: ChromaDocument[] = [];
      for (const obs of observations) {
        allDocs.push(...this.formatObservationDocs(obs));
      }

      for (let i = 0; i < allDocs.length; i += this.BATCH_SIZE) {
        const batch = allDocs.slice(i, i + this.BATCH_SIZE);
        await this.addDocuments(batch);

        logger.debug("CHROMA_SYNC", "Backfill progress", {
          project: this.project,
          progress: `${Math.min(i + this.BATCH_SIZE, allDocs.length)}/${allDocs.length}`,
        });
      }

      const existingSummaryIds = Array.from(existing.summaries);
      const summaryExclusionClause =
        existingSummaryIds.length > 0
          ? `AND id NOT IN (${existingSummaryIds.join(",")})`
          : "";

      const summaries = db.db
        .prepare(
          `
        SELECT * FROM session_summaries
        WHERE project = ? ${summaryExclusionClause}
        ORDER BY id ASC
      `,
        )
        .all(this.project) as StoredSummary[];

      const totalSummaryCount = db.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM session_summaries WHERE project = ?
      `,
        )
        .get(this.project) as { count: number };

      logger.info("CHROMA_SYNC", "Backfilling summaries", {
        project: this.project,
        missing: summaries.length,
        existing: existing.summaries.size,
        total: totalSummaryCount.count,
      });

      const summaryDocs: ChromaDocument[] = [];
      for (const summary of summaries) {
        summaryDocs.push(...this.formatSummaryDocs(summary));
      }

      for (let i = 0; i < summaryDocs.length; i += this.BATCH_SIZE) {
        const batch = summaryDocs.slice(i, i + this.BATCH_SIZE);
        await this.addDocuments(batch);

        logger.debug("CHROMA_SYNC", "Backfill progress", {
          project: this.project,
          progress: `${Math.min(i + this.BATCH_SIZE, summaryDocs.length)}/${summaryDocs.length}`,
        });
      }

      const existingPromptIds = Array.from(existing.prompts);
      const promptExclusionClause =
        existingPromptIds.length > 0
          ? `AND up.id NOT IN (${existingPromptIds.join(",")})`
          : "";

      const prompts = db.db
        .prepare(
          `
        SELECT
          up.*,
          s.project,
          s.memory_session_id
        FROM user_prompts up
        JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
        WHERE s.project = ? ${promptExclusionClause}
        ORDER BY up.id ASC
      `,
        )
        .all(this.project) as StoredUserPrompt[];

      const totalPromptCount = db.db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM user_prompts up
        JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
        WHERE s.project = ?
      `,
        )
        .get(this.project) as { count: number };

      logger.info("CHROMA_SYNC", "Backfilling user prompts", {
        project: this.project,
        missing: prompts.length,
        existing: existing.prompts.size,
        total: totalPromptCount.count,
      });

      const promptDocs: ChromaDocument[] = [];
      for (const prompt of prompts) {
        promptDocs.push(this.formatUserPromptDoc(prompt));
      }

      for (let i = 0; i < promptDocs.length; i += this.BATCH_SIZE) {
        const batch = promptDocs.slice(i, i + this.BATCH_SIZE);
        await this.addDocuments(batch);

        logger.debug("CHROMA_SYNC", "Backfill progress", {
          project: this.project,
          progress: `${Math.min(i + this.BATCH_SIZE, promptDocs.length)}/${promptDocs.length}`,
        });
      }

      logger.info("CHROMA_SYNC", "Smart backfill complete", {
        project: this.project,
        synced: {
          observationDocs: allDocs.length,
          summaryDocs: summaryDocs.length,
          promptDocs: promptDocs.length,
        },
        skipped: {
          observations: existing.observations.size,
          summaries: existing.summaries.size,
          prompts: existing.prompts.size,
        },
      });
    } catch (error) {
      logger.error(
        "CHROMA_SYNC",
        "Backfill failed",
        { project: this.project },
        error as Error,
      );
      throw new Error(
        `Backfill failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      db.close();
    }
  }

  /**
   * Query Chroma collection for semantic search
   * Used by SearchManager for vector-based search
   */
  async queryChroma(
    query: string,
    limit: number,
    whereFilter?: Record<string, unknown>,
  ): Promise<{
    ids: number[];
    distances: number[];
    metadatas: VectorMetadata[];
  }> {
    const client = await this.getClient();

    const whereStringified = whereFilter
      ? JSON.stringify(whereFilter)
      : undefined;

    const arguments_obj = {
      collection_name: this.collectionName,
      query_texts: [query],
      n_results: limit,
      include: ["documents", "metadatas", "distances"],
      where: whereStringified,
    };

    let result: McpToolResult;
    try {
      result = (await client.callTool({
        name: "chroma_query_documents",
        arguments: arguments_obj,
      })) as McpToolResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isConnectionError =
        errorMessage.includes("Not connected") ||
        errorMessage.includes("Connection closed") ||
        errorMessage.includes("MCP error -32000");

      if (isConnectionError) {
        await this.invalidateConnection();
        logger.error(
          "CHROMA_SYNC",
          "Connection lost during query",
          { project: this.project, query },
          error as Error,
        );
        throw new Error(
          `Chroma query failed - connection lost: ${errorMessage}`,
        );
      }
      throw error;
    }

    const resultText =
      result.content[0]?.text ||
      (() => {
        logger.error(
          "CHROMA",
          "Missing text in MCP chroma_query_documents result",
          {
            project: this.project,
            query_text: query,
          },
        );
        return "";
      })();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(resultText);
    } catch (error) {
      logger.error(
        "CHROMA_SYNC",
        "Failed to parse Chroma response",
        { project: this.project },
        error as Error,
      );
      return { ids: [], distances: [], metadatas: [] };
    }

    const ids: number[] = [];
    const rawIds = parsed.ids as string[][] | undefined;
    const docIds = rawIds?.[0] || [];
    for (const docId of docIds) {
      const obsMatch = docId.match(/obs_(\d+)_/);
      const summaryMatch = docId.match(/summary_(\d+)_/);
      const promptMatch = docId.match(/prompt_(\d+)/);

      let sqliteId: number | null = null;
      if (obsMatch) {
        sqliteId = parseInt(obsMatch[1], 10);
      } else if (summaryMatch) {
        sqliteId = parseInt(summaryMatch[1], 10);
      } else if (promptMatch) {
        sqliteId = parseInt(promptMatch[1], 10);
      }

      if (sqliteId !== null && !ids.includes(sqliteId)) {
        ids.push(sqliteId);
      }
    }

    const rawDistances = parsed.distances as number[][] | undefined;
    const distances = rawDistances?.[0] || [];
    const rawMetadatas = parsed.metadatas as VectorMetadata[][] | undefined;
    const metadatas = rawMetadatas?.[0] || [];

    return { ids, distances, metadatas };
  }

  /**
   * Delete vector documents for the given SQLite IDs.
   * Generates a superset of all possible ChromaDB document IDs and deletes in batches.
   * ChromaDB silently ignores non-existent IDs.
   */
  async deleteDocuments(
    sqliteIds: number[],
    docType: "observation" | "session_summary" | "user_prompt",
  ): Promise<number> {
    if (sqliteIds.length === 0) return 0;

    const client = await this.getClient();

    const chromaIds: string[] = [];
    for (const id of sqliteIds) {
      if (docType === "observation") {
        chromaIds.push(`obs_${id}_narrative`, `obs_${id}_text`);
        for (let f = 0; f < 200; f++) {
          chromaIds.push(`obs_${id}_fact_${f}`);
        }
      } else if (docType === "session_summary") {
        for (const field of [
          "request",
          "investigated",
          "learned",
          "completed",
          "next_steps",
          "notes",
        ]) {
          chromaIds.push(`summary_${id}_${field}`);
        }
      } else {
        chromaIds.push(`prompt_${id}`);
      }
    }

    let deleted = 0;
    for (let i = 0; i < chromaIds.length; i += this.BATCH_SIZE) {
      const batch = chromaIds.slice(i, i + this.BATCH_SIZE);
      try {
        await client.callTool({
          name: "chroma_delete_documents",
          arguments: { collection_name: this.collectionName, ids: batch },
        });
        deleted += batch.length;
      } catch (error) {
        logger.error(
          "CHROMA_SYNC",
          "Failed to delete documents batch",
          { batchSize: batch.length },
          error as Error,
        );
        throw error;
      }
    }

    logger.info("CHROMA_SYNC", "Deleted vector documents", {
      sqliteIds: sqliteIds.length,
      docType,
      chromaDocsDeleted: deleted,
    });

    return deleted;
  }

  /**
   * Vacuum: delete the collection, recreate it, and backfill from SQLite.
   * Rebuilds the HNSW index from scratch — the permanent fix for index bloat.
   * On partial failure (backfill fails after delete+recreate), returns a result
   * with an error message. Re-running vacuum will complete the backfill.
   */
  async vacuum(): Promise<{
    deletedDocuments: number;
    reindexedDocuments: number;
    error?: string;
  }> {
    return this.connectionManager.withMutex(async (client) => {
      const preDeleteCount = await this.getEmbeddingCount();

      logger.info("CHROMA_SYNC", "Starting vacuum — deleting collection", {
        collection: this.collectionName,
        project: this.project,
        existingDocuments: preDeleteCount,
      });

      await client.callTool({
        name: "chroma_delete_collection",
        arguments: { collection_name: this.collectionName },
      });

      logger.info("CHROMA_SYNC", "Collection deleted, recreating", {
        collection: this.collectionName,
      });

      await client.callTool({
        name: "chroma_create_collection",
        arguments: {
          collection_name: this.collectionName,
          embedding_function_name: "default",
        },
      });

      logger.info("CHROMA_SYNC", "Collection recreated, starting backfill", {
        collection: this.collectionName,
      });

      try {
        await this.ensureBackfilled();

        const postBackfillCount = await this.getEmbeddingCount();

        logger.info("CHROMA_SYNC", "Vacuum complete", {
          collection: this.collectionName,
          project: this.project,
          deletedDocuments: preDeleteCount,
          reindexedDocuments: postBackfillCount,
        });

        return {
          deletedDocuments: preDeleteCount,
          reindexedDocuments: postBackfillCount,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          "CHROMA_SYNC",
          "Vacuum incomplete — backfill failed",
          {
            collection: this.collectionName,
            project: this.project,
          },
          error as Error,
        );

        return {
          deletedDocuments: preDeleteCount,
          reindexedDocuments: 0,
          error: `Vacuum incomplete — run again to complete backfill: ${message}`,
        };
      }
    });
  }

  /**
   * Get the number of documents in the ChromaDB collection via chroma_get_collection_info.
   */
  async getEmbeddingCount(): Promise<number> {
    try {
      const client = await this.getClient();
      const result = (await client.callTool({
        name: "chroma_get_collection_info",
        arguments: { collection_name: this.collectionName },
      })) as McpToolResult;

      const text = result.content[0]?.text;
      if (!text) return 0;

      const parsed = JSON.parse(text);
      return parsed.count ?? parsed.num_documents ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Close the Chroma client connection and cleanup subprocess
   */
  async close(): Promise<void> {
    await this.connectionManager.close();
    logger.info("CHROMA_SYNC", "Chroma client and subprocess closed", {
      project: this.project,
    });
  }

  /**
   * Query method (IVectorSync interface)
   * Alias for queryChroma for interface compatibility
   */
  async query(
    queryText: string,
    limit: number,
    whereFilter?: Record<string, unknown>,
  ): Promise<VectorQueryResult> {
    return this.queryChroma(queryText, limit, whereFilter);
  }

  /**
   * Check if Chroma is healthy and connected.
   * Bypasses circuit breaker — safe to call in any state.
   */
  async isHealthy(): Promise<boolean> {
    return this.connectionManager.isHealthy();
  }
}
