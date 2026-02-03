/**
 * EmbeddingService - Local embedding generation using transformers.js
 *
 * Uses all-MiniLM-L6-v2 (384 dimensions) for compatibility and speed.
 * Lazy-loads the model on first use to avoid startup delay.
 *
 * Features:
 * - Singleton pattern for model reuse
 * - Quantized model for faster inference
 * - Batch embedding support
 * - Model caching in ~/.claude-mem/models/
 */

import { logger } from '../../utils/logger.js';
import path from 'path';
import os from 'os';

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384;
const MAX_TEXT_LENGTH = 2000; // ~500 tokens approximation
const BATCH_SIZE = 32;

// Lazy-loaded pipeline and types
let pipeline: any = null;
let env: any = null;
let embeddingPipeline: any = null;
let initPromise: Promise<void> | null = null;

export class EmbeddingService {
  private static instance: EmbeddingService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the embedding pipeline (lazy, called once on first use)
   */
  private async ensureInitialized(): Promise<void> {
    if (embeddingPipeline) return;

    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      logger.info('EMBEDDING', 'Loading embedding model...', { model: MODEL_NAME });
      const start = Date.now();

      // Dynamic import to avoid loading at startup
      const transformers = await import('@xenova/transformers');
      pipeline = transformers.pipeline;
      env = transformers.env;

      // Configure cache directory for model weights
      env.cacheDir = path.join(os.homedir(), '.claude-mem', 'models');

      // Disable local model check to use remote models
      env.allowLocalModels = false;

      embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME, {
        quantized: true // Use quantized model for speed
      });

      const duration = Date.now() - start;
      logger.info('EMBEDDING', 'Embedding model loaded', {
        model: MODEL_NAME,
        duration: `${duration}ms`,
        cacheDir: env.cacheDir
      });
    })();

    await initPromise;
  }

  /**
   * Generate embedding for a single text
   * @param text - Text to embed (truncated to MAX_TEXT_LENGTH)
   * @returns Normalized embedding vector (384 dimensions)
   */
  async embed(text: string): Promise<number[]> {
    await this.ensureInitialized();

    // Truncate to avoid token limit
    const truncated = text.slice(0, MAX_TEXT_LENGTH);

    const output = await embeddingPipeline(truncated, {
      pooling: 'mean',
      normalize: true
    });

    return Array.from(output.data);
  }

  /**
   * Generate embeddings for multiple texts (batched)
   * @param texts - Array of texts to embed
   * @returns Array of normalized embedding vectors
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.ensureInitialized();

    const embeddings: number[][] = [];

    // Process in batches for memory efficiency
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE).map(t => t.slice(0, MAX_TEXT_LENGTH));

      // Process sequentially within batch (transformers.js doesn't support true batching)
      for (const text of batch) {
        const output = await embeddingPipeline(text, {
          pooling: 'mean',
          normalize: true
        });
        embeddings.push(Array.from(output.data));
      }

      if (texts.length > BATCH_SIZE) {
        logger.debug('EMBEDDING', 'Batch progress', {
          progress: `${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}`
        });
      }
    }

    return embeddings;
  }

  /**
   * Get the embedding dimension (needed for collection creation)
   */
  getDimension(): number {
    return EMBEDDING_DIMENSION;
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return embeddingPipeline !== null;
  }

  /**
   * Cleanup (model stays in memory for reuse)
   */
  async close(): Promise<void> {
    // Model is kept in memory for reuse across queries
    // Only reset if explicitly needed
    logger.debug('EMBEDDING', 'Close called (model remains cached)');
  }

  /**
   * Force unload model (for testing or memory management)
   */
  async forceUnload(): Promise<void> {
    embeddingPipeline = null;
    initPromise = null;
    logger.info('EMBEDDING', 'Model unloaded');
  }
}
