/**
 * RetentionService
 *
 * Handles automatic cleanup of old/unused memories based on retention policies.
 * Supports age-based, count-based cleanup with soft delete (archive) option.
 */

import { SettingsDefaultsManager, SettingsDefaults } from '../../shared/SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH } from '../../shared/paths.js';
import { DatabaseManager } from './DatabaseManager.js';
import { logger } from '../../utils/logger.js';

export interface RetentionPolicy {
  enabled: boolean;
  maxAgeDays: number;
  maxCount: number;
  excludeTypes: string[];
  softDelete: boolean;
}

export interface RetentionPreview {
  totalObservations: number;
  toDelete: {
    byAge: number;
    byCount: number;
    total: number;
  };
  excluded: number;
  affectedProjects: string[];
}

export interface RetentionResult {
  deleted: number;
  archived: number;
  errors: string[];
  duration: number;
}

export class RetentionService {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Load retention policy from settings
   */
  getPolicy(): RetentionPolicy {
    const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
    return {
      enabled: settings.CLAUDE_MEM_RETENTION_ENABLED,
      maxAgeDays: parseInt(settings.CLAUDE_MEM_RETENTION_MAX_AGE_DAYS, 10) || 0,
      maxCount: parseInt(settings.CLAUDE_MEM_RETENTION_MAX_COUNT, 10) || 0,
      excludeTypes: this.parseJsonArray(settings.CLAUDE_MEM_RETENTION_EXCLUDE_TYPES),
      softDelete: settings.CLAUDE_MEM_RETENTION_SOFT_DELETE,
    };
  }

  /**
   * Parse JSON array string safely
   */
  private parseJsonArray(jsonStr: string): string[] {
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Preview what would be deleted without actually deleting
   */
  async preview(policy?: RetentionPolicy): Promise<RetentionPreview> {
    const p = policy || this.getPolicy();
    const store = this.dbManager.getSessionStore();
    const db = store.db;

    // Get total count
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number };
    const totalObservations = totalResult.count;

    // Build exclude types condition
    const excludeCondition = p.excludeTypes.length > 0
      ? `AND type NOT IN (${p.excludeTypes.map(() => '?').join(', ')})`
      : '';

    // Count by age
    let byAge = 0;
    if (p.maxAgeDays > 0) {
      const cutoffEpoch = Date.now() - (p.maxAgeDays * 24 * 60 * 60 * 1000);
      const ageQuery = `
        SELECT COUNT(*) as count FROM observations
        WHERE created_at_epoch < ? ${excludeCondition}
      `;
      const ageResult = db.prepare(ageQuery).get(cutoffEpoch, ...p.excludeTypes) as { count: number };
      byAge = ageResult.count;
    }

    // Count by count (per project)
    let byCount = 0;
    if (p.maxCount > 0) {
      // Get projects with more than maxCount observations
      const projectsQuery = `
        SELECT project, COUNT(*) as count FROM observations
        WHERE 1=1 ${excludeCondition}
        GROUP BY project
        HAVING count > ?
      `;
      const projects = db.prepare(projectsQuery).all(...p.excludeTypes, p.maxCount) as Array<{ project: string; count: number }>;

      for (const proj of projects) {
        byCount += proj.count - p.maxCount;
      }
    }

    // Get affected projects
    const affectedProjectsQuery = `
      SELECT DISTINCT project FROM observations
      WHERE (
        (? > 0 AND created_at_epoch < ?)
        OR project IN (
          SELECT project FROM observations
          WHERE 1=1 ${excludeCondition}
          GROUP BY project
          HAVING COUNT(*) > ?
        )
      ) ${excludeCondition}
    `;
    const cutoffEpoch = p.maxAgeDays > 0 ? Date.now() - (p.maxAgeDays * 24 * 60 * 60 * 1000) : 0;
    const affectedProjects = db.prepare(affectedProjectsQuery)
      .all(p.maxAgeDays, cutoffEpoch, p.maxCount, ...p.excludeTypes, ...p.excludeTypes) as Array<{ project: string }>;

    // Count excluded
    const excludedQuery = `
      SELECT COUNT(*) as count FROM observations
      WHERE type IN (${p.excludeTypes.map(() => '?').join(', ') || "''"})
    `;
    const excludedResult = p.excludeTypes.length > 0
      ? db.prepare(excludedQuery).get(...p.excludeTypes) as { count: number }
      : { count: 0 };

    return {
      totalObservations,
      toDelete: {
        byAge,
        byCount,
        total: Math.min(byAge + byCount, totalObservations - excludedResult.count), // Avoid double counting
      },
      excluded: excludedResult.count,
      affectedProjects: affectedProjects.map(p => p.project),
    };
  }

