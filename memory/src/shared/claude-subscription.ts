/**
 * Claude Subscription Detection
 *
 * Detects paid Claude Code subscriptions (max/pro tier) by reading
 * ~/.claude/.credentials.json. Used to route SDK calls through CLI
 * billing instead of direct API billing.
 */

import { readFileSync, existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import { CLAUDE_CREDENTIALS_PATH } from './paths.js';

const CREDENTIALS_PATH = CLAUDE_CREDENTIALS_PATH;

interface ClaudeCredentials {
  // Subscription tier: 'free', 'pro', 'max', etc.
  planType?: string;
  tier?: string;
  subscription?: {
    type?: string;
    tier?: string;
  };
  // Other possible fields
  [key: string]: unknown;
}

/**
 * Check if user has a paid Claude Code subscription (max or pro tier)
 * Returns true if the user should be billed through CLI instead of API
 */
export function hasPaidSubscription(): boolean {
  try {
    if (!existsSync(CREDENTIALS_PATH)) {
      logger.debug('SUBSCRIPTION', 'No credentials file found, assuming no subscription');
      return false;
    }

    const content = readFileSync(CREDENTIALS_PATH, 'utf-8');
    const credentials: ClaudeCredentials = JSON.parse(content);

    // Check various possible subscription indicators
    const tier = credentials.planType
      || credentials.tier
      || credentials.subscription?.type
      || credentials.subscription?.tier
      || '';

    const paidTiers = ['pro', 'max', 'team', 'enterprise'];
    const isPaid = paidTiers.some(t => tier.toLowerCase().includes(t));

    if (isPaid) {
      logger.debug('SUBSCRIPTION', 'Paid subscription detected', { tier });
    }

    return isPaid;
  } catch (error) {
    // If we can't read credentials, assume no subscription (safe default)
    logger.debug('SUBSCRIPTION', 'Could not read credentials', {}, error as Error);
    return false;
  }
}

/**
 * Temporarily remove ANTHROPIC_API_KEY from environment for paid subscribers
 * Returns a cleanup function to restore the key
 */
export function stripApiKeyForSubscriber(): (() => void) | null {
  if (!hasPaidSubscription()) {
    return null;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  logger.info('SUBSCRIPTION', 'Claude subscription detected - routing through CLI billing');
  delete process.env.ANTHROPIC_API_KEY;

  // Return cleanup function to restore the key
  return () => {
    process.env.ANTHROPIC_API_KEY = apiKey;
  };
}
