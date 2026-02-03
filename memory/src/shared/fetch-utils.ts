/**
 * Fetch Utilities
 *
 * Provides retry logic with exponential backoff for transient network errors.
 * Handles ECONNRESET, ECONNREFUSED, ETIMEDOUT, UND_ERR_SOCKET errors.
 */

/** Errors that should trigger a retry */
const RETRYABLE_ERRORS = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT'
];

/** Check if error is retryable */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code && RETRYABLE_ERRORS.includes(code)) {
      return true;
    }
    // Check message for error patterns
    const message = error.message || '';
    return RETRYABLE_ERRORS.some(e => message.includes(e));
  }
  return false;
}

/** Calculate backoff delay with jitter */
function getBackoffDelay(attempt: number, baseMs = 100, maxMs = 1000): number {
  // Exponential: 100ms, 200ms, 400ms...
  const exponential = baseMs * Math.pow(2, attempt);
  // Cap at max
  const capped = Math.min(exponential, maxMs);
  // Add jitter: ±25%
  const jitter = capped * 0.25 * (Math.random() * 2 - 1);
  return Math.round(capped + jitter);
}

/** Sleep for specified milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface FetchWithRetryOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms (default: 100) */
  baseDelayMs?: number;
  /** Maximum delay in ms (default: 1000) */
  maxDelayMs?: number;
}

/**
 * Fetch with automatic retry for transient network errors.
 *
 * Uses exponential backoff with jitter:
 * - 4 total attempts (1 initial + 3 retries)
 * - Delays: ~100ms, ~200ms, ~400ms
 * - Only retries on socket/connection errors
 *
 * @param url - Request URL
 * @param init - Fetch options
 * @param options - Retry configuration
 * @returns Response from successful fetch
 * @throws Last error if all retries fail
 */
export async function fetchWithRetry(
  url: string | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelayMs = 100, maxDelayMs = 1000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error as Error;

      // Only retry on transient network errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        throw error;
      }

      // Wait before retrying
      const delay = getBackoffDelay(attempt, baseDelayMs, maxDelayMs);
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error('fetchWithRetry failed');
}
