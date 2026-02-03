/**
 * DatabaseManager: Single long-lived database connection
 *
 * Responsibility:
 * - Manage single database connection for worker lifetime
 * - Provide centralized access to SessionStore and SessionSearch
 * - High-level database operations
 * - VectorSync integration (ChromaDB or Qdrant)
 */

import { SessionStore } from '../sqlite/SessionStore.js';
import { SessionSearch } from '../sqlite/SessionSearch.js';
import { IVectorSync } from '../sync/IVectorSync.js';
import { createVectorSync } from '../sync/VectorSyncFactory.js';
import { logger } from '../../utils/logger.js';
import type { DBSession } from '../worker-types.js';

export class DatabaseManager {
  private sessionStore: SessionStore | null = null;
  private sessionSearch: SessionSearch | null = null;
  private vectorSync: IVectorSync | null = null;

  /**
   * Initialize database connection (once, stays open)
   */
  async initialize(): Promise<void> {
    // Open database connection (ONCE)
    this.sessionStore = new SessionStore();
    this.sessionSearch = new SessionSearch();

    // Initialize VectorSync using factory (selects ChromaDB or Qdrant based on settings)
    // Lazy - connects on first search, not at startup
    this.vectorSync = createVectorSync('claude-mem');

    logger.info('DB', 'Database initialized');
  }

  /**
   * Close database connection and cleanup all resources
   */
  async close(): Promise<void> {
    // Close VectorSync first (terminates subprocesses if any)
    if (this.vectorSync) {
      await this.vectorSync.close();
      this.vectorSync = null;
    }

    if (this.sessionStore) {
      this.sessionStore.close();
      this.sessionStore = null;
    }
    if (this.sessionSearch) {
      this.sessionSearch.close();
      this.sessionSearch = null;
    }
    logger.info('DB', 'Database closed');
  }

  /**
   * Get SessionStore instance (throws if not initialized)
   */
  getSessionStore(): SessionStore {
    if (!this.sessionStore) {
      throw new Error('Database not initialized');
    }
    return this.sessionStore;
  }

  /**
   * Get SessionSearch instance (throws if not initialized)
   */
  getSessionSearch(): SessionSearch {
    if (!this.sessionSearch) {
      throw new Error('Database not initialized');
    }
    return this.sessionSearch;
  }

  /**
   * Get VectorSync instance (throws if not initialized)
   * Returns IVectorSync which may be ChromaSync or QdrantSync
   */
  getVectorSync(): IVectorSync {
    if (!this.vectorSync) {
      throw new Error('VectorSync not initialized');
    }
    return this.vectorSync;
  }

  /**
   * Get ChromaSync instance (deprecated alias for backward compatibility)
   * @deprecated Use getVectorSync() instead
   */
  getChromaSync(): IVectorSync {
    return this.getVectorSync();
  }

  // REMOVED: cleanupOrphanedSessions - violates "EVERYTHING SHOULD SAVE ALWAYS"
  // Worker restarts don't make sessions orphaned. Sessions are managed by hooks
  // and exist independently of worker state.

  /**
   * Get session by ID (throws if not found)
   */
  getSessionById(sessionDbId: number): {
    id: number;
    content_session_id: string;
    memory_session_id: string | null;
    project: string;
    user_prompt: string;
  } {
    const session = this.getSessionStore().getSessionById(sessionDbId);
    if (!session) {
      throw new Error(`Session ${sessionDbId} not found`);
    }
    return session;
  }

}
