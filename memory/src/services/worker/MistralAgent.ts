/**
 * MistralAgent: Mistral-based observation extraction
 *
 * Uses the official Mistral SDK with built-in retry/rate-limit handling.
 *
 * Responsibility:
 * - Call Mistral API via SDK for observation extraction
 * - Parse XML responses (same format as Claude)
 * - Sync to database and Chroma
 * - Automatic 429 rate-limit handling via SDK retry config
 */

import path from 'path';
import { homedir } from 'os';
import { Mistral } from '@mistralai/mistralai';
import { DatabaseManager } from './DatabaseManager.js';
import { SessionManager } from './SessionManager.js';
import { logger } from '../../utils/logger.js';
import { buildInitPrompt, buildObservationPrompt, buildBatchObservationPrompt, buildSummaryPrompt, buildContinuationPrompt, type Observation } from '../../sdk/prompts.js';
import { SettingsDefaultsManager } from '../../shared/SettingsDefaultsManager.js';
import type { ActiveSession, ConversationMessage } from '../worker-types.js';
import { ModeManager } from '../domain/ModeManager.js';
import {
  processAgentResponse,
  shouldFallbackToClaude,
  isAbortError,
  type WorkerRef,
  type FallbackAgent
} from './agents/index.js';

// Mistral model types (common models, API accepts any valid model ID)
export type MistralModel =
  | 'mistral-small-latest'
  | 'mistral-medium-latest'
  | 'mistral-large-latest'
  | 'open-mistral-nemo'
  | 'open-codestral-mamba'
  | 'codestral-latest'
  | 'devstral-small-latest'
  | string;  // Allow any model ID from API

/**
 * Mistral message format (OpenAI-compatible)
 */
interface MistralMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class MistralAgent {
  private dbManager: DatabaseManager;
  private sessionManager: SessionManager;
  private fallbackAgent: FallbackAgent | null = null;
  private mistralClient: Mistral | null = null;

  constructor(dbManager: DatabaseManager, sessionManager: SessionManager) {
    this.dbManager = dbManager;
    this.sessionManager = sessionManager;
  }

  /**
   * Set the fallback agent (Claude SDK) for when Mistral API fails
   * Must be set after construction to avoid circular dependency
   */
  setFallbackAgent(agent: FallbackAgent): void {
    this.fallbackAgent = agent;
  }

  /**
   * Get or create Mistral client with retry configuration
   * Uses exponential backoff for 429 rate limit handling
   */
  private getMistralClient(): Mistral {
    const { apiKey } = this.getMistralConfig();

    if (!this.mistralClient || !apiKey) {
      this.mistralClient = new Mistral({
        apiKey,
        // Request timeout - prevent hanging forever
        timeoutMs: 120000, // 2 minutes per request
        // Built-in retry with exponential backoff for 429 rate limits
        retryConfig: {
          strategy: 'backoff',
          backoff: {
            initialInterval: 2000,   // Start with 2 seconds (Mistral free tier is slow)
            maxInterval: 60000,      // Max 60 seconds between retries
            exponent: 2,             // Double the wait time each retry
            maxElapsedTime: 300000,  // Give up after 5 minutes total
          },
          retryConnectionErrors: true,
        },
      });
    }

    return this.mistralClient;
  }