  /**
   * Run retention cleanup
   */
  async run(policy?: RetentionPolicy, dryRun: boolean = false): Promise<RetentionResult> {
    const startTime = Date.now();
    const p = policy || this.getPolicy();
    const store = this.dbManager.getSessionStore();
    const db = store.db;
    const errors: string[] = [];

    if (!p.enabled && !policy) {
      return {
        deleted: 0,
        archived: 0,
        errors: ['Retention policy is disabled. Enable it in settings or pass a policy.'],
        duration: Date.now() - startTime,
      };
    }

    let deleted = 0;
    let archived = 0;

    // Build exclude types condition
    const excludeCondition = p.excludeTypes.length > 0
      ? `AND type NOT IN (${p.excludeTypes.map(() => '?').join(', ')})`
      : '';

    try {
      // Age-based cleanup
      if (p.maxAgeDays > 0) {
        const cutoffEpoch = Date.now() - (p.maxAgeDays * 24 * 60 * 60 * 1000);

        if (dryRun) {
          const countQuery = `
            SELECT COUNT(*) as count FROM observations
            WHERE created_at_epoch < ? ${excludeCondition}
          `;
          const result = db.prepare(countQuery).get(cutoffEpoch, ...p.excludeTypes) as { count: number };
          deleted += result.count;
        } else if (p.softDelete) {
          // Archive to deleted_observations table
          const archiveQuery = `
            INSERT INTO deleted_observations (id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch, deleted_at_epoch, deletion_reason)
            SELECT id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch, ?, 'retention_age'
            FROM observations
            WHERE created_at_epoch < ? ${excludeCondition}
          `;
          try {
            db.prepare(archiveQuery).run(Date.now(), cutoffEpoch, ...p.excludeTypes);
          } catch (e) {
            // Table might not exist, create it
            await this.ensureArchiveTable();
            db.prepare(archiveQuery).run(Date.now(), cutoffEpoch, ...p.excludeTypes);
          }

          const deleteQuery = `
            DELETE FROM observations
            WHERE created_at_epoch < ? ${excludeCondition}
          `;
          const result = db.prepare(deleteQuery).run(cutoffEpoch, ...p.excludeTypes);
          archived += result.changes;
        } else {
          const deleteQuery = `
            DELETE FROM observations
            WHERE created_at_epoch < ? ${excludeCondition}
          `;
          const result = db.prepare(deleteQuery).run(cutoffEpoch, ...p.excludeTypes);
          deleted += result.changes;
        }

        logger.info('RETENTION', `Age-based cleanup: ${p.softDelete ? archived : deleted} observations (cutoff: ${p.maxAgeDays} days)`);
      }

      // Count-based cleanup (per project)
      if (p.maxCount > 0) {
        const projectsQuery = `
          SELECT project, COUNT(*) as count FROM observations
          WHERE 1=1 ${excludeCondition}
          GROUP BY project
          HAVING count > ?
        `;
        const projects = db.prepare(projectsQuery).all(...p.excludeTypes, p.maxCount) as Array<{ project: string; count: number }>;

        for (const proj of projects) {
          const toDelete = proj.count - p.maxCount;

          if (dryRun) {
            deleted += toDelete;
          } else {
            // Get IDs to delete (oldest first)
            const idsQuery = `
              SELECT id FROM observations
              WHERE project = ? ${excludeCondition}
              ORDER BY created_at_epoch ASC
              LIMIT ?
            `;
            const ids = db.prepare(idsQuery).all(proj.project, ...p.excludeTypes, toDelete) as Array<{ id: number }>;

            if (ids.length > 0) {
              const idList = ids.map(r => r.id);
              const placeholders = idList.map(() => '?').join(', ');

              if (p.softDelete) {
                const archiveQuery = `
                  INSERT INTO deleted_observations (id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch, deleted_at_epoch, deletion_reason)
                  SELECT id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch, ?, 'retention_count'
                  FROM observations
                  WHERE id IN (${placeholders})
                `;
                try {
                  db.prepare(archiveQuery).run(Date.now(), ...idList);
                } catch (e) {
                  await this.ensureArchiveTable();
                  db.prepare(archiveQuery).run(Date.now(), ...idList);
                }

                const deleteQuery = `DELETE FROM observations WHERE id IN (${placeholders})`;
                const result = db.prepare(deleteQuery).run(...idList);
                archived += result.changes;
              } else {
                const deleteQuery = `DELETE FROM observations WHERE id IN (${placeholders})`;
                const result = db.prepare(deleteQuery).run(...idList);
                deleted += result.changes;
              }
            }
          }
        }

        logger.info('RETENTION', `Count-based cleanup: ${p.softDelete ? archived : deleted} observations (max: ${p.maxCount} per project)`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      logger.error('RETENTION', 'Cleanup failed', {}, error as Error);
    }

    return {
      deleted,
      archived,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Ensure archive table exists
   */
  private async ensureArchiveTable(): Promise<void> {
    const store = this.dbManager.getSessionStore();
    const db = store.db;

    db.exec(`
      CREATE TABLE IF NOT EXISTS deleted_observations (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        text TEXT NOT NULL,
        project TEXT NOT NULL,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        deleted_at_epoch INTEGER NOT NULL,
        deletion_reason TEXT
      )
    `);

    logger.info('RETENTION', 'Created deleted_observations archive table');
  }

  /**
   * Restore archived observations
   */
  async restore(ids?: number[]): Promise<{ restored: number; errors: string[] }> {
    const store = this.dbManager.getSessionStore();
    const db = store.db;
    const errors: string[] = [];
    let restored = 0;

    try {
      const whereClause = ids && ids.length > 0
        ? `WHERE id IN (${ids.map(() => '?').join(', ')})`
        : '';

      const restoreQuery = `
        INSERT OR REPLACE INTO observations (id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch)
        SELECT id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch
        FROM deleted_observations
        ${whereClause}
      `;

      const result = ids && ids.length > 0
        ? db.prepare(restoreQuery).run(...ids)
        : db.prepare(restoreQuery).run();

      restored = result.changes;

      // Remove from archive
      const deleteQuery = `DELETE FROM deleted_observations ${whereClause}`;
      if (ids && ids.length > 0) {
        db.prepare(deleteQuery).run(...ids);
      } else {
        db.prepare(deleteQuery).run();
      }

      logger.info('RETENTION', `Restored ${restored} observations from archive`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      logger.error('RETENTION', 'Restore failed', {}, error as Error);
    }

    return { restored, errors };
  }

  /**
   * Get archived observations count
   */
  getArchiveCount(): number {
    try {
      const store = this.dbManager.getSessionStore();
      const db = store.db;
      const result = db.prepare('SELECT COUNT(*) as count FROM deleted_observations').get() as { count: number };
      return result.count;
    } catch {
      return 0; // Table doesn't exist yet
    }
  }

  /**
   * List archived observations
   */
  listArchived(limit: number = 100): Array<{
    id: number;
    type: string;
    title: string | null;
    project: string;
    created_at: string;
    deleted_at_epoch: number;
    deletion_reason: string | null;
  }> {
    try {
      const store = this.dbManager.getSessionStore();
      const db = store.db;
      return db.prepare(`
        SELECT id, type, title, project, created_at, deleted_at_epoch, deletion_reason
        FROM deleted_observations
        ORDER BY deleted_at_epoch DESC
        LIMIT ?
      `).all(limit) as Array<{
        id: number;
        type: string;
        title: string | null;
        project: string;
        created_at: string;
        deleted_at_epoch: number;
        deletion_reason: string | null;
      }>;
    } catch {
      return []; // Table doesn't exist yet
    }
  }
}
