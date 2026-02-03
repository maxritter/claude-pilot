/**
 * File Edit Handler - Cursor-specific afterFileEdit
 *
 * Handles file edit observations from Cursor IDE.
 * Similar to observation handler but with file-specific metadata.
 */

import type { EventHandler, NormalizedHookInput, HookResult } from '../types.js';
import { tryEnsureWorkerRunning, getWorkerBaseUrl } from '../../shared/worker-utils.js';
import { fetchWithRetry } from '../../shared/fetch-utils.js';
import { isProjectExcluded, isMemoryDisabledByProjectConfig } from '../../shared/project-exclusion.js';
import { getProjectName } from '../../utils/project-name.js';
import { logger } from '../../utils/logger.js';

export const fileEditHandler: EventHandler = {
  async execute(input: NormalizedHookInput): Promise<HookResult> {
    // Try to ensure worker is running with a short timeout (2 seconds)
    // File edits are non-critical - if worker is not ready, skip silently
    const workerStatus = await tryEnsureWorkerRunning(2000);
    if (!workerStatus.ready) {
      logger.debug('HOOK', 'file-edit: Worker not ready, skipping file edit observation', {
        waited: workerStatus.waited
      });
      return { continue: true, suppressOutput: true };
    }

    const { sessionId, cwd, filePath, edits } = input;

    if (!filePath) {
      throw new Error('fileEditHandler requires filePath');
    }

    // Check if memory is disabled via project-level .claude-mem.json (highest priority)
    if (isMemoryDisabledByProjectConfig(cwd)) {
      logger.debug('HOOK', 'file-edit: Memory disabled by .claude-mem.json', { cwd });
      return { continue: true, suppressOutput: true };
    }

    // Check if project is excluded by glob pattern (global setting)
    const project = getProjectName(cwd);
    if (isProjectExcluded(project)) {
      logger.debug('HOOK', 'file-edit: Project excluded by CLAUDE_MEM_EXCLUDE_PROJECTS', { project });
      return { continue: true, suppressOutput: true };
    }

    const baseUrl = getWorkerBaseUrl();

    logger.dataIn('HOOK', `FileEdit: ${filePath}`, {
      workerUrl: baseUrl,
      editCount: edits?.length ?? 0
    });

    // Validate required fields before sending to worker
    if (!cwd) {
      throw new Error(`Missing cwd in FileEdit hook input for session ${sessionId}, file ${filePath}`);
    }

    // Send to worker as an observation with file edit metadata
    // The observation handler on the worker will process this appropriately
    const response = await fetchWithRetry(`${baseUrl}/api/sessions/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentSessionId: sessionId,
        tool_name: 'write_file',
        tool_input: { filePath, edits },
        tool_response: { success: true },
        cwd
      })
      // Note: Removed signal to avoid Windows Bun cleanup issue (libuv assertion)
    });

    if (!response.ok) {
      throw new Error(`File edit observation storage failed: ${response.status}`);
    }

    logger.debug('HOOK', 'File edit observation sent successfully', { filePath });

    return { continue: true, suppressOutput: true };
  }
};