  /**
   * Start Mistral agent for a session
   * Uses multi-turn conversation to maintain context across messages
   */
  async startSession(session: ActiveSession, worker?: WorkerRef): Promise<void> {
    try {
      // Get Mistral configuration
      const { apiKey, model } = this.getMistralConfig();

      if (!apiKey) {
        throw new Error('Mistral API key not configured. Set CLAUDE_MEM_MISTRAL_API_KEY in settings or MISTRAL_API_KEY environment variable.');
      }

      // Load active mode
      const mode = ModeManager.getInstance().getActiveMode();

      // Build initial prompt
      const initPrompt = session.lastPromptNumber === 1
        ? buildInitPrompt(session.project, session.contentSessionId, session.userPrompt, mode)
        : buildContinuationPrompt(session.userPrompt, session.lastPromptNumber, session.contentSessionId, mode);

      // Add to conversation history and query Mistral with full context
      session.conversationHistory.push({ role: 'user', content: initPrompt });
      const initResponse = await this.queryMistralMultiTurn(session.conversationHistory, model);

      if (initResponse.content) {
        // Add response to conversation history
        session.conversationHistory.push({ role: 'assistant', content: initResponse.content });

        // memory_session_id is now generated at session creation time (provider-agnostic UUID)
        // Just verify it exists - it should always be set now
        if (!session.memorySessionId) {
          throw new Error(`Session ${session.sessionDbId} has no memory_session_id - this should not happen`);
        }

        // Track token usage
        const inputTokens = initResponse.inputTokens || 0;
        const outputTokens = initResponse.outputTokens || 0;
        session.cumulativeInputTokens += inputTokens;
        session.cumulativeOutputTokens += outputTokens;

        // Process response using shared ResponseProcessor (no original timestamp for init - not from queue)
        await processAgentResponse(
          initResponse.content,
          session,
          this.dbManager,
          this.sessionManager,
          worker,
          inputTokens + outputTokens,
          null,
          'Mistral'
        );
      } else {
        logger.error('SDK', 'Empty Mistral init response - session may lack context', {
          sessionId: session.sessionDbId,
          model
        });
      }

      // Process pending messages with batch processing support
      // Track cwd from messages for CLAUDE.md generation
      let lastCwd: string | undefined;

      // Get batch size from settings (default: 5)
      const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
      const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
      const batchSize = parseInt(settings.CLAUDE_MEM_BATCH_SIZE, 10) || 5;

      // Buffer for batch processing
      interface BatchItem {
        observation: Observation;
        originalTimestamp: number | null;
        promptNumber: number | undefined;
        cwd: string | undefined;
      }
      const observationBatch: BatchItem[] = [];

      // Helper function to process a batch of observations
      const processBatch = async (batch: BatchItem[]): Promise<void> => {
        if (batch.length === 0) return;

        // CRITICAL: Check memorySessionId BEFORE making expensive LLM call
        if (!session.memorySessionId) {
          throw new Error('Cannot process observations: memorySessionId not yet captured. This session may need to be reinitialized.');
        }

        // Use earliest timestamp from batch for accurate ordering
        const earliestTimestamp = batch.reduce((min, item) =>
          item.originalTimestamp && (!min || item.originalTimestamp < min) ? item.originalTimestamp : min,
          batch[0].originalTimestamp
        );

        // Update last prompt number to highest in batch
        const maxPromptNumber = batch.reduce((max, item) =>
          item.promptNumber !== undefined && item.promptNumber > (max ?? 0) ? item.promptNumber : max,
          session.lastPromptNumber
        );
        if (maxPromptNumber !== undefined) {
          session.lastPromptNumber = maxPromptNumber;
        }

        // Build batch or single observation prompt
        const observations = batch.map(item => item.observation);
        const obsPrompt = batch.length === 1
          ? buildObservationPrompt(observations[0])
          : buildBatchObservationPrompt(observations);

        logger.info('SDK', `Processing batch of ${batch.length} observations`, {
          sessionId: session.sessionDbId,
          batchSize: batch.length,
          tools: observations.map(o => o.tool_name).join(', ')
        });

        // Add to conversation history and query Mistral
        session.conversationHistory.push({ role: 'user', content: obsPrompt });

        // Limit history to prevent exponential slowdown (keep first 2 + last 10 messages)
        if (session.conversationHistory.length > 12) {
          const first = session.conversationHistory.slice(0, 2);  // Init prompt + response
          const last = session.conversationHistory.slice(-10);    // Last 10 messages
          session.conversationHistory.length = 0;
          session.conversationHistory.push(...first, ...last);
        }

        const obsResponse = await this.queryMistralMultiTurn(session.conversationHistory, model);

        let tokensUsed = 0;
        if (obsResponse.content) {
          session.conversationHistory.push({ role: 'assistant', content: obsResponse.content });

          const inputTokens = obsResponse.inputTokens || 0;
          const outputTokens = obsResponse.outputTokens || 0;
          tokensUsed = inputTokens + outputTokens;
          session.cumulativeInputTokens += inputTokens;
          session.cumulativeOutputTokens += outputTokens;
        }

        // Process response (ResponseProcessor handles multiple observations)
        await processAgentResponse(
          obsResponse.content || '',
          session,
          this.dbManager,
          this.sessionManager,
          worker,
          tokensUsed,
          earliestTimestamp,
          'Mistral',
          lastCwd
        );
      };

      for await (const message of this.sessionManager.getMessageIterator(session.sessionDbId)) {
        // Capture cwd from each message for worktree support
        if (message.cwd) {
          lastCwd = message.cwd;
        }
        // Capture earliest timestamp BEFORE processing
        const originalTimestamp = session.earliestPendingTimestamp;

        if (message.type === 'observation') {
          // Add to batch
          observationBatch.push({
            observation: {
              id: 0,
              tool_name: message.tool_name!,
              tool_input: JSON.stringify(message.tool_input),
              tool_output: JSON.stringify(message.tool_response),
              created_at_epoch: originalTimestamp ?? Date.now(),
              cwd: message.cwd
            },
            originalTimestamp,
            promptNumber: message.prompt_number,
            cwd: message.cwd
          });

          // Process batch when full
          if (observationBatch.length >= batchSize) {
            await processBatch(observationBatch);
            observationBatch.length = 0; // Clear batch
          }

        } else if (message.type === 'summarize') {
          // Process any pending observations before summary
          if (observationBatch.length > 0) {
            await processBatch(observationBatch);
            observationBatch.length = 0;
          }

          // CRITICAL: Check memorySessionId BEFORE making expensive LLM call
          if (!session.memorySessionId) {
            throw new Error('Cannot process summary: memorySessionId not yet captured. This session may need to be reinitialized.');
          }

          // Build summary prompt
          const summaryPrompt = buildSummaryPrompt({
            id: session.sessionDbId,
            memory_session_id: session.memorySessionId,
            project: session.project,
            user_prompt: session.userPrompt,
            last_assistant_message: message.last_assistant_message || ''
          }, mode);

          // Add to conversation history and query Mistral with full context
          session.conversationHistory.push({ role: 'user', content: summaryPrompt });
          const summaryResponse = await this.queryMistralMultiTurn(session.conversationHistory, model);

          let tokensUsed = 0;
          if (summaryResponse.content) {
            session.conversationHistory.push({ role: 'assistant', content: summaryResponse.content });

            const inputTokens = summaryResponse.inputTokens || 0;
            const outputTokens = summaryResponse.outputTokens || 0;
            tokensUsed = inputTokens + outputTokens;
            session.cumulativeInputTokens += inputTokens;
            session.cumulativeOutputTokens += outputTokens;
          }

          // Process response using shared ResponseProcessor
          await processAgentResponse(
            summaryResponse.content || '',
            session,
            this.dbManager,
            this.sessionManager,
            worker,
            tokensUsed,
            originalTimestamp,
            'Mistral',
            lastCwd
          );
        }
      }

      // Process any remaining observations in batch
      if (observationBatch.length > 0) {
        await processBatch(observationBatch);
      }

      // Mark session complete
      const sessionDuration = Date.now() - session.startTime;
      logger.success('SDK', 'Mistral agent completed', {
        sessionId: session.sessionDbId,
        duration: `${(sessionDuration / 1000).toFixed(1)}s`,
        historyLength: session.conversationHistory.length
      });

    } catch (error: unknown) {
      if (isAbortError(error)) {
        logger.warn('SDK', 'Mistral agent aborted', { sessionId: session.sessionDbId });
        throw error;
      }

      // Check if we should fall back to Claude
      if (shouldFallbackToClaude(error) && this.fallbackAgent) {
        logger.warn('SDK', 'Mistral API failed, falling back to Claude SDK', {
          sessionDbId: session.sessionDbId,
          error: error instanceof Error ? error.message : String(error),
          historyLength: session.conversationHistory.length
        });

        // Fall back to Claude - it will use the same session with shared conversationHistory
        // Note: With claim-and-delete queue pattern, messages are already deleted on claim
        return this.fallbackAgent.startSession(session, worker);
      }

      logger.failure('SDK', 'Mistral agent error', { sessionDbId: session.sessionDbId }, error as Error);
      throw error;
    }
  }

