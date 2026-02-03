/**
 * SearchOrchestrator - Coordinates search strategies and handles fallback logic
 *
 * This is the main entry point for search operations. It:
 * 1. Normalizes input parameters
 * 2. Selects the appropriate strategy
 * 3. Executes the search
 * 4. Handles fallbacks on failure
 * 5. Delegates to formatters for output
 */

import { SessionSearch } from '../../sqlite/SessionSearch.js';
import { SessionStore } from '../../sqlite/SessionStore.js';
import { IVectorSync } from '../../sync/IVectorSync.js';

import { VectorSearchStrategy } from './strategies/VectorSearchStrategy.js';
import { SQLiteSearchStrategy } from './strategies/SQLiteSearchStrategy.js';
import { HybridSearchStrategy } from './strategies/HybridSearchStrategy.js';

import { ResultFormatter } from './ResultFormatter.js';
import { TimelineBuilder } from './TimelineBuilder.js';
import type { TimelineItem, TimelineData } from './TimelineBuilder.js';

import {
  SEARCH_CONSTANTS,
} from './types.js';
import type {
  StrategySearchOptions,
  StrategySearchResult,
  SearchResults,
  ObservationSearchResult
} from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Normalized parameters from URL-friendly format
 */
interface NormalizedParams extends StrategySearchOptions {
  concepts?: string[];
  files?: string[];
  obsType?: string[];
}

export class SearchOrchestrator {
  private vectorStrategy: VectorSearchStrategy | null = null;
  private sqliteStrategy: SQLiteSearchStrategy;
  private hybridStrategy: HybridSearchStrategy | null = null;
  private resultFormatter: ResultFormatter;
  private timelineBuilder: TimelineBuilder;

  constructor(
    private sessionSearch: SessionSearch,
    private sessionStore: SessionStore,
    private vectorSync: IVectorSync | null
  ) {
    // Initialize strategies
    this.sqliteStrategy = new SQLiteSearchStrategy(sessionSearch);

    if (vectorSync) {
      this.vectorStrategy = new VectorSearchStrategy(vectorSync, sessionStore);
      this.hybridStrategy = new HybridSearchStrategy(vectorSync, sessionStore, sessionSearch);
    }

    this.resultFormatter = new ResultFormatter();
    this.timelineBuilder = new TimelineBuilder();
  }

  /**
   * Main search entry point
   */
  async search(args: any): Promise<StrategySearchResult> {
    const options = this.normalizeParams(args);

    // Decision tree for strategy selection
    return await this.executeWithFallback(options);
  }

  /**
   * Execute search with fallback logic
   */
  private async executeWithFallback(
    options: NormalizedParams
  ): Promise<StrategySearchResult> {
    // PATH 1: FILTER-ONLY (no query text) - Use SQLite
    if (!options.query) {
      logger.debug('SEARCH', 'Orchestrator: Filter-only query, using SQLite', {});
      return await this.sqliteStrategy.search(options);
    }

    // PATH 2: VECTOR SEMANTIC SEARCH (query text + vector DB available)
    if (this.vectorStrategy) {
      logger.debug('SEARCH', 'Orchestrator: Using vector semantic search', {});
      const result = await this.vectorStrategy.search(options);

      // If vector search succeeded (even with 0 results), return
      if (result.usedChroma) {
        return result;
      }

      // Vector search failed - fall back to SQLite for filter-only
      logger.debug('SEARCH', 'Orchestrator: Vector search failed, falling back to SQLite', {});
      const fallbackResult = await this.sqliteStrategy.search({
        ...options,
        query: undefined // Remove query for SQLite fallback
      });

      return {
        ...fallbackResult,
        fellBack: true
      };
    }

    // PATH 3: No vector DB available
    logger.debug('SEARCH', 'Orchestrator: Vector DB not available', {});
    return {
      results: { observations: [], sessions: [], prompts: [] },
      usedChroma: false,
      fellBack: false,
      strategy: 'sqlite'
    };
  }

  /**
   * Find by concept with hybrid search
   */
  async findByConcept(concept: string, args: any): Promise<StrategySearchResult> {
    const options = this.normalizeParams(args);

    if (this.hybridStrategy) {
      return await this.hybridStrategy.findByConcept(concept, options);
    }

    // Fallback to SQLite
    const results = this.sqliteStrategy.findByConcept(concept, options);
    return {
      results: { observations: results, sessions: [], prompts: [] },
      usedChroma: false,
      fellBack: false,
      strategy: 'sqlite'
    };
  }

