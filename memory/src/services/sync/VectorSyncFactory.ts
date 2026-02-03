/**
 * VectorSyncFactory - Creates appropriate vector sync implementation
 *
 * Based on settings, returns either ChromaSync or QdrantSync.
 * Provides abstraction layer for vector database selection.
 */

import { IVectorSync } from './IVectorSync.js';
import { ChromaSync } from './ChromaSync.js';
import { QdrantSync } from './QdrantSync.js';
import { NoopVectorSync } from './NoopVectorSync.js';
import { SettingsDefaultsManager } from '../../shared/SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH } from '../../shared/paths.js';
import { logger } from '../../utils/logger.js';

export type VectorDbBackend = 'chroma' | 'qdrant' | 'none' | 'disabled';

/**
 * Create a VectorSync instance based on settings
 * @param project - Project name for collection naming
 * @returns IVectorSync implementation (ChromaSync, QdrantSync, or NoopVectorSync)
 */
export function createVectorSync(project: string): IVectorSync {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  const isWindows = process.platform === 'win32';

  // Check if Chroma/vector search is disabled entirely
  const chromaEnabled = settings.CLAUDE_MEM_CHROMA_ENABLED;
  if (!chromaEnabled) {
    logger.info('VECTOR_SYNC', 'Vector database disabled by setting', { project });
    return new NoopVectorSync(project);
  }

  const backend = (settings.CLAUDE_MEM_VECTOR_DB || 'chroma') as VectorDbBackend;

  // Check if vector DB is explicitly disabled via CLAUDE_MEM_VECTOR_DB setting
  if (backend === 'none' || backend === 'disabled') {
    logger.info('VECTOR_SYNC', 'Vector database disabled via CLAUDE_MEM_VECTOR_DB setting', { project, backend });
    return new NoopVectorSync(project);
  }

  // On Windows, auto-disable Chroma to avoid console popups from MCP SDK subprocess
  // Users can still use Qdrant which runs as a Docker container without popup issues
  if (isWindows && backend === 'chroma') {
    logger.warn('VECTOR_SYNC', 'Chroma disabled on Windows to prevent console popups. Use Qdrant or disable in settings.', { project });
    return new NoopVectorSync(project);
  }

  logger.info('VECTOR_SYNC', 'Creating vector sync', { project, backend });

  switch (backend) {
    case 'qdrant':
      return new QdrantSync(project);
    case 'chroma':
    default:
      return new ChromaSync(project);
  }
}

/**
 * Check if vector sync is available (for graceful degradation)
 */
export async function isVectorSyncAvailable(sync: IVectorSync): Promise<boolean> {
  try {
    return await sync.isHealthy();
  } catch {
    return false;
  }
}

/**
 * Get the currently configured vector database backend
 */
export function getVectorDbBackend(): VectorDbBackend {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  return (settings.CLAUDE_MEM_VECTOR_DB || 'chroma') as VectorDbBackend;
}
