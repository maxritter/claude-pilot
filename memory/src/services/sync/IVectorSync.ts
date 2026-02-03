/**
 * IVectorSync Interface
 *
 * Abstraction layer for vector database backends (ChromaDB, Qdrant, etc.)
 * Allows switching between implementations via settings.
 */

import { ParsedObservation, ParsedSummary } from '../../sdk/parser.js';

/**
 * Metadata structure stored with each vector document
 */
export interface VectorMetadata {
  sqlite_id: number;
  doc_type: 'observation' | 'session_summary' | 'user_prompt';
  memory_session_id: string;
  project: string;
  created_at_epoch: number;
  type?: string;
  title?: string;
  subtitle?: string;
  concepts?: string;
  files_read?: string;
  files_modified?: string;
  field_type?: string;
  prompt_number?: number;
  fact_index?: number;
}

/**
 * Result from vector database query
 */
export interface VectorQueryResult {
  /** SQLite IDs of matching records (deduplicated) */
  ids: number[];
  /** Similarity scores/distances */
  distances: number[];
  /** Metadata for each result */
  metadatas: VectorMetadata[];
}

/**
 * Interface for vector database synchronization
 *
 * Implementations: ChromaSync (MCP/uvx), QdrantSync (native TypeScript)
 */
export interface IVectorSync {
  /**
   * Sync a single observation to vector database
   * Creates multiple vector documents (one per field: narrative, facts)
   */
  syncObservation(
    observationId: number,
    memorySessionId: string,
    project: string,
    obs: ParsedObservation,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens?: number
  ): Promise<void>;

  /**
   * Sync a single summary to vector database
   * Creates multiple vector documents (one per field: request, learned, etc.)
   */
  syncSummary(
    summaryId: number,
    memorySessionId: string,
    project: string,
    summary: ParsedSummary,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens?: number
  ): Promise<void>;

  /**
   * Sync a single user prompt to vector database
   * Creates one vector document per prompt
   */
  syncUserPrompt(
    promptId: number,
    memorySessionId: string,
    project: string,
    promptText: string,
    promptNumber: number,
    createdAtEpoch: number
  ): Promise<void>;

  /**
   * Ensure all SQLite data is backfilled to vector database
   * Performs differential sync (only missing records)
   */
  ensureBackfilled(): Promise<void>;

  /**
   * Query vector database for semantic search
   * Returns deduplicated SQLite IDs with distances and metadata
   *
   * @param queryText - Search query text
   * @param limit - Maximum number of results
   * @param whereFilter - Optional metadata filter (e.g., { doc_type: 'observation' })
   */
  query(
    queryText: string,
    limit: number,
    whereFilter?: Record<string, any>
  ): Promise<VectorQueryResult>;

  /**
   * Close connection and cleanup resources
   * Should terminate any subprocesses or network connections
   */
  close(): Promise<void>;

  /**
   * Check if vector database is healthy and connected
   */
  isHealthy(): Promise<boolean>;
}
