/**
 * Backup Routes
 *
 * Handles backup and restore operations for claude-mem data.
 * Supports full database backups, compressed exports, and restore from backup.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, createReadStream, createWriteStream } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { homedir } from 'os';
import { logger } from '../../../../utils/logger.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { DatabaseManager } from '../../DatabaseManager.js';

interface BackupMetadata {
  version: string;
  createdAt: string;
  createdAtEpoch: number;
  contents: {
    database: boolean;
    settings: boolean;
    claudeMdFiles?: string[];
  };
  stats: {
    observations: number;
    sessions: number;
    summaries: number;
    prompts: number;
    dbSizeBytes: number;
  };
}

interface BackupInfo {
  filename: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
  metadata?: BackupMetadata;
}

export class BackupRoutes extends BaseRouteHandler {
  private backupDir: string;

  constructor(private dbManager: DatabaseManager) {
    super();
    this.backupDir = path.join(homedir(), '.claude-mem', 'backups');
    this.ensureBackupDir();
  }

  setupRoutes(app: express.Application): void {
    // Backup management
    app.get('/api/backups', this.handleListBackups.bind(this));
    app.post('/api/backups/create', this.handleCreateBackup.bind(this));
    app.delete('/api/backups/:filename', this.handleDeleteBackup.bind(this));
    app.get('/api/backups/:filename/download', this.handleDownloadBackup.bind(this));

    // Restore operations
    app.post('/api/backups/:filename/restore', this.handleRestoreBackup.bind(this));
    app.post('/api/backups/restore/upload', express.raw({ limit: '500mb', type: 'application/gzip' }), this.handleRestoreFromUpload.bind(this));

    // Backup info
    app.get('/api/backups/:filename/info', this.handleGetBackupInfo.bind(this));
  }

  /**
   * List all available backups
   * GET /api/backups
   */
  private handleListBackups = this.wrapHandler((req: Request, res: Response): void => {
    const backups: BackupInfo[] = [];

    if (existsSync(this.backupDir)) {
      const files = readdirSync(this.backupDir)
        .filter(f => f.endsWith('.backup.gz') || f.endsWith('.backup.json'))
        .sort((a, b) => b.localeCompare(a)); // Newest first

      for (const filename of files) {
        const filePath = path.join(this.backupDir, filename);
        const stats = statSync(filePath);
        const backupInfo: BackupInfo = {
          filename,
          path: filePath,
          createdAt: stats.mtime.toISOString(),
          sizeBytes: stats.size
        };

        // Try to read metadata from companion file
        const metadataPath = filePath.replace(/\.(backup\.gz|backup\.json)$/, '.metadata.json');
        if (existsSync(metadataPath)) {
          try {
            backupInfo.metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
          } catch (e) {
            // Ignore metadata read errors
          }
        }

        backups.push(backupInfo);
      }
    }

    res.json({
      backupDir: this.backupDir,
      backups,
      totalCount: backups.length
    });
  });

  /**
   * Create a new backup
   * POST /api/backups/create
   * Body: { includeSettings?: boolean, includeClaudeMd?: boolean, compress?: boolean }
   */
  private handleCreateBackup = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const includeSettings = req.body.includeSettings !== false;
    const compress = req.body.compress !== false;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseFilename = `claude-mem-${timestamp}`;
    const backupFilename = compress ? `${baseFilename}.backup.gz` : `${baseFilename}.backup.json`;
    const backupPath = path.join(this.backupDir, backupFilename);
    const metadataPath = path.join(this.backupDir, `${baseFilename}.metadata.json`);

    logger.info('BACKUP', 'Creating backup', { backupPath, includeSettings, compress });

    // Gather data
    const store = this.dbManager.getSessionStore();
    const db = store.db;

    // Export all data
    const sessions = db.prepare('SELECT * FROM sdk_sessions').all();
    const summaries = db.prepare('SELECT * FROM session_summaries').all();
    const observations = db.prepare('SELECT * FROM observations').all();
    const prompts = db.prepare('SELECT * FROM user_prompts').all();

    // Include settings if requested
    let settings: any = null;
    const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
    if (includeSettings && existsSync(settingsPath)) {
      try {
        settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      } catch (e) {
        logger.warn('BACKUP', 'Failed to read settings', {}, e as Error);
      }
    }

    // Get DB size
    const dbPath = path.join(homedir(), '.claude-mem', 'claude-mem.db');
    let dbSize = 0;
    if (existsSync(dbPath)) {
      dbSize = statSync(dbPath).size;
    }

    // Build backup data
    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        sessions,
        summaries,
        observations,
        prompts,
        settings
      }
    };

    // Create metadata
    const metadata: BackupMetadata = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      createdAtEpoch: Date.now(),
      contents: {
        database: true,
        settings: includeSettings && settings !== null
      },
      stats: {
        observations: observations.length,
        sessions: sessions.length,
        summaries: summaries.length,
        prompts: prompts.length,
        dbSizeBytes: dbSize
      }
    };

    // Write backup
    const jsonData = JSON.stringify(backupData, null, 2);

    if (compress) {
      // Compress with gzip
      const gzip = createGzip();
      const output = createWriteStream(backupPath);
      await pipeline(
        (async function* () { yield jsonData; })(),
        gzip,
        output
      );
    } else {
      writeFileSync(backupPath, jsonData, 'utf-8');
    }

    // Write metadata separately (always uncompressed for easy reading)
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    const backupStats = statSync(backupPath);

    logger.info('BACKUP', 'Backup created successfully', {
      filename: backupFilename,
      sizeBytes: backupStats.size,
      observations: observations.length
    });

    res.json({
      success: true,
      filename: backupFilename,
      path: backupPath,
      sizeBytes: backupStats.size,
      metadata
    });
  });

  /**
   * Delete a backup
   * DELETE /api/backups/:filename
   */
  private handleDeleteBackup = this.wrapHandler((req: Request, res: Response): void => {
    const { filename } = req.params;

    // Validate filename (prevent path traversal)
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      this.badRequest(res, 'Invalid filename');
      return;
    }

    const backupPath = path.join(this.backupDir, filename);
    const baseFilename = filename.replace(/\.(backup\.gz|backup\.json)$/, '');
    const metadataPath = path.join(this.backupDir, `${baseFilename}.metadata.json`);

    if (!existsSync(backupPath)) {
      this.notFound(res, 'Backup not found');
      return;
    }

    // Delete backup and metadata
    unlinkSync(backupPath);
    if (existsSync(metadataPath)) {
      unlinkSync(metadataPath);
    }

    logger.info('BACKUP', 'Backup deleted', { filename });
    res.json({ success: true, filename });
  });

  /**
   * Download a backup file
   * GET /api/backups/:filename/download
   */
  private handleDownloadBackup = this.wrapHandler((req: Request, res: Response): void => {
    const { filename } = req.params;

    // Validate filename
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      this.badRequest(res, 'Invalid filename');
      return;
    }

    const backupPath = path.join(this.backupDir, filename);

    if (!existsSync(backupPath)) {
      this.notFound(res, 'Backup not found');
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', filename.endsWith('.gz') ? 'application/gzip' : 'application/json');

    const stream = createReadStream(backupPath);
    stream.pipe(res);
  });

  /**
   * Restore from a backup
   * POST /api/backups/:filename/restore
   * Body: { restoreSettings?: boolean, clearExisting?: boolean }
   */
  private handleRestoreBackup = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { filename } = req.params;
    const restoreSettings = req.body.restoreSettings === true;
    const clearExisting = req.body.clearExisting === true;

    // Validate filename
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      this.badRequest(res, 'Invalid filename');
      return;
    }

    const backupPath = path.join(this.backupDir, filename);

    if (!existsSync(backupPath)) {
      this.notFound(res, 'Backup not found');
      return;
    }

    logger.info('BACKUP', 'Starting restore', { filename, restoreSettings, clearExisting });

    // Read and parse backup
    let backupData: any;
    try {
      if (filename.endsWith('.gz')) {
        // Decompress and read
        const chunks: Buffer[] = [];
        const gunzip = createGunzip();
        const input = createReadStream(backupPath);

        await new Promise<void>((resolve, reject) => {
          input.pipe(gunzip)
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => resolve())
            .on('error', reject);
        });

        backupData = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      } else {
        backupData = JSON.parse(readFileSync(backupPath, 'utf-8'));
      }
    } catch (error) {
      logger.error('BACKUP', 'Failed to read backup', { filename }, error as Error);
      this.badRequest(res, 'Invalid or corrupted backup file');
      return;
    }

    // Validate backup structure
    if (!backupData.data || !backupData.version) {
      this.badRequest(res, 'Invalid backup format');
      return;
    }

    const store = this.dbManager.getSessionStore();
    const stats = {
      sessionsRestored: 0,
      sessionsSkipped: 0,
      summariesRestored: 0,
      summariesSkipped: 0,
      observationsRestored: 0,
      observationsSkipped: 0,
      promptsRestored: 0,
      promptsSkipped: 0,
      settingsRestored: false
    };

    // Clear existing data if requested
    if (clearExisting) {
      store.db.exec(`
        DELETE FROM observations;
        DELETE FROM session_summaries;
        DELETE FROM user_prompts;
        DELETE FROM sdk_sessions;
      `);
      logger.info('BACKUP', 'Cleared existing data');
    }

    // Restore sessions
    if (Array.isArray(backupData.data.sessions)) {
      for (const session of backupData.data.sessions) {
        const result = store.importSdkSession(session);
        if (result.imported) {
          stats.sessionsRestored++;
        } else {
          stats.sessionsSkipped++;
        }
      }
    }

    // Restore summaries
    if (Array.isArray(backupData.data.summaries)) {
      for (const summary of backupData.data.summaries) {
        const result = store.importSessionSummary(summary);
        if (result.imported) {
          stats.summariesRestored++;
        } else {
          stats.summariesSkipped++;
        }
      }
    }

    // Restore observations
    if (Array.isArray(backupData.data.observations)) {
      for (const obs of backupData.data.observations) {
        const result = store.importObservation(obs);
        if (result.imported) {
          stats.observationsRestored++;
        } else {
          stats.observationsSkipped++;
        }
      }
    }

    // Restore prompts
    if (Array.isArray(backupData.data.prompts)) {
      for (const prompt of backupData.data.prompts) {
        const result = store.importUserPrompt(prompt);
        if (result.imported) {
          stats.promptsRestored++;
        } else {
          stats.promptsSkipped++;
        }
      }
    }

    // Restore settings if requested
    if (restoreSettings && backupData.data.settings) {
      const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
      writeFileSync(settingsPath, JSON.stringify(backupData.data.settings, null, 2), 'utf-8');
      stats.settingsRestored = true;
      logger.info('BACKUP', 'Settings restored');
    }

    logger.info('BACKUP', 'Restore completed', stats);

    res.json({
      success: true,
      filename,
      stats
    });
  });

  /**
   * Restore from uploaded backup file
   * POST /api/backups/restore/upload
   * Body: raw gzip or json data
   */
  private handleRestoreFromUpload = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const restoreSettings = req.query.restoreSettings === 'true';
    const clearExisting = req.query.clearExisting === 'true';

    if (!req.body || req.body.length === 0) {
      this.badRequest(res, 'No backup data provided');
      return;
    }

    logger.info('BACKUP', 'Starting restore from upload', {
      sizeBytes: req.body.length,
      restoreSettings,
      clearExisting
    });

    // Parse the uploaded data
    let backupData: any;
    try {
      // Try to decompress first (assuming gzip)
      const gunzip = createGunzip();
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        gunzip.on('data', (chunk) => chunks.push(chunk));
        gunzip.on('end', () => resolve());
        gunzip.on('error', () => {
          // Not gzip, try raw JSON
          try {
            backupData = JSON.parse(req.body.toString('utf-8'));
            resolve();
          } catch (e) {
            reject(new Error('Invalid backup format'));
          }
        });
        gunzip.end(req.body);
      });

      if (!backupData) {
        backupData = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      }
    } catch (error) {
      logger.error('BACKUP', 'Failed to parse uploaded backup', {}, error as Error);
      this.badRequest(res, 'Invalid or corrupted backup file');
      return;
    }

    // Validate backup structure
    if (!backupData.data || !backupData.version) {
      this.badRequest(res, 'Invalid backup format');
      return;
    }

    const store = this.dbManager.getSessionStore();
    const stats = {
      sessionsRestored: 0,
      sessionsSkipped: 0,
      summariesRestored: 0,
      summariesSkipped: 0,
      observationsRestored: 0,
      observationsSkipped: 0,
      promptsRestored: 0,
      promptsSkipped: 0,
      settingsRestored: false
    };

    // Clear existing data if requested
    if (clearExisting) {
      store.db.exec(`
        DELETE FROM observations;
        DELETE FROM session_summaries;
        DELETE FROM user_prompts;
        DELETE FROM sdk_sessions;
      `);
      logger.info('BACKUP', 'Cleared existing data');
    }

    // Restore data (same logic as file restore)
    if (Array.isArray(backupData.data.sessions)) {
      for (const session of backupData.data.sessions) {
        const result = store.importSdkSession(session);
        if (result.imported) stats.sessionsRestored++;
        else stats.sessionsSkipped++;
      }
    }

    if (Array.isArray(backupData.data.summaries)) {
      for (const summary of backupData.data.summaries) {
        const result = store.importSessionSummary(summary);
        if (result.imported) stats.summariesRestored++;
        else stats.summariesSkipped++;
      }
    }

    if (Array.isArray(backupData.data.observations)) {
      for (const obs of backupData.data.observations) {
        const result = store.importObservation(obs);
        if (result.imported) stats.observationsRestored++;
        else stats.observationsSkipped++;
      }
    }

    if (Array.isArray(backupData.data.prompts)) {
      for (const prompt of backupData.data.prompts) {
        const result = store.importUserPrompt(prompt);
        if (result.imported) stats.promptsRestored++;
        else stats.promptsSkipped++;
      }
    }

    if (restoreSettings && backupData.data.settings) {
      const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
      writeFileSync(settingsPath, JSON.stringify(backupData.data.settings, null, 2), 'utf-8');
      stats.settingsRestored = true;
    }

    logger.info('BACKUP', 'Restore from upload completed', stats);

    res.json({
      success: true,
      source: 'upload',
      stats
    });
  });

  /**
   * Get detailed info about a backup
   * GET /api/backups/:filename/info
   */
  private handleGetBackupInfo = this.wrapHandler((req: Request, res: Response): void => {
    const { filename } = req.params;

    // Validate filename
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      this.badRequest(res, 'Invalid filename');
      return;
    }

    const backupPath = path.join(this.backupDir, filename);
    const baseFilename = filename.replace(/\.(backup\.gz|backup\.json)$/, '');
    const metadataPath = path.join(this.backupDir, `${baseFilename}.metadata.json`);

    if (!existsSync(backupPath)) {
      this.notFound(res, 'Backup not found');
      return;
    }

    const stats = statSync(backupPath);
    const info: BackupInfo = {
      filename,
      path: backupPath,
      createdAt: stats.mtime.toISOString(),
      sizeBytes: stats.size
    };

    // Try to read metadata
    if (existsSync(metadataPath)) {
      try {
        info.metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      } catch (e) {
        // Ignore metadata read errors
      }
    }

    res.json(info);
  });

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDir(): void {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
      logger.info('BACKUP', 'Created backup directory', { path: this.backupDir });
    }
  }
}
