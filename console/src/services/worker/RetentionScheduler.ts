/**
 * RetentionScheduler
 *
 * Runs retention cleanup automatically on a daily interval.
 * Uses the existing RetentionService for actual cleanup logic.
 */

import { RetentionService } from "./RetentionService.js";
import { DatabaseManager } from "./DatabaseManager.js";
import { logger } from "../../utils/logger.js";

const DAILY_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30_000;

let retentionInterval: ReturnType<typeof setInterval> | null = null;
let startupTimeout: ReturnType<typeof setTimeout> | null = null;

async function runRetention(dbManager: DatabaseManager): Promise<void> {
  const vectorSync = dbManager.getVectorSyncOrNull();
  const retentionService = new RetentionService(dbManager, vectorSync);
  const policy = retentionService.getPolicy();

  if (!policy.enabled) {
    logger.debug("RETENTION", "Auto-cleanup skipped: retention policy is disabled");
    return;
  }

  logger.info("RETENTION", "Running scheduled auto-cleanup", {
    maxAgeDays: policy.maxAgeDays,
    maxCount: policy.maxCount,
  });

  const result = await retentionService.run();

  logger.info("RETENTION", "Auto-cleanup complete", {
    deleted: result.deleted,
    archived: result.archived,
    errors: result.errors.length,
    duration: result.duration,
  });
}

/**
 * Start the automatic retention scheduler.
 * Runs an initial cleanup after a 30-second startup delay,
 * then runs daily thereafter.
 */
export function startRetentionScheduler(dbManager: DatabaseManager): void {
  stopRetentionScheduler();

  startupTimeout = setTimeout(async () => {
    try {
      await runRetention(dbManager);
    } catch (error) {
      logger.error("RETENTION", "Scheduled retention failed", {}, error as Error);
    }

    retentionInterval = setInterval(async () => {
      try {
        await runRetention(dbManager);
      } catch (error) {
        logger.error("RETENTION", "Scheduled retention failed", {}, error as Error);
      }
    }, DAILY_MS);

    logger.info("RETENTION", "Scheduled daily auto-cleanup");
  }, STARTUP_DELAY_MS);

  logger.info("RETENTION", "Retention scheduler initialized (first run in 30s)");
}

/**
 * Stop the retention scheduler and clear all timers.
 * Call during worker shutdown.
 */
export function stopRetentionScheduler(): void {
  if (startupTimeout) {
    clearTimeout(startupTimeout);
    startupTimeout = null;
  }
  if (retentionInterval) {
    clearInterval(retentionInterval);
    retentionInterval = null;
  }
  logger.debug("RETENTION", "Retention scheduler stopped");
}
