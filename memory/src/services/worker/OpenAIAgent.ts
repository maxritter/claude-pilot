/**
 * OpenAIAgent: OpenAI-based observation extraction
 *
 * Uses the official OpenAI SDK with built-in retry/rate-limit handling.
 * Supports OpenAI API, Azure OpenAI, and any OpenAI-compatible API.
 *
 * Responsibility:
 * - Call OpenAI API via SDK for observation extraction
 * - Parse XML responses (same format as Claude)
 * - Sync to database and Chroma
 * - Automatic rate-limit handling via SDK retry config
 */

import path from 'path';
import { homedir } from 'os';
import OpenAI from 'openai';
import { DatabaseManager } from './DatabaseManager.js';
import { SessionManager } from './SessionManager.js';
import { logger } from '../../utils/logger.js';
import { buildInitPrompt, buildObservationPrompt, buildSummaryPrompt, buildContinuationPrompt } from '../../sdk/prompts.js';
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

// OpenAI model types
export type OpenAIModel =
  | 'gpt-4o-mini'
  | 'gpt-4o'
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | string;  // Allow any model ID

/**
 * OpenAI message format
 */
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OpenAIAgent {
  private dbManager: DatabaseManager;
  private sessionManager: SessionManager;
  private fallbackAgent: FallbackAgent | null = null;
  private openaiClient: OpenAI | null = null;

  constructor(dbManager: DatabaseManager, sessionManager: SessionManager) {
    this.dbManager = dbManager;
    this.sessionManager = sessionManager;
  }

  /**
   * Set the fallback agent (Claude SDK) for when OpenAI API fails
   * Must be set after construction to avoid circular dependency
   */
  setFallbackAgent(agent: FallbackAgent): void {
    this.fallbackAgent = agent;
  }

  /**
   * Get or create OpenAI client with retry configuration
   * Uses exponential backoff for rate limit handling
   */
  private getOpenAIClient(): OpenAI {
    const { apiKey, baseUrl } = this.getOpenAIConfig();

    if (!this.openaiClient || !apiKey) {
      this.openaiClient = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
        // OpenAI SDK has built-in retry with exponential backoff
        maxRetries: 5,
        timeout: 300000,  // 5 minute timeout
      });
    }

    return this.openaiClient;
  }

  /**
   * Start OpenAI agent for a session
   * Uses multi-turn conversation to maintain context across messages
   */
  async startSession(session: ActiveSession, worker?: WorkerRef): Promise<void> {
    try {
      // Get OpenAI configuration
      const { apiKey, model } = this.getOpenAIConfig();

      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Set CLAUDE_MEM_OPENAI_API_KEY in settings or OPENAI_API_KEY environment variable.');
      }

      // Load active mode
      const mode = ModeManager.getInstance().getActiveMode();

      // Build initial prompt
      const initPrompt = session.lastPromptNumber === 1
        ? buildInitPrompt(session.project, session.contentSessionId, session.userPrompt, mode)
        : buildContinuationPrompt(session.userPrompt, session.lastPromptNumber, session.contentSessionId, mode);

      // Add to conversation history and query OpenAI with full context
      session.conversationHistory.push({ role: 'user', content: initPrompt });
      const initResponse = await this.queryOpenAIMultiTurn(session.conversationHistory, model);

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

        // Process response using shared ResponseProcessor
        await processAgentResponse(
          initResponse.content,
          session,
          this.dbManager,
          this.sessionManager,
          worker,
          inputTokens + outputTokens,
          null,
          'OpenAI'
        );
      } else {
        logger.error('SDK', 'Empty OpenAI init response - session may lack context', {
          sessionId: session.sessionDbId,
          model
        });
      }

      // Process pending messages
      let lastCwd: string | undefined;

      for await (const message of this.sessionManager.getMessageIterator(session.sessionDbId)) {
        if (message.cwd) {
          lastCwd = message.cwd;
        }
        const originalTimestamp = session.earliestPendingTimestamp;

        if (message.type === 'observation') {
          if (message.prompt_number !== undefined) {
            session.lastPromptNumber = message.prompt_number;
          }

          if (!session.memorySessionId) {
            throw new Error('Cannot process observations: memorySessionId not yet captured.');
          }

          const obsPrompt = buildObservationPrompt({
            id: 0,
            tool_name: message.tool_name!,
            tool_input: JSON.stringify(message.tool_input),
            tool_output: JSON.stringify(message.tool_response),
            created_at_epoch: originalTimestamp ?? Date.now(),
            cwd: message.cwd
          });

          session.conversationHistory.push({ role: 'user', content: obsPrompt });
          const obsResponse = await this.queryOpenAIMultiTurn(session.conversationHistory, model);

          let tokensUsed = 0;
          if (obsResponse.content) {
            session.conversationHistory.push({ role: 'assistant', content: obsResponse.content });
            const inputTokens = obsResponse.inputTokens || 0;
            const outputTokens = obsResponse.outputTokens || 0;
            tokensUsed = inputTokens + outputTokens;
            session.cumulativeInputTokens += inputTokens;
            session.cumulativeOutputTokens += outputTokens;
          }

          await processAgentResponse(
            obsResponse.content || '',
            session,
            this.dbManager,
            this.sessionManager,
            worker,
            tokensUsed,
            originalTimestamp,
            'OpenAI',
            lastCwd
          );

        } else if (message.type === 'summarize') {
          if (!session.memorySessionId) {
            throw new Error('Cannot process summary: memorySessionId not yet captured.');
          }

          const summaryPrompt = buildSummaryPrompt({
            id: session.sessionDbId,
            memory_session_id: session.memorySessionId,
            project: session.project,
            user_prompt: session.userPrompt,
            last_assistant_message: message.last_assistant_message || ''
          }, mode);

          session.conversationHistory.push({ role: 'user', content: summaryPrompt });
          const summaryResponse = await this.queryOpenAIMultiTurn(session.conversationHistory, model);

          let tokensUsed = 0;
          if (summaryResponse.content) {
            session.conversationHistory.push({ role: 'assistant', content: summaryResponse.content });
            const inputTokens = summaryResponse.inputTokens || 0;
            const outputTokens = summaryResponse.outputTokens || 0;
            tokensUsed = inputTokens + outputTokens;
            session.cumulativeInputTokens += inputTokens;
            session.cumulativeOutputTokens += outputTokens;
          }

          await processAgentResponse(
            summaryResponse.content || '',
            session,
            this.dbManager,
            this.sessionManager,
            worker,
            tokensUsed,
            originalTimestamp,
            'OpenAI',
            lastCwd
          );
        }
      }

      // Mark session complete
      const sessionDuration = Date.now() - session.startTime;
      logger.success('SDK', 'OpenAI agent completed', {
        sessionId: session.sessionDbId,
        duration: `${(sessionDuration / 1000).toFixed(1)}s`,
        historyLength: session.conversationHistory.length
      });

    } catch (error: unknown) {
      if (isAbortError(error)) {
        logger.warn('SDK', 'OpenAI agent aborted', { sessionId: session.sessionDbId });
        throw error;
      }

      // Check if we should fall back to Claude
      if (shouldFallbackToClaude(error) && this.fallbackAgent) {
        logger.warn('SDK', 'OpenAI API failed, falling back to Claude SDK', {
          sessionDbId: session.sessionDbId,
          error: error instanceof Error ? error.message : String(error),
          historyLength: session.conversationHistory.length
        });

        return this.fallbackAgent.startSession(session, worker);
      }

      logger.failure('SDK', 'OpenAI agent error', { sessionDbId: session.sessionDbId }, error as Error);
      throw error;
    }
  }

  /**
   * Convert shared ConversationMessage array to OpenAI's message format
   */
  private conversationToOpenAIMessages(history: ConversationMessage[]): OpenAIMessage[] {
    return history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  }

  /**
   * Query OpenAI via SDK with full conversation history (multi-turn)
   * SDK handles rate limits automatically with exponential backoff
   */
  private async queryOpenAIMultiTurn(
    history: ConversationMessage[],
    model: OpenAIModel
  ): Promise<{ content: string; inputTokens?: number; outputTokens?: number }> {
    if (history.length === 0) {
      throw new Error('Cannot query OpenAI: conversation history is empty');
    }

    const messages = this.conversationToOpenAIMessages(history);
    const totalChars = history.reduce((sum, m) => sum + m.content.length, 0);

    logger.debug('SDK', `Querying OpenAI multi-turn (${model})`, {
      turns: history.length,
      totalChars
    });

    const client = this.getOpenAIClient();

    // SDK has built-in retry for rate limit errors
    const response = await client.chat.completions.create({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.3,
      max_tokens: 4096,
    });

    const choice = response.choices?.[0];
    if (!choice?.message?.content) {
      logger.error('SDK', 'Empty response from OpenAI');
      return { content: '' };
    }

    const content = choice.message.content;
    const inputTokens = response.usage?.prompt_tokens;
    const outputTokens = response.usage?.completion_tokens;

    return { content, inputTokens, outputTokens };
  }

  /**
   * Get OpenAI configuration from settings or environment
   */
  private getOpenAIConfig(): { apiKey: string; model: OpenAIModel; baseUrl: string } {
    const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
    const settings = SettingsDefaultsManager.loadFromFile(settingsPath);

    // API key: check settings first, then environment variable
    const apiKey = settings.CLAUDE_MEM_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';

    // Model: from settings or default
    const model = settings.CLAUDE_MEM_OPENAI_MODEL || 'gpt-4o-mini';

    // Base URL: for Azure/compatible APIs
    const baseUrl = settings.CLAUDE_MEM_OPENAI_BASE_URL || '';

    return { apiKey, model, baseUrl };
  }
}

/**
 * Check if OpenAI is available (has API key configured)
 */
export function isOpenAIAvailable(): boolean {
  const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  return !!(settings.CLAUDE_MEM_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Check if OpenAI is the selected provider
 */
export function isOpenAISelected(): boolean {
  const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  return settings.CLAUDE_MEM_PROVIDER === 'openai';
}
