/**
 * Session Init Handler - UserPromptSubmit
 *
 * Extracted from new-hook.ts - initializes session and starts SDK agent.
 */

import type { EventHandler, NormalizedHookInput, HookResult } from '../types.js';
import { tryEnsureWorkerRunning } from '../../shared/worker-utils.js';
import { getWorkerEndpointConfig } from '../../shared/remote-endpoint.js';
import { isRemoteMode } from '../../shared/remote-config.js';
import { fetchWithAuth } from '../../shared/fetch-with-auth.js';
import { isProjectExcluded, isMemoryDisabledByProjectConfig } from '../../shared/project-exclusion.js';
import { getProjectName } from '../../utils/project-name.js';
import { logger } from '../../utils/logger.js';

export const sessionInitHandler: EventHandler = {
  async execute(input: NormalizedHookInput): Promise<HookResult> {
    const endpointConfig = getWorkerEndpointConfig();

    // In local mode, try to ensure worker is running with a short timeout (3 seconds)
    // If worker is not ready, proceed gracefully - memory features will be limited
    if (!isRemoteMode()) {
      const workerStatus = await tryEnsureWorkerRunning(3000);
      if (!workerStatus.ready) {
        logger.info('HOOK', 'session-init: Worker not ready, memory features disabled for this session', {
          waited: workerStatus.waited,
        });
        // Return success but with suppressed output - don't block Claude Code
        return { continue: true, suppressOutput: true };
      }
    }

    const { sessionId, cwd, prompt } = input;

    // Handle empty prompts gracefully (e.g., Codex CLI can start sessions without initial prompt)
    if (!prompt) {
      logger.debug('HOOK', 'session-init: Empty prompt received, skipping session initialization');
      return { continue: true, suppressOutput: true };
    }

    const project = getProjectName(cwd);

    // Check if memory is disabled via project-level .claude-mem.json (highest priority)
    if (isMemoryDisabledByProjectConfig(cwd)) {
      logger.debug('HOOK', 'session-init: Memory disabled by .claude-mem.json', { project, cwd });
      return { continue: true, suppressOutput: true };
    }

    // Check if project is excluded by glob pattern (global setting)
    if (isProjectExcluded(project)) {
      logger.debug('HOOK', 'session-init: Project excluded by CLAUDE_MEM_EXCLUDE_PROJECTS', { project });
      return { continue: true, suppressOutput: true };
    }

    logger.debug('HOOK', 'session-init: Calling /api/sessions/init', {
      contentSessionId: sessionId,
      project,
      mode: endpointConfig.mode,
    });

    // Initialize session via HTTP - handles DB operations and privacy checks
    const initResponse = await fetchWithAuth(
      `${endpointConfig.baseUrl}/api/sessions/init`,
      {
        method: 'POST',
        body: JSON.stringify({
          contentSessionId: sessionId,
          project,
          prompt,
        }),
      },
      { endpointConfig }
    );

    if (!initResponse.ok) {
      throw new Error(`Session initialization failed: ${initResponse.status}`);
    }

    const initResult = await initResponse.json() as {
      sessionDbId: number;
      promptNumber: number;
      skipped?: boolean;
      reason?: string;
    };
    const sessionDbId = initResult.sessionDbId;
    const promptNumber = initResult.promptNumber;

    logger.debug('HOOK', 'session-init: Received from /api/sessions/init', {
      sessionDbId,
      promptNumber,
      skipped: initResult.skipped,
    });

    // Debug-level alignment log for detailed tracing
    logger.debug('HOOK', `[ALIGNMENT] Hook Entry | contentSessionId=${sessionId} | prompt#=${promptNumber} | sessionDbId=${sessionDbId}`);

    // Check if prompt was entirely private (worker performs privacy check)
    if (initResult.skipped && initResult.reason === 'private') {
      logger.info('HOOK', `INIT_COMPLETE | sessionDbId=${sessionDbId} | promptNumber=${promptNumber} | skipped=true | reason=private`, {
        sessionId: sessionDbId,
      });
      return { continue: true, suppressOutput: true };
    }

    // Only initialize SDK agent for Claude Code (not Cursor)
    // Cursor doesn't use the SDK agent - it only needs session/observation storage
    if (input.platform !== 'cursor' && sessionDbId) {
      // Strip leading slash from commands for memory agent
      // /review 101 -> review 101 (more semantic for observations)
      const cleanedPrompt = prompt.startsWith('/') ? prompt.substring(1) : prompt;

      logger.debug('HOOK', 'session-init: Calling /sessions/{sessionDbId}/init', { sessionDbId, promptNumber });

      // Initialize SDK agent session via HTTP (starts the agent!)
      const response = await fetchWithAuth(
        `${endpointConfig.baseUrl}/sessions/${sessionDbId}/init`,
        {
          method: 'POST',
          body: JSON.stringify({ userPrompt: cleanedPrompt, promptNumber }),
        },
        { endpointConfig }
      );

      if (!response.ok) {
        throw new Error(`SDK agent start failed: ${response.status}`);
      }
    } else if (input.platform === 'cursor') {
      logger.debug('HOOK', 'session-init: Skipping SDK agent init for Cursor platform', { sessionDbId, promptNumber });
    }

    logger.info('HOOK', `INIT_COMPLETE | sessionDbId=${sessionDbId} | promptNumber=${promptNumber} | project=${project}`, {
      sessionId: sessionDbId,
    });

    return { continue: true, suppressOutput: true };
  },
};