  /**
   * Convert shared ConversationMessage array to Mistral's message format
   */
  private conversationToMistralMessages(history: ConversationMessage[]): MistralMessage[] {
    return history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  }

  /**
   * Query Mistral via SDK with full conversation history (multi-turn)
   * Sends the entire conversation context for coherent responses
   * SDK handles 429 rate limits automatically with exponential backoff
   */
  private async queryMistralMultiTurn(
    history: ConversationMessage[],
    model: MistralModel
  ): Promise<{ content: string; inputTokens?: number; outputTokens?: number }> {
    // Validate we have at least one message
    if (history.length === 0) {
      throw new Error('Cannot query Mistral: conversation history is empty');
    }

    const messages = this.conversationToMistralMessages(history);
    const totalChars = history.reduce((sum, m) => sum + m.content.length, 0);

    logger.debug('SDK', `Querying Mistral multi-turn (${model})`, {
      turns: history.length,
      totalChars
    });

    const client = this.getMistralClient();

    // SDK has built-in retry for 429 errors configured via retryConfig
    const response = await client.chat.complete({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.3,  // Lower temperature for structured extraction
      maxTokens: 4096,
    });

    const choice = response.choices?.[0];
    if (!choice?.message?.content) {
      logger.error('SDK', 'Empty response from Mistral');
      return { content: '' };
    }

    const content = typeof choice.message.content === 'string'
      ? choice.message.content
      : '';
    const inputTokens = response.usage?.promptTokens;
    const outputTokens = response.usage?.completionTokens;

    return { content, inputTokens, outputTokens };
  }

  /**
   * Get Mistral configuration from settings or environment
   */
  private getMistralConfig(): { apiKey: string; model: MistralModel } {
    const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
    const settings = SettingsDefaultsManager.loadFromFile(settingsPath);

    // API key: check settings first, then environment variable
    const apiKey = settings.CLAUDE_MEM_MISTRAL_API_KEY || process.env.MISTRAL_API_KEY || '';

    // Model: from settings or default (no strict validation - API accepts any valid model ID)
    const model = settings.CLAUDE_MEM_MISTRAL_MODEL || 'mistral-small-latest';

    return { apiKey, model };
  }
}

/**
 * Check if Mistral is available (has API key configured)
 */
export function isMistralAvailable(): boolean {
  const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  return !!(settings.CLAUDE_MEM_MISTRAL_API_KEY || process.env.MISTRAL_API_KEY);
}

/**
 * Check if Mistral is the selected provider
 */
export function isMistralSelected(): boolean {
  const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  return settings.CLAUDE_MEM_PROVIDER === 'mistral';
}
