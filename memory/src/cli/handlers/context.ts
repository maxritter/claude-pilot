/**
 * Context Handler - SessionStart
 *
 * Extracted from context-hook.ts - calls worker to generate context.
 * Returns context as hookSpecificOutput for Claude Code to inject.
 */

import type { EventHandler, NormalizedHookInput, HookResult } from '../types.js';
import { tryEnsureWorkerRunning } from '../../shared/worker-utils.js';
import { getWorkerEndpointConfig } from '../../shared/remote-endpoint.js';
import { isRemoteMode } from '../../shared/remote-config.js';
import { fetchWithAuth } from '../../shared/fetch-with-auth.js';
import { getProjectContext } from '../../utils/project-name.js';
import { logger } from '../../utils/logger.js';

export const contextHandler: EventHandler = {
  async execute(input: NormalizedHookInput): Promise<HookResult> {
    // Check for fresh session (no memory context)
    // Usage: CLAUDE_MEM_NO_CONTEXT=1 claude
    if (process.env.CLAUDE_MEM_NO_CONTEXT === '1' || process.env.CLAUDE_MEM_NO_CONTEXT === 'true') {
      return {
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: '',  // Empty context for fresh session
        },
      };
    }

    const endpointConfig = getWorkerEndpointConfig();

    // In local mode, try to ensure worker is running with a short timeout (3 seconds)
    // Context is important but we shouldn't block Claude Code startup
    if (!isRemoteMode()) {
      const workerStatus = await tryEnsureWorkerRunning(3000);
      if (!workerStatus.ready) {
        logger.info('HOOK', 'context: Worker not ready, proceeding without memory context', {
          waited: workerStatus.waited,
        });
        return {
          hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: '',  // Empty context when worker not ready
          },
        };
      }
    }

    const cwd = input.cwd ?? process.cwd();
    const context = getProjectContext(cwd);

    // Pass all projects (parent + worktree if applicable) for unified timeline
    const projectsParam = context.allProjects.join(',');
    const url = `${endpointConfig.baseUrl}/api/context/inject?projects=${encodeURIComponent(projectsParam)}`;

    // Note: Removed AbortSignal.timeout due to Windows Bun cleanup issue (libuv assertion)
    // Worker service has its own timeouts, so client-side timeout is redundant
    const response = await fetchWithAuth(url, undefined, { endpointConfig });

    if (!response.ok) {
      throw new Error(`Context generation failed: ${response.status}`);
    }

    const result = await response.text();
    const additionalContext = result.trim();

    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext,
      },
    };
  },
};
