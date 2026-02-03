/**
 * API endpoint paths
 * Centralized to avoid magic strings scattered throughout the codebase
 */
export const API_ENDPOINTS = {
  BASE: '/api',
  OBSERVATIONS: '/api/observations',
  SUMMARIES: '/api/summaries',
  PROMPTS: '/api/prompts',
  SETTINGS: '/api/settings',
  STATS: '/api/stats',
  PROCESSING_STATUS: '/api/processing-status',
  HEALTH: '/api/health',
  RESTART: '/api/restart',
  STREAM: '/stream',
} as const;
