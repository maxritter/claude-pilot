/**
 * ResponseProcessor: Shared response processing for all agent implementations
 *
 * Responsibility:
 * - Parse observations and summaries from agent responses
 * - Execute atomic database transactions
 * - Orchestrate vector sync (fire-and-forget) - ChromaDB or Qdrant
 * - Broadcast to SSE clients
 * - Clean up processed messages
 *
 * This module extracts 150+ lines of duplicate code from SDKAgent, GeminiAgent, and OpenRouterAgent.
 */

import { logger } from '../../../utils/logger.js';
import { parseObservations, parseSummary, type ParsedObservation, type ParsedSummary } from '../../../sdk/parser.js';
import { updateCursorContextForProject } from '../../integrations/CursorHooksInstaller.js';
import { updateFolderClaudeMdFiles } from '../../../utils/claude-md-utils.js';
import { getWorkerPort } from '../../../shared/worker-utils.js';
import { getProjectFromFiles } from '../../../utils/project-name.js';
import { getCurrentGitBranch } from '../../../utils/git-branch.js';
import type { ActiveSession } from '../../worker-types.js';
import type { DatabaseManager } from '../DatabaseManager.js';
import type { SessionManager } from '../SessionManager.js';
import type { WorkerRef, StorageResult } from './types.js';
import { broadcastObservation, broadcastSummary } from './ObservationBroadcaster.js';
import { cleanupProcessedMessages } from './SessionCleanupHelper.js';

/**
 * Process agent response text (parse XML, save to database, sync to Chroma, broadcast SSE)
 *
 * This is the unified response processor that handles:
 * 1. Adding response to conversation history (for provider interop)
 * 2. Parsing observations and summaries from XML
 * 3. Atomic database transaction to store observations + summary
 * 4. Async Chroma sync (fire-and-forget, failures are non-critical)
 * 5. SSE broadcast to web UI clients
 * 6. Session cleanup
 *
 * @param text - Response text from the agent
 * @param session - Active session being processed
 * @param dbManager - Database manager for storage operations
 * @param sessionManager - Session manager for message tracking
 * @param worker - Worker reference for SSE broadcasting (optional)
 * @param discoveryTokens - Token cost delta for this response
 * @param originalTimestamp - Original epoch when message was queued (for accurate timestamps)
 * @param agentName - Name of the agent for logging (e.g., 'SDK', 'Gemini', 'OpenRouter')
 */
export async function processAgentResponse(
  text: string,
  session: ActiveSession,
  dbManager: DatabaseManager,
  sessionManager: SessionManager,
  worker: WorkerRef | undefined,
  discoveryTokens: number,
  originalTimestamp: number | null,
  agentName: string,
  projectRoot?: string
): Promise<void> {
  // Add assistant response to shared conversation history for provider interop
  if (text) {
    session.conversationHistory.push({ role: 'assistant', content: text });
  }

  // Parse observations and summary
  const observations = parseObservations(text, session.contentSessionId);
  const summary = parseSummary(text, session.sessionDbId);

  // Convert nullable fields to empty strings for storeSummary (if summary exists)
  const summaryForStore = normalizeSummaryForStorage(summary);

  // Get session store for atomic transaction
  const sessionStore = dbManager.getSessionStore();

  // CRITICAL: Must use memorySessionId (not contentSessionId) for FK constraint
  if (!session.memorySessionId) {
    throw new Error('Cannot store observations: memorySessionId not yet captured');
  }

  // Determine actual project from files touched in observations
  // This fixes the case where user is in project A but editing files in project B
  // projectRoot (lastCwd) is used to resolve relative file paths from LLM responses
  const allFilePaths = collectAllFilePaths(observations);
  const detectedProject = getProjectFromFiles(allFilePaths, session.project, projectRoot);

  // Log if project differs from session default
  if (detectedProject !== session.project) {
    logger.info('PROJECT', `Detected project from files: ${detectedProject} (session: ${session.project})`, {
      detectedProject,
      sessionProject: session.project,
      fileCount: allFilePaths.length
    });
  }

  // Get git branch from project root (cwd)
  const gitBranch = getCurrentGitBranch(projectRoot);

  // Log pre-storage with session ID chain for verification
  logger.info('DB', `STORING | sessionDbId=${session.sessionDbId} | memorySessionId=${session.memorySessionId} | project=${detectedProject} | obsCount=${observations.length} | hasSummary=${!!summaryForStore}`, {
    sessionId: session.sessionDbId,
    memorySessionId: session.memorySessionId,
    project: detectedProject,
    gitBranch
  });

  // ATOMIC TRANSACTION: Store observations + summary ONCE
  // Messages are already deleted from queue on claim, so no completion tracking needed
  const result = sessionStore.storeObservations(
    session.memorySessionId,
    detectedProject,  // Use detected project instead of session.project
    observations,
    summaryForStore,
    session.lastPromptNumber,
    discoveryTokens,
    originalTimestamp ?? undefined,
    gitBranch
  );

  // Log storage result with IDs for end-to-end traceability
  logger.info('DB', `STORED | sessionDbId=${session.sessionDbId} | memorySessionId=${session.memorySessionId} | obsCount=${result.observationIds.length} | obsIds=[${result.observationIds.join(',')}] | summaryId=${result.summaryId || 'none'}`, {
    sessionId: session.sessionDbId,
    memorySessionId: session.memorySessionId
  });

  // AFTER transaction commits - async operations (can fail safely without data loss)
  await syncAndBroadcastObservations(
    observations,
    result,
    session,
    detectedProject,
    dbManager,
    worker,
    discoveryTokens,
    agentName,
    projectRoot
  );

  // Sync and broadcast summary if present
  await syncAndBroadcastSummary(
    summary,
    summaryForStore,
    result,
    session,
    detectedProject,
    dbManager,
    worker,
    discoveryTokens,
    agentName
  );

  // Clean up session state
  cleanupProcessedMessages(session, worker);
}

