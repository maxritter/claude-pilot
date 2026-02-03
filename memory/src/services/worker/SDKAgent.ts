/**
 * SDKAgent: SDK query loop handler
 *
 * Responsibility:
 * - Spawn Claude subprocess via Agent SDK
 * - Run event-driven query loop (no polling)
 * - Process SDK responses (observations, summaries)
 * - Sync to database and Chroma
 */

import { execSync } from 'child_process';
import { homedir } from 'os';
import path from 'path';
import { DatabaseManager } from './DatabaseManager.js';
import { SessionManager } from './SessionManager.js';
import { logger } from '../../utils/logger.js';
import { buildInitPrompt, buildObservationPrompt, buildSummaryPrompt, buildContinuationPrompt } from '../../sdk/prompts.js';
import { SettingsDefaultsManager } from '../../shared/SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH } from '../../shared/paths.js';
import type { ActiveSession } from '../worker-types.js';
import { ModeManager } from '../domain/ModeManager.js';
import { processAgentResponse, type WorkerRef } from './agents/index.js';
import { stripApiKeyForSubscriber } from '../../shared/claude-subscription.js';

// Import Agent SDK V2 API
// @ts-ignore - Agent SDK types may not be available
import { unstable_v2_createSession, type SDKSession } from '@anthropic-ai/claude-agent-sdk';

export class SDKAgent {
  private dbManager: DatabaseManager;
  private sessionManager: SessionManager;

  constructor(dbManager: DatabaseManager, sessionManager: SessionManager) {
    this.dbManager = dbManager;
    this.sessionManager = sessionManager;
  }

  /**
   * Start SDK agent for a session using V2 API (send/stream pattern)
   * @param worker WorkerService reference for spinner control (optional)
   */
  async startSession(session: ActiveSession, worker?: WorkerRef): Promise<void> {
    // Track cwd from messages for CLAUDE.md generation (worktree support)
    let lastCwd: string | undefined;

    // Find Claude executable
    const claudePath = this.findClaudeExecutable();

    // Get model ID and disallowed tools
    const modelId = this.getModelId();
    // Memory agent is OBSERVER ONLY - no tools allowed
    const disallowedTools = [
      'Bash',           // Prevent infinite loops
      'Read',           // No file reading
      'Write',          // No file writing
      'Edit',           // No file editing
      'Grep',           // No code searching
      'Glob',           // No file pattern matching
      'WebFetch',       // No web fetching
      'WebSearch',      // No web searching
      'Task',           // No spawning sub-agents
      'NotebookEdit',   // No notebook editing
      'AskUserQuestion',// No asking questions
      'TodoWrite'       // No todo management
    ];

    // memory_session_id is now generated at session creation time (provider-agnostic UUID)
    // Just verify it exists - it should always be set now
    if (!session.memorySessionId) {
      throw new Error(`Session ${session.sessionDbId} has no memory_session_id - this should not happen`);
    }

    logger.info('SDK', 'Starting SDK V2 session', {
      sessionDbId: session.sessionDbId,
      contentSessionId: session.contentSessionId,
      memorySessionId: session.memorySessionId,
      lastPromptNumber: session.lastPromptNumber
    });

    // Always create fresh Claude SDK sessions
    // Note: We don't use Claude's --resume because our memory_session_id is a provider-agnostic UUID,
    // not a Claude session ID. Each observation is processed independently anyway.
    const sessionOptions = {
      model: modelId,
      disallowedTools,
      pathToClaudeCodeExecutable: claudePath
    };

    // Strip ANTHROPIC_API_KEY for paid subscribers to route through CLI billing
    const restoreApiKey = stripApiKeyForSubscriber();

    const sdkSession: SDKSession = unstable_v2_createSession(sessionOptions);

    try {
      // Load active mode
      const mode = ModeManager.getInstance().getActiveMode();

      // Build and send initial prompt
      const isInitPrompt = session.lastPromptNumber === 1;
      const initPrompt = isInitPrompt
        ? buildInitPrompt(session.project, session.contentSessionId, session.userPrompt, mode)
        : buildContinuationPrompt(session.userPrompt, session.lastPromptNumber, session.contentSessionId, mode);

      // Add to shared conversation history for provider interop
      session.conversationHistory.push({ role: 'user', content: initPrompt });

      // Send initial prompt
      await sdkSession.send(initPrompt);

      // Process initial response
      await this.processStreamResponse(sdkSession, session, worker, lastCwd);

      // Process pending messages from queue (event-driven, no polling)
      for await (const message of this.sessionManager.getMessageIterator(session.sessionDbId)) {
        // Check for abort
        if (session.abortController.signal.aborted) {
          logger.warn('SDK', 'Session aborted', { sessionId: session.sessionDbId });
          break;
        }

        // Capture cwd from each message for worktree support
        if (message.cwd) {
          lastCwd = message.cwd;
        }

        if (message.type === 'observation') {
          // Update last prompt number
          if (message.prompt_number !== undefined) {
            session.lastPromptNumber = message.prompt_number;
          }

          const obsPrompt = buildObservationPrompt({
            id: 0,
            tool_name: message.tool_name!,
            tool_input: JSON.stringify(message.tool_input),
            tool_output: JSON.stringify(message.tool_response),
            created_at_epoch: message._originalTimestamp ?? Date.now(),
            cwd: message.cwd
          });

          // Add to shared conversation history
          session.conversationHistory.push({ role: 'user', content: obsPrompt });

          // Limit history to prevent exponential slowdown (keep first 2 + last 10 messages)
          if (session.conversationHistory.length > 12) {
            const first = session.conversationHistory.slice(0, 2);  // Init prompt + response
            const last = session.conversationHistory.slice(-10);    // Last 10 messages
            session.conversationHistory.length = 0;
            session.conversationHistory.push(...first, ...last);
          }

          // Send and process response
          await sdkSession.send(obsPrompt);
          await this.processStreamResponse(sdkSession, session, worker, lastCwd);

        } else if (message.type === 'summarize') {
          const summaryPrompt = buildSummaryPrompt({
            id: session.sessionDbId,
            memory_session_id: session.memorySessionId,
            project: session.project,
            user_prompt: session.userPrompt,
            last_assistant_message: message.last_assistant_message || ''
          }, mode);

          // Add to shared conversation history
          session.conversationHistory.push({ role: 'user', content: summaryPrompt });

          // Send and process response
          await sdkSession.send(summaryPrompt);
          await this.processStreamResponse(sdkSession, session, worker, lastCwd);
        }
      }

      // Mark session complete
      const sessionDuration = Date.now() - session.startTime;
      logger.success('SDK', 'V2 Agent completed', {
        sessionId: session.sessionDbId,
        duration: `${(sessionDuration / 1000).toFixed(1)}s`
      });

    } finally {
      // Always close the session
      sdkSession.close();

      // Restore API key if it was stripped for subscriber billing
      if (restoreApiKey) {
        restoreApiKey();
      }
    }
  }

