/**
 * Summarize Handler - Stop
 *
 * Extracted from summary-hook.ts - sends summary request to worker.
 * Transcript parsing stays in the hook because only the hook has access to
 * the transcript file path.
 */

import type { EventHandler, NormalizedHookInput, HookResult } from '../types.js';
import { tryEnsureWorkerRunning } from '../../shared/worker-utils.js';
import { getWorkerEndpointConfig } from '../../shared/remote-endpoint.js';
import { isRemoteMode } from '../../shared/remote-config.js';
import { fetchWithAuth } from '../../shared/fetch-with-auth.js';
import { isProjectExcluded, isMemoryDisabledByProjectConfig } from '../../shared/project-exclusion.js';
import { getProjectName } from '../../utils/project-name.js';
import { logger } from '../../utils/logger.js';
import { extractLastMessage } from '../../shared/transcript-parser.js';

export const summarizeHandler: EventHandler = {
  async execute(input: NormalizedHookInput): Promise<HookResult> {
    const endpointConfig = getWorkerEndpointConfig();

    // In local mode, try to ensure worker is running with a short timeout (2 seconds)
    // Summary is non-critical - if worker is not ready, skip silently
    if (!isRemoteMode()) {
      const workerStatus = await tryEnsureWorkerRunning(2000);
      if (!workerStatus.ready) {
        logger.debug('HOOK', 'summarize: Worker not ready, skipping summary', {
          waited: workerStatus.waited,
        });
        return { continue: true, suppressOutput: true };
      }
    }

    const { sessionId, cwd, transcriptPath } = input;

    // Check if memory is disabled via project-level .claude-mem.json (highest priority)
    if (isMemoryDisabledByProjectConfig(cwd)) {
      logger.debug('HOOK', 'summarize: Memory disabled by .claude-mem.json', { cwd });
      return { continue: true, suppressOutput: true };
    }

    // Check if project is excluded by glob pattern (global setting)
    const project = getProjectName(cwd);
    if (isProjectExcluded(project)) {
      logger.debug('HOOK', 'summarize: Project excluded by CLAUDE_MEM_EXCLUDE_PROJECTS', { project });
      return { continue: true, suppressOutput: true };
    }

    // Validate required fields before processing
    if (!transcriptPath) {
      throw new Error(`Missing transcriptPath in Stop hook input for session ${sessionId}`);
    }

    // Extract last assistant message from transcript (the work Claude did)
    // Note: "user" messages in transcripts are mostly tool_results, not actual user input.
    // The user's original request is already stored in user_prompts table.
    const lastAssistantMessage = extractLastMessage(transcriptPath, 'assistant', true);

    logger.dataIn('HOOK', 'Stop: Requesting summary', {
      workerUrl: endpointConfig.baseUrl,
      mode: endpointConfig.mode,
      hasLastAssistantMessage: !!lastAssistantMessage,
    });

    // Send to worker - worker handles privacy check and database operations
    const response = await fetchWithAuth(
      `${endpointConfig.baseUrl}/api/sessions/summarize`,
      {
        method: 'POST',
        body: JSON.stringify({
          contentSessionId: sessionId,
          last_assistant_message: lastAssistantMessage,
        }),
      },
      { endpointConfig }
    );

    if (!response.ok) {
      // Return standard response even on failure (matches original behavior)
      return { continue: true, suppressOutput: true };
    }

    logger.debug('HOOK', 'Summary request sent successfully', {
      mode: endpointConfig.mode,
    });

    return { continue: true, suppressOutput: true };
  },
};