/**
 * Normalize summary for storage (convert null fields to empty strings)
 */
function normalizeSummaryForStorage(summary: ParsedSummary | null): {
  request: string;
  investigated: string;
  learned: string;
  completed: string;
  next_steps: string;
  notes: string | null;
} | null {
  if (!summary) return null;

  return {
    request: summary.request || '',
    investigated: summary.investigated || '',
    learned: summary.learned || '',
    completed: summary.completed || '',
    next_steps: summary.next_steps || '',
    notes: summary.notes
  };
}

/**
 * Collect all file paths from observations (files_read + files_modified)
 */
function collectAllFilePaths(observations: ParsedObservation[]): string[] {
  const allPaths: string[] = [];
  for (const obs of observations) {
    allPaths.push(...(obs.files_read || []));
    allPaths.push(...(obs.files_modified || []));
  }
  return allPaths;
}

/**
 * Sync observations to vector database (Chroma/Qdrant) and broadcast to SSE clients
 */
async function syncAndBroadcastObservations(
  observations: ParsedObservation[],
  result: StorageResult,
  session: ActiveSession,
  project: string,
  dbManager: DatabaseManager,
  worker: WorkerRef | undefined,
  discoveryTokens: number,
  agentName: string,
  projectRoot?: string
): Promise<void> {
  for (let i = 0; i < observations.length; i++) {
    const obsId = result.observationIds[i];
    const obs = observations[i];
    const syncStart = Date.now();

    // Sync to vector database (fire-and-forget)
    dbManager.getVectorSync().syncObservation(
      obsId,
      session.contentSessionId,
      project,
      obs,
      session.lastPromptNumber,
      result.createdAtEpoch,
      discoveryTokens
    ).then(() => {
      const syncDuration = Date.now() - syncStart;
      logger.debug('VECTOR', 'Observation synced', {
        obsId,
        duration: `${syncDuration}ms`,
        type: obs.type,
        title: obs.title || '(untitled)'
      });
    }).catch((error) => {
      logger.error('VECTOR', `${agentName} vector sync failed, continuing without vector search`, {
        obsId,
        type: obs.type,
        title: obs.title || '(untitled)'
      }, error);
    });

    // Broadcast to SSE clients (for web UI)
    broadcastObservation(worker, {
      id: obsId,
      memory_session_id: session.memorySessionId,
      session_id: session.contentSessionId,
      type: obs.type,
      title: obs.title,
      subtitle: obs.subtitle,
      text: null,  // text field is not in ParsedObservation
      narrative: obs.narrative || null,
      facts: JSON.stringify(obs.facts || []),
      concepts: JSON.stringify(obs.concepts || []),
      files_read: JSON.stringify(obs.files_read || []),
      files_modified: JSON.stringify(obs.files_modified || []),
      project,
      prompt_number: session.lastPromptNumber,
      created_at_epoch: result.createdAtEpoch
    });
  }

  // Update folder CLAUDE.md files for touched folders (fire-and-forget)
  // This runs per-observation batch to ensure folders are updated as work happens
  const allFilePaths = collectAllFilePaths(observations);

  if (allFilePaths.length > 0) {
    updateFolderClaudeMdFiles(
      allFilePaths,
      project,
      getWorkerPort(),
      projectRoot
    ).catch(error => {
      logger.warn('FOLDER_INDEX', 'CLAUDE.md update failed (non-critical)', { project }, error as Error);
    });
  }
}

/**
 * Sync summary to vector database (Chroma/Qdrant) and broadcast to SSE clients
 */
async function syncAndBroadcastSummary(
  summary: ParsedSummary | null,
  summaryForStore: { request: string; investigated: string; learned: string; completed: string; next_steps: string; notes: string | null } | null,
  result: StorageResult,
  session: ActiveSession,
  project: string,
  dbManager: DatabaseManager,
  worker: WorkerRef | undefined,
  discoveryTokens: number,
  agentName: string
): Promise<void> {
  if (!summaryForStore || !result.summaryId) {
    return;
  }

  const syncStart = Date.now();

  // Sync to vector database (fire-and-forget)
  dbManager.getVectorSync().syncSummary(
    result.summaryId,
    session.contentSessionId,
    project,
    summaryForStore,
    session.lastPromptNumber,
    result.createdAtEpoch,
    discoveryTokens
  ).then(() => {
    const syncDuration = Date.now() - syncStart;
    logger.debug('VECTOR', 'Summary synced', {
      summaryId: result.summaryId,
      duration: `${syncDuration}ms`,
      request: summaryForStore.request || '(no request)'
    });
  }).catch((error) => {
    logger.error('VECTOR', `${agentName} vector sync failed, continuing without vector search`, {
      summaryId: result.summaryId,
      request: summaryForStore.request || '(no request)'
    }, error);
  });

  // Broadcast to SSE clients (for web UI)
  broadcastSummary(worker, {
    id: result.summaryId,
    session_id: session.contentSessionId,
    request: summary!.request,
    investigated: summary!.investigated,
    learned: summary!.learned,
    completed: summary!.completed,
    next_steps: summary!.next_steps,
    notes: summary!.notes,
    project,
    prompt_number: session.lastPromptNumber,
    created_at_epoch: result.createdAtEpoch
  });

  // Update Cursor context file for registered projects (fire-and-forget)
  updateCursorContextForProject(project, getWorkerPort()).catch(error => {
    logger.warn('CURSOR', 'Context update failed (non-critical)', { project }, error as Error);
  });
}
