/**
 * NoopVectorSync - No-operation vector sync implementation
 *
 * Used when vector database (Chroma) is disabled via CLAUDE_MEM_CHROMA_ENABLED=false.
 * All operations are no-ops, returning empty results or resolving immediately.
 * This allows the rest of the system to work without code changes.
 */

import { IVectorSync, VectorQueryResult } from './IVectorSync.js';
import { ParsedObservation, ParsedSummary } from '../../sdk/parser.js';
import { logger } from '../../utils/logger.js';

export class NoopVectorSync implements IVectorSync {
  private project: string;
  private loggedOnce: boolean = false;

  constructor(project: string) {
    this.project = project;
  }

  private logDisabled(): void {
    if (!this.loggedOnce) {
      logger.info('VECTOR_SYNC', 'Vector database disabled - using SQLite-only mode', {
        project: this.project
      });
      this.loggedOnce = true;
    }
  }

  async syncObservation(): Promise<void> {
    this.logDisabled();
    // No-op
  }

  async syncSummary(): Promise<void> {
    this.logDisabled();
    // No-op
  }

  async syncUserPrompt(): Promise<void> {
    this.logDisabled();
    // No-op
  }

  async ensureBackfilled(): Promise<void> {
    this.logDisabled();
    // No-op
  }

  async query(): Promise<VectorQueryResult> {
    this.logDisabled();
    // Return empty results
    return {
      ids: [],
      distances: [],
      metadatas: []
    };
  }

  async close(): Promise<void> {
    // No-op - nothing to close
  }

  async isHealthy(): Promise<boolean> {
    // Always "healthy" since there's nothing to break
    return true;
  }
}