  /**
   * Find by type with hybrid search
   */
  async findByType(type: string | string[], args: any): Promise<StrategySearchResult> {
    const options = this.normalizeParams(args);

    if (this.hybridStrategy) {
      return await this.hybridStrategy.findByType(type, options);
    }

    // Fallback to SQLite
    const results = this.sqliteStrategy.findByType(type, options);
    return {
      results: { observations: results, sessions: [], prompts: [] },
      usedChroma: false,
      fellBack: false,
      strategy: 'sqlite'
    };
  }

  /**
   * Find by file with hybrid search
   */
  async findByFile(filePath: string, args: any): Promise<{
    observations: ObservationSearchResult[];
    sessions: any[];
    usedChroma: boolean;
  }> {
    const options = this.normalizeParams(args);

    if (this.hybridStrategy) {
      return await this.hybridStrategy.findByFile(filePath, options);
    }

    // Fallback to SQLite
    const results = this.sqliteStrategy.findByFile(filePath, options);
    return { ...results, usedChroma: false };
  }

  /**
   * Get timeline around anchor
   */
  getTimeline(
    timelineData: TimelineData,
    anchorId: number | string,
    anchorEpoch: number,
    depthBefore: number,
    depthAfter: number
  ): TimelineItem[] {
    const items = this.timelineBuilder.buildTimeline(timelineData);
    return this.timelineBuilder.filterByDepth(items, anchorId, anchorEpoch, depthBefore, depthAfter);
  }

  /**
   * Format timeline for display
   */
  formatTimeline(
    items: TimelineItem[],
    anchorId: number | string | null,
    options: {
      query?: string;
      depthBefore?: number;
      depthAfter?: number;
    } = {}
  ): string {
    return this.timelineBuilder.formatTimeline(items, anchorId, options);
  }

  /**
   * Format search results for display
   */
  formatSearchResults(
    results: SearchResults,
    query: string,
    chromaFailed: boolean = false
  ): string {
    return this.resultFormatter.formatSearchResults(results, query, chromaFailed);
  }

  /**
   * Get result formatter for direct access
   */
  getFormatter(): ResultFormatter {
    return this.resultFormatter;
  }

  /**
   * Get timeline builder for direct access
   */
  getTimelineBuilder(): TimelineBuilder {
    return this.timelineBuilder;
  }

  /**
   * Normalize query parameters from URL-friendly format
   */
  private normalizeParams(args: any): NormalizedParams {
    const normalized: any = { ...args };

    // Parse comma-separated concepts into array
    if (normalized.concepts && typeof normalized.concepts === 'string') {
      normalized.concepts = normalized.concepts.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Parse comma-separated files into array
    if (normalized.files && typeof normalized.files === 'string') {
      normalized.files = normalized.files.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Parse comma-separated obs_type into array
    if (normalized.obs_type && typeof normalized.obs_type === 'string') {
      normalized.obsType = normalized.obs_type.split(',').map((s: string) => s.trim()).filter(Boolean);
      delete normalized.obs_type;
    }

    // Parse comma-separated type (for filterSchema) into array
    if (normalized.type && typeof normalized.type === 'string' && normalized.type.includes(',')) {
      normalized.type = normalized.type.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Map 'type' param to 'searchType' for API consistency
    if (normalized.type && !normalized.searchType) {
      if (['observations', 'sessions', 'prompts'].includes(normalized.type)) {
        normalized.searchType = normalized.type;
        delete normalized.type;
      }
    }

    // Flatten dateStart/dateEnd into dateRange object
    if (normalized.dateStart || normalized.dateEnd) {
      normalized.dateRange = {
        start: normalized.dateStart,
        end: normalized.dateEnd
      };
      delete normalized.dateStart;
      delete normalized.dateEnd;
    }

    return normalized;
  }

  /**
   * Check if vector DB is available
   */
  isVectorDbAvailable(): boolean {
    return !!this.vectorSync;
  }

  /**
   * Check if Chroma is available (deprecated alias)
   * @deprecated Use isVectorDbAvailable() instead
   */
  isChromaAvailable(): boolean {
    return this.isVectorDbAvailable();
  }
}
