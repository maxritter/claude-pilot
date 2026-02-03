/**
 * QdrantSync - Qdrant implementation of IVectorSync
 *
 * Uses file-based persistence (no external server required).
 * Compatible with ChromaSync's document structure.
 *
 * Features:
 * - Native TypeScript (no Python subprocess)
 * - File-based persistence in ~/.claude-mem/qdrant/
 * - Same granular document splitting as ChromaSync
 * - Local embedding generation via EmbeddingService
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { IVectorSync, VectorQueryResult, VectorMetadata } from './IVectorSync.js';
import { EmbeddingService } from './EmbeddingService.js';
import { ParsedObservation, ParsedSummary } from '../../sdk/parser.js';
import { SessionStore } from '../sqlite/SessionStore.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import os from 'os';
import { mkdirSync, existsSync } from 'fs';

interface QdrantDocument {
  id: string;
  text: string;
  metadata: VectorMetadata;
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

export class QdrantSync implements IVectorSync {
  private client: QdrantClient | null = null;
  private embedder: EmbeddingService;
  private project: string;
  private collectionName: string;
  private readonly QDRANT_DIR: string;
  private readonly BATCH_SIZE = 100;
  private connected: boolean = false;
  private collectionExists: boolean = false;

  constructor(project: string) {
    this.project = project;
    this.collectionName = `cm__${project}`;
    this.QDRANT_DIR = path.join(os.homedir(), '.claude-mem', 'qdrant');
    this.embedder = EmbeddingService.getInstance();
  }

  /**
   * Ensure Qdrant directory exists
   */
  private ensureQdrantDir(): void {
    if (!existsSync(this.QDRANT_DIR)) {
      mkdirSync(this.QDRANT_DIR, { recursive: true });
      logger.info('QDRANT_SYNC', 'Created Qdrant directory', { path: this.QDRANT_DIR });
    }
  }

  /**
   * Ensure Qdrant client is connected (Docker server mode)
   */
  private async ensureConnection(): Promise<void> {
    if (this.connected && this.client) return;

    logger.info('QDRANT_SYNC', 'Connecting to Qdrant server...', { project: this.project });

    // Connect to local Qdrant Docker container
    // TODO: Make host/port configurable via settings
    this.client = new QdrantClient({
      host: 'localhost',
      port: 6333
    });

    this.connected = true;
    logger.info('QDRANT_SYNC', 'Connected to Qdrant server', { project: this.project });
  }

  /**
   * Ensure collection exists with proper configuration
   */
  private async ensureCollection(): Promise<void> {
    if (this.collectionExists) return;

    await this.ensureConnection();
    if (!this.client) throw new Error('Qdrant client not initialized');

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);

      if (!exists) {
        logger.info('QDRANT_SYNC', 'Creating collection', { collection: this.collectionName });

        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.embedder.getDimension(),
            distance: 'Cosine'
          }
        });

        // Create payload indexes for filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'doc_type',
          field_schema: 'keyword'
        });
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'project',
          field_schema: 'keyword'
        });
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'created_at_epoch',
          field_schema: 'integer'
        });
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'sqlite_id',
          field_schema: 'integer'
        });

        logger.info('QDRANT_SYNC', 'Collection created', { collection: this.collectionName });
      }

      this.collectionExists = true;
    } catch (error) {
      logger.error('QDRANT_SYNC', 'Failed to ensure collection', { collection: this.collectionName }, error as Error);
      throw error;
    }
  }

  /**
   * Generate a numeric hash from a string ID (Qdrant requires numeric IDs for some operations)
   */
  private stringToNumericId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Format observation into documents (same granular approach as ChromaSync)
   */
  private formatObservationDocs(obs: {
    id: number;
    memory_session_id: string;
    project: string;
    type: string;
    title: string | null;
    subtitle: string | null;
    facts: string[];
    narrative: string | null;
    text: string | null;
    concepts: string[];
    files_read: string[];
    files_modified: string[];
    created_at_epoch: number;
  }): QdrantDocument[] {
    const documents: QdrantDocument[] = [];

    const baseMetadata: VectorMetadata = {
      sqlite_id: obs.id,
      doc_type: 'observation',
      memory_session_id: obs.memory_session_id,
      project: obs.project,
      created_at_epoch: obs.created_at_epoch,
      type: obs.type || 'discovery',
      title: obs.title || 'Untitled'
    };

    // Add optional metadata fields
    if (obs.subtitle) {
      baseMetadata.subtitle = obs.subtitle;
    }
    if (obs.concepts.length > 0) {
      baseMetadata.concepts = obs.concepts.join(',');
    }
    if (obs.files_read.length > 0) {
      baseMetadata.files_read = obs.files_read.join(',');
    }
    if (obs.files_modified.length > 0) {
      baseMetadata.files_modified = obs.files_modified.join(',');
    }

    // Narrative as separate document
    if (obs.narrative) {
      documents.push({
        id: `obs_${obs.id}_narrative`,
        text: obs.narrative,
        metadata: { ...baseMetadata, field_type: 'narrative' }
      });
    }

    // Text as separate document (legacy field)
    if (obs.text) {
      documents.push({
        id: `obs_${obs.id}_text`,
        text: obs.text,
        metadata: { ...baseMetadata, field_type: 'text' }
      });
    }

    // Each fact as separate document
    obs.facts.forEach((fact: string, index: number) => {
      documents.push({
        id: `obs_${obs.id}_fact_${index}`,
        text: fact,
        metadata: { ...baseMetadata, field_type: 'fact', fact_index: index }
      });
    });

    return documents;
  }

  /**
   * Format summary into documents
   */
  private formatSummaryDocs(summary: {
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
    created_at_epoch: number;
  }): QdrantDocument[] {
    const documents: QdrantDocument[] = [];

    const baseMetadata: VectorMetadata = {
      sqlite_id: summary.id,
      doc_type: 'session_summary',
      memory_session_id: summary.memory_session_id,
      project: summary.project,
      created_at_epoch: summary.created_at_epoch,
      prompt_number: summary.prompt_number || 0
    };

    // Each field becomes a separate document
    const fields = [
      { key: 'request', value: summary.request },
      { key: 'investigated', value: summary.investigated },
      { key: 'learned', value: summary.learned },
      { key: 'completed', value: summary.completed },
      { key: 'next_steps', value: summary.next_steps },
      { key: 'notes', value: summary.notes }
    ];

    for (const field of fields) {
      if (field.value) {
        documents.push({
          id: `summary_${summary.id}_${field.key}`,
          text: field.value,
          metadata: { ...baseMetadata, field_type: field.key }
        });
      }
    }

    return documents;
  }

  /**
   * Format user prompt into document
   */
  private formatUserPromptDoc(prompt: StoredUserPrompt): QdrantDocument {
    return {
      id: `prompt_${prompt.id}`,
      text: prompt.prompt_text,
      metadata: {
        sqlite_id: prompt.id,
        doc_type: 'user_prompt',
        memory_session_id: prompt.memory_session_id,
        project: prompt.project,
        created_at_epoch: prompt.created_at_epoch,
        prompt_number: prompt.prompt_number
      }
    };
  }

  /**
   * Add documents to Qdrant with embeddings
   */
  private async addDocuments(documents: QdrantDocument[]): Promise<void> {
    if (documents.length === 0) return;

    await this.ensureCollection();
    if (!this.client) throw new Error('Qdrant client not initialized');

    // Generate embeddings for all document texts
    const texts = documents.map(d => d.text);
    const embeddings = await this.embedder.embedBatch(texts);

    // Prepare points for upsert
    const points = documents.map((doc, i) => ({
      id: this.stringToNumericId(doc.id),
      vector: embeddings[i],
      payload: {
        ...doc.metadata,
        _doc_id: doc.id // Store original string ID in payload
      }
    }));

    // Upsert in batches
    for (let i = 0; i < points.length; i += this.BATCH_SIZE) {
      const batch = points.slice(i, i + this.BATCH_SIZE);
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: batch
      });
    }

    logger.debug('QDRANT_SYNC', 'Documents added', {
      collection: this.collectionName,
      count: documents.length
    });
  }

  async syncObservation(
    observationId: number,
    memorySessionId: string,
    project: string,
    obs: ParsedObservation,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens: number = 0
  ): Promise<void> {
    const documents = this.formatObservationDocs({
      id: observationId,
      memory_session_id: memorySessionId,
      project,
      type: obs.type,
      title: obs.title,
      subtitle: obs.subtitle,
      facts: obs.facts || [],
      narrative: obs.narrative || null,
      text: null,
      concepts: obs.concepts || [],
      files_read: obs.files_read || [],
      files_modified: obs.files_modified || [],
      created_at_epoch: createdAtEpoch
    });

    logger.info('QDRANT_SYNC', 'Syncing observation', {
      observationId,
      documentCount: documents.length,
      project
    });

    await this.addDocuments(documents);
  }

  async syncSummary(
    summaryId: number,
    memorySessionId: string,
    project: string,
    summary: ParsedSummary,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens: number = 0
  ): Promise<void> {
    const documents = this.formatSummaryDocs({
      id: summaryId,
      memory_session_id: memorySessionId,
      project,
      request: summary.request,
      investigated: summary.investigated,
      learned: summary.learned,
      completed: summary.completed,
      next_steps: summary.next_steps,
      notes: summary.notes,
      prompt_number: promptNumber,
      created_at_epoch: createdAtEpoch
    });

    logger.info('QDRANT_SYNC', 'Syncing summary', {
      summaryId,
      documentCount: documents.length,
      project
    });

    await this.addDocuments(documents);
  }

  async syncUserPrompt(
    promptId: number,
    memorySessionId: string,
    project: string,
    promptText: string,
    promptNumber: number,
    createdAtEpoch: number
  ): Promise<void> {
    const document = this.formatUserPromptDoc({
      id: promptId,
      content_session_id: '',
      prompt_number: promptNumber,
      prompt_text: promptText,
      created_at: new Date(createdAtEpoch * 1000).toISOString(),
      created_at_epoch: createdAtEpoch,
      memory_session_id: memorySessionId,
      project
    });

    logger.info('QDRANT_SYNC', 'Syncing user prompt', { promptId, project });
    await this.addDocuments([document]);
  }

  /**
   * Get existing SQLite IDs from Qdrant (for smart backfill)
   */
  private async getExistingIds(): Promise<{
    observations: Set<number>;
    summaries: Set<number>;
    prompts: Set<number>;
  }> {
    await this.ensureCollection();
    if (!this.client) throw new Error('Qdrant client not initialized');

    const observationIds = new Set<number>();
    const summaryIds = new Set<number>();
    const promptIds = new Set<number>();

    let offset: string | number | undefined = undefined;
    const limit = 1000;

    logger.info('QDRANT_SYNC', 'Fetching existing Qdrant document IDs...', { project: this.project });

    while (true) {
      const result = await this.client.scroll(this.collectionName, {
        limit,
        offset,
        filter: {
          must: [
            { key: 'project', match: { value: this.project } }
          ]
        },
        with_payload: ['sqlite_id', 'doc_type']
      });

      if (!result.points || result.points.length === 0) {
        break;
      }

      for (const point of result.points) {
        const payload = point.payload as any;
        if (payload?.sqlite_id) {
          if (payload.doc_type === 'observation') {
            observationIds.add(payload.sqlite_id);
          } else if (payload.doc_type === 'session_summary') {
            summaryIds.add(payload.sqlite_id);
          } else if (payload.doc_type === 'user_prompt') {
            promptIds.add(payload.sqlite_id);
          }
        }
      }

      offset = result.next_page_offset;
      if (!offset) break;
    }

    logger.info('QDRANT_SYNC', 'Existing IDs fetched', {
      project: this.project,
      observations: observationIds.size,
      summaries: summaryIds.size,
      prompts: promptIds.size
    });

    return { observations: observationIds, summaries: summaryIds, prompts: promptIds };
  }

  async ensureBackfilled(): Promise<void> {
    logger.info('QDRANT_SYNC', 'Starting smart backfill', { project: this.project });

    await this.ensureCollection();

    // Fetch existing IDs from Qdrant
    const existing = await this.getExistingIds();

    const db = new SessionStore();

    try {
      // Build exclusion list for observations
      const existingObsIds = Array.from(existing.observations);
      const obsExclusionClause = existingObsIds.length > 0
        ? `AND id NOT IN (${existingObsIds.join(',')})`
        : '';

      // Get only observations missing from Qdrant
      const observations = db.db.prepare(`
        SELECT * FROM observations
        WHERE project = ? ${obsExclusionClause}
        ORDER BY id ASC
      `).all(this.project) as StoredObservation[];

      logger.info('QDRANT_SYNC', 'Backfilling observations', {
        project: this.project,
        missing: observations.length,
        existing: existing.observations.size
      });

      // Format and sync all observation documents
      const allDocs: QdrantDocument[] = [];
      for (const obs of observations) {
        const facts = obs.facts ? JSON.parse(obs.facts) : [];
        const concepts = obs.concepts ? JSON.parse(obs.concepts) : [];
        const files_read = obs.files_read ? JSON.parse(obs.files_read) : [];
        const files_modified = obs.files_modified ? JSON.parse(obs.files_modified) : [];

        allDocs.push(...this.formatObservationDocs({
          id: obs.id,
          memory_session_id: obs.memory_session_id,
          project: obs.project,
          type: obs.type,
          title: obs.title,
          subtitle: obs.subtitle,
          facts,
          narrative: obs.narrative,
          text: obs.text,
          concepts,
          files_read,
          files_modified,
          created_at_epoch: obs.created_at_epoch
        }));
      }

      // Sync observation documents in batches
      for (let i = 0; i < allDocs.length; i += this.BATCH_SIZE) {
        const batch = allDocs.slice(i, i + this.BATCH_SIZE);
        await this.addDocuments(batch);

        logger.debug('QDRANT_SYNC', 'Backfill progress (observations)', {
          progress: `${Math.min(i + this.BATCH_SIZE, allDocs.length)}/${allDocs.length}`
        });
      }

      // Build exclusion list for summaries
      const existingSummaryIds = Array.from(existing.summaries);
      const summaryExclusionClause = existingSummaryIds.length > 0
        ? `AND id NOT IN (${existingSummaryIds.join(',')})`
        : '';

      // Get only summaries missing from Qdrant
      const summaries = db.db.prepare(`
        SELECT * FROM session_summaries
        WHERE project = ? ${summaryExclusionClause}
        ORDER BY id ASC
      `).all(this.project) as StoredSummary[];

      logger.info('QDRANT_SYNC', 'Backfilling summaries', {
        project: this.project,
        missing: summaries.length,
        existing: existing.summaries.size
      });

      // Format and sync all summary documents
      const summaryDocs: QdrantDocument[] = [];
      for (const summary of summaries) {
        summaryDocs.push(...this.formatSummaryDocs({
          id: summary.id,
          memory_session_id: summary.memory_session_id,
          project: summary.project,
          request: summary.request,
          investigated: summary.investigated,
          learned: summary.learned,
          completed: summary.completed,
          next_steps: summary.next_steps,
          notes: summary.notes,
          prompt_number: summary.prompt_number,
          created_at_epoch: summary.created_at_epoch
        }));
      }

      // Sync summary documents in batches
      for (let i = 0; i < summaryDocs.length; i += this.BATCH_SIZE) {
        const batch = summaryDocs.slice(i, i + this.BATCH_SIZE);
        await this.addDocuments(batch);
      }

      // Build exclusion list for prompts
      const existingPromptIds = Array.from(existing.prompts);
      const promptExclusionClause = existingPromptIds.length > 0
        ? `AND up.id NOT IN (${existingPromptIds.join(',')})`
        : '';

      // Get only user prompts missing from Qdrant
      const prompts = db.db.prepare(`
        SELECT
          up.*,
          s.project,
          s.memory_session_id
        FROM user_prompts up
        JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
        WHERE s.project = ? ${promptExclusionClause}
        ORDER BY up.id ASC
      `).all(this.project) as StoredUserPrompt[];

      logger.info('QDRANT_SYNC', 'Backfilling user prompts', {
        project: this.project,
        missing: prompts.length,
        existing: existing.prompts.size
      });

      // Format and sync all prompt documents
      const promptDocs: QdrantDocument[] = [];
      for (const prompt of prompts) {
        promptDocs.push(this.formatUserPromptDoc(prompt));
      }

      // Sync prompt documents in batches
      for (let i = 0; i < promptDocs.length; i += this.BATCH_SIZE) {
        const batch = promptDocs.slice(i, i + this.BATCH_SIZE);
        await this.addDocuments(batch);
      }

      logger.info('QDRANT_SYNC', 'Smart backfill complete', {
        project: this.project,
        synced: {
          observationDocs: allDocs.length,
          summaryDocs: summaryDocs.length,
          promptDocs: promptDocs.length
        }
      });

    } catch (error) {
      logger.error('QDRANT_SYNC', 'Backfill failed', { project: this.project }, error as Error);
      throw error;
    } finally {
      db.close();
    }
  }

  async query(
    queryText: string,
    limit: number,
    whereFilter?: Record<string, any>
  ): Promise<VectorQueryResult> {
    await this.ensureCollection();
    if (!this.client) throw new Error('Qdrant client not initialized');

    // Generate query embedding
    const queryEmbedding = await this.embedder.embed(queryText);

    // Build filter conditions
    const must: any[] = [];
    if (whereFilter) {
      for (const [key, value] of Object.entries(whereFilter)) {
        must.push({
          key,
          match: { value }
        });
      }
    }

    // Search Qdrant
    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: limit * 3, // Request more to account for deduplication
      filter: must.length > 0 ? { must } : undefined,
      with_payload: true
    });

    // Extract unique SQLite IDs from results (deduplicate)
    const ids: number[] = [];
    const distances: number[] = [];
    const metadatas: VectorMetadata[] = [];

    for (const result of results) {
      const payload = result.payload as VectorMetadata;
      const sqliteId = payload?.sqlite_id;

      // Deduplicate by sqlite_id (multiple docs per observation)
      if (sqliteId && !ids.includes(sqliteId)) {
        ids.push(sqliteId);
        distances.push(result.score);
        metadatas.push(payload);

        if (ids.length >= limit) break;
      }
    }

    return { ids, distances, metadatas };
  }

  async close(): Promise<void> {
    // Qdrant file-based client doesn't need explicit close
    logger.info('QDRANT_SYNC', 'Qdrant client closed', { project: this.project });

    this.connected = false;
    this.collectionExists = false;
    this.client = null;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      // Try to list collections to verify connectivity
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }
}