  /**
   * Process stream response from V2 session
   * Handles message capture, token tracking, and response processing
   */
  private async processStreamResponse(
    sdkSession: SDKSession,
    session: ActiveSession,
    worker: WorkerRef | undefined,
    lastCwd: string | undefined
  ): Promise<void> {
    // Capture earliest timestamp BEFORE processing
    const originalTimestamp = session.earliestPendingTimestamp;

    for await (const message of sdkSession.stream()) {
      // Note: memory_session_id is now generated at session creation time (provider-agnostic UUID)
      // We don't capture the Claude SDK session_id anymore since we manage our own IDs

      // Handle assistant messages
      if (message.type === 'assistant') {
        const content = message.message.content;
        const textContent = Array.isArray(content)
          ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
          : typeof content === 'string' ? content : '';

        const responseSize = textContent.length;

        // Capture token state BEFORE updating (for delta calculation)
        const tokensBeforeResponse = session.cumulativeInputTokens + session.cumulativeOutputTokens;

        // Extract and track token usage
        const usage = message.message.usage;
        if (usage) {
          session.cumulativeInputTokens += usage.input_tokens || 0;
          session.cumulativeOutputTokens += usage.output_tokens || 0;

          if (usage.cache_creation_input_tokens) {
            session.cumulativeInputTokens += usage.cache_creation_input_tokens;
          }

          logger.debug('SDK', 'Token usage captured', {
            sessionId: session.sessionDbId,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cumulativeInput: session.cumulativeInputTokens,
            cumulativeOutput: session.cumulativeOutputTokens
          });
        }

        // Calculate discovery tokens (delta for this response only)
        const discoveryTokens = (session.cumulativeInputTokens + session.cumulativeOutputTokens) - tokensBeforeResponse;

        if (responseSize > 0) {
          const truncatedResponse = responseSize > 100
            ? textContent.substring(0, 100) + '...'
            : textContent;
          logger.dataOut('SDK', `V2 Response received (${responseSize} chars)`, {
            sessionId: session.sessionDbId,
            promptNumber: session.lastPromptNumber
          }, truncatedResponse);
        }

        // Process response using shared ResponseProcessor
        await processAgentResponse(
          textContent,
          session,
          this.dbManager,
          this.sessionManager,
          worker,
          discoveryTokens,
          originalTimestamp,
          'SDK',
          lastCwd
        );
      }
    }
  }

  // ============================================================================
  // Configuration Helpers
  // ============================================================================

  /**
   * Find Claude executable (inline, called once per session)
   */
  private findClaudeExecutable(): string {
    const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);

    // 1. Check configured path
    if (settings.CLAUDE_CODE_PATH) {
      // Lazy load fs to keep startup fast
      const { existsSync } = require('fs');
      if (!existsSync(settings.CLAUDE_CODE_PATH)) {
        throw new Error(`CLAUDE_CODE_PATH is set to "${settings.CLAUDE_CODE_PATH}" but the file does not exist.`);
      }
      return settings.CLAUDE_CODE_PATH;
    }

    // 2. Try auto-detection
    try {
      const claudePath = execSync(
        process.platform === 'win32' ? 'where claude' : 'which claude',
        { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
      ).trim().split('\n')[0].trim();

      if (claudePath) return claudePath;
    } catch (error) {
      // [ANTI-PATTERN IGNORED]: Fallback behavior - which/where failed, continue to throw clear error
      logger.debug('SDK', 'Claude executable auto-detection failed', {}, error as Error);
    }

    throw new Error('Claude executable not found. Please either:\n1. Add "claude" to your system PATH, or\n2. Set CLAUDE_CODE_PATH in ~/.claude-mem/settings.json');
  }

  /**
   * Get model ID from settings or environment
   */
  private getModelId(): string {
    const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
    const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
    return settings.CLAUDE_MEM_MODEL;
  }
}
