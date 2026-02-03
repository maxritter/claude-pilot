/**
 * CLI Commands Module
 *
 * Provides command-line interface for claude-mem operations.
 * Uses existing API endpoints via HTTP requests.
 */

import { getWorkerPort, getWorkerHost } from '../shared/worker-utils.js';

interface CLIOptions {
  json?: boolean;
  project?: string;
  limit?: number;
  type?: string;
  dryRun?: boolean;
}

interface SearchResult {
  id: number;
  title: string;
  type: string;
  project: string;
  created_at: string;
  tokens?: number;
}

interface StatsResponse {
  worker: {
    version: string;
    uptime: number;
    activeSessions: number;
    queueDepth: number;
    port: number;
  };
  database: {
    path: string;
    size: number;
    observations: number;
    sessions: number;
    summaries: number;
  };
}

interface ProcessingStatus {
  isProcessing: boolean;
  queueDepth: number;
}

interface BackupInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

interface DoctorCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

/**
 * Make HTTP request to worker API
 */
async function apiRequest<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const port = getWorkerPort();
  const host = getWorkerHost();
  const url = `http://${host}:${port}${endpoint}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Check if worker is running
 */
async function checkWorkerRunning(): Promise<boolean> {
  try {
    await apiRequest('/api/health');
    return true;
  } catch {
    return false;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

// ============================================================================
// CLI Commands
// ============================================================================

/**
 * Show worker and queue status
 */
export async function statusCommand(options: CLIOptions): Promise<void> {
  const running = await checkWorkerRunning();

  if (!running) {
    if (options.json) {
      console.log(JSON.stringify({ running: false }));
    } else {
      console.log('Worker is not running');
    }
    return;
  }

  const [health, stats, processing] = await Promise.all([
    apiRequest<{ status: string; pid: number; initialized: boolean; coreReady: boolean; mcpReady: boolean }>('/api/health'),
    apiRequest<StatsResponse>('/api/stats'),
    apiRequest<ProcessingStatus>('/api/processing-status'),
  ]);

  if (options.json) {
    console.log(JSON.stringify({ running: true, health, stats, processing }, null, 2));
  } else {
    console.log('Worker Status');
    console.log('─'.repeat(40));
    console.log(`  Status:      ${health.status}`);
    console.log(`  Version:     ${stats.worker.version}`);
    console.log(`  PID:         ${health.pid}`);
    console.log(`  Uptime:      ${Math.floor(stats.worker.uptime / 60)}m ${stats.worker.uptime % 60}s`);
    console.log(`  Initialized: ${health.initialized ? 'yes' : 'no'}`);
    console.log(`  Core Ready:  ${health.coreReady ? 'yes' : 'no'}`);
    console.log(`  MCP Ready:   ${health.mcpReady ? 'yes' : 'no'}`);
    console.log('');
    console.log('Database Stats');
    console.log('─'.repeat(40));
    console.log(`  Path:         ${stats.database.path}`);
    console.log(`  Size:         ${formatBytes(stats.database.size)}`);
    console.log(`  Observations: ${stats.database.observations.toLocaleString()}`);
    console.log(`  Sessions:     ${stats.database.sessions.toLocaleString()}`);
    console.log(`  Summaries:    ${stats.database.summaries.toLocaleString()}`);
    console.log('');
    console.log('Processing');
    console.log('─'.repeat(40));
    console.log(`  Active:       ${processing.isProcessing ? 'yes' : 'no'}`);
    console.log(`  Queue Depth:  ${processing.queueDepth}`);
    console.log(`  Sessions:     ${stats.worker.activeSessions}`);
  }
}

/**
 * Search memories from CLI
 */
export async function searchCommand(query: string, options: CLIOptions): Promise<void> {
  if (!await checkWorkerRunning()) {
    console.error('Error: Worker is not running. Start with: claude-mem start');
    process.exit(1);
  }

  const params = new URLSearchParams({ query });
  if (options.project) params.set('project', options.project);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.type) params.set('type', options.type);

  // Use the search/observations endpoint which returns formatted results
  const endpoint = options.type === 'session' ? '/api/search/sessions' : '/api/search/observations';
  const results = await apiRequest<{ content: Array<{ type: string; text: string }> }>(
    `${endpoint}?${params}`
  );

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    // The API returns markdown-formatted text
    const text = results.content.find(c => c.type === 'text')?.text;
    if (text) {
      console.log(text);
    } else {
      console.log('No results found');
    }
  }
}

/**
 * Export project memories
 */
export async function exportCommand(options: CLIOptions): Promise<void> {
  if (!await checkWorkerRunning()) {
    console.error('Error: Worker is not running. Start with: claude-mem start');
    process.exit(1);
  }

  const params = new URLSearchParams();
  if (options.project) params.set('project', options.project);
  if (options.limit) params.set('limit', options.limit.toString());

  const data = await apiRequest<unknown>(`/api/export?${params}`);

  // Always output JSON for export (pipe-friendly)
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Import memories from file/stdin
 */
export async function importCommand(filePath: string | undefined, options: CLIOptions): Promise<void> {
  if (!await checkWorkerRunning()) {
    console.error('Error: Worker is not running. Start with: claude-mem start');
    process.exit(1);
  }

  let data: string;

  if (filePath && filePath !== '-') {
    const fs = await import('fs/promises');
    data = await fs.readFile(filePath, 'utf-8');
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    data = Buffer.concat(chunks).toString('utf-8');
  }

  const parsed = JSON.parse(data);
  const result = await apiRequest<{ imported: number }>('/api/import', {
    method: 'POST',
    body: parsed,
  });

  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`Imported ${result.imported} records`);
  }
}

/**
 * Run cleanup tasks
 */
export async function cleanupCommand(options: CLIOptions): Promise<void> {
  if (!await checkWorkerRunning()) {
    console.error('Error: Worker is not running. Start with: claude-mem start');
    process.exit(1);
  }

  // Clear failed queue
  const queueResult = await apiRequest<{ deleted: number }>('/api/pending-queue/failed', {
    method: 'DELETE',
  });

  if (options.json) {
    console.log(JSON.stringify({ failedQueueCleared: queueResult.deleted }));
  } else {
    console.log('Cleanup completed:');
    console.log(`  Failed queue entries cleared: ${queueResult.deleted}`);
  }
}

/**
 * Create backup
 */
export async function backupCommand(options: CLIOptions): Promise<void> {
  if (!await checkWorkerRunning()) {
    console.error('Error: Worker is not running. Start with: claude-mem start');
    process.exit(1);
  }

  const result = await apiRequest<{ filename: string; sizeBytes: number; path: string }>(
    '/api/backups/create',
    { method: 'POST' }
  );

  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log('Backup created:');
    console.log(`  File: ${result.filename}`);
    console.log(`  Size: ${formatBytes(result.sizeBytes)}`);
    console.log(`  Path: ${result.path}`);
  }
}

/**
 * List backups
 */
export async function backupsListCommand(options: CLIOptions): Promise<void> {
  if (!await checkWorkerRunning()) {
    console.error('Error: Worker is not running. Start with: claude-mem start');
    process.exit(1);
  }

  const result = await apiRequest<{ backups: BackupInfo[] }>('/api/backups');

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.backups.length === 0) {
      console.log('No backups found');
      return;
    }

    console.log('Backups:');
    console.log('─'.repeat(60));
    for (const b of result.backups) {
      console.log(`  ${b.filename}`);
      console.log(`    Size: ${formatBytes(b.sizeBytes)} | Created: ${formatDate(b.createdAt)}`);
    }
  }
}

/**
 * Diagnose issues
 */
export async function doctorCommand(options: CLIOptions): Promise<void> {
  const checks: DoctorCheck[] = [];

  // Check 1: Worker running
  const workerRunning = await checkWorkerRunning();
  checks.push({
    name: 'Worker Status',
    status: workerRunning ? 'ok' : 'error',
    message: workerRunning ? 'Worker is running' : 'Worker is not running',
  });

  if (workerRunning) {
    // Check 2: Health endpoint
    try {
      const health = await apiRequest<{ status: string; coreReady: boolean; mcpReady: boolean }>('/api/health');
      checks.push({
        name: 'Health Check',
        status: health.status === 'ok' ? 'ok' : 'warning',
        message: `Status: ${health.status}`,
      });

      checks.push({
        name: 'Core Services',
        status: health.coreReady ? 'ok' : 'warning',
        message: health.coreReady ? 'Database and search ready' : 'Core services not ready',
      });

      checks.push({
        name: 'MCP Server',
        status: health.mcpReady ? 'ok' : 'warning',
        message: health.mcpReady ? 'MCP server connected' : 'MCP server not connected',
      });
    } catch (error) {
      checks.push({
        name: 'Health Check',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Check 3: Database stats
    try {
      const stats = await apiRequest<StatsResponse>('/api/stats');
      checks.push({
        name: 'Database',
        status: 'ok',
        message: `${stats.database.observations} observations, ${stats.database.sessions} sessions (${formatBytes(stats.database.size)})`,
      });
    } catch (error) {
      checks.push({
        name: 'Database',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Check 4: Pending queue
    try {
      const queue = await apiRequest<{ queue: { messages: Array<{ status: string }> } }>('/api/pending-queue');
      const pending = queue.queue.messages.filter(m => m.status === 'pending').length;
      const failed = queue.queue.messages.filter(m => m.status === 'failed').length;
      const queueStatus = failed > 0 ? 'warning' : 'ok';
      checks.push({
        name: 'Queue Status',
        status: queueStatus,
        message: `Pending: ${pending}, Failed: ${failed}`,
      });
    } catch (error) {
      checks.push({
        name: 'Queue Status',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Check 5: Backups
    try {
      const backups = await apiRequest<{ backups: BackupInfo[] }>('/api/backups');
      const hasRecent = backups.backups.some((b) => {
        const created = new Date(b.createdAt);
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return created.getTime() > dayAgo;
      });
      checks.push({
        name: 'Backups',
        status: hasRecent ? 'ok' : 'warning',
        message: hasRecent
          ? `${backups.backups.length} backups (recent backup exists)`
          : `${backups.backups.length} backups (no recent backup)`,
      });
    } catch (error) {
      checks.push({
        name: 'Backups',
        status: 'warning',
        message: 'Could not check backups',
      });
    }
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify({ checks }, null, 2));
  } else {
    console.log('Claude-Mem Doctor');
    console.log('─'.repeat(50));

    const statusIcon = (s: string) => (s === 'ok' ? '✓' : s === 'warning' ? '!' : '✗');
    const statusColor = (s: string) => (s === 'ok' ? '\x1b[32m' : s === 'warning' ? '\x1b[33m' : '\x1b[31m');
    const reset = '\x1b[0m';

    for (const check of checks) {
      console.log(`  ${statusColor(check.status)}${statusIcon(check.status)}${reset} ${check.name}: ${check.message}`);
    }

    const hasErrors = checks.some((c) => c.status === 'error');
    const hasWarnings = checks.some((c) => c.status === 'warning');

    console.log('');
    if (hasErrors) {
      console.log('\x1b[31mSome checks failed. See above for details.\x1b[0m');
    } else if (hasWarnings) {
      console.log('\x1b[33mSome warnings detected. See above for details.\x1b[0m');
    } else {
      console.log('\x1b[32mAll checks passed!\x1b[0m');
    }
  }
}

/**
 * Retention policy management
 */
export async function retentionCommand(subcommand: string | undefined, options: CLIOptions): Promise<void> {
  if (!await checkWorkerRunning()) {
    console.error('Error: Worker is not running. Start with: claude-mem start');
    process.exit(1);
  }

  switch (subcommand) {
    case 'preview': {
      const result = await apiRequest<{
        preview: {
          totalObservations: number;
          toDelete: { byAge: number; byCount: number; total: number };
          excluded: number;
          affectedProjects: string[];
        };
        policy: { enabled: boolean; maxAgeDays: number; maxCount: number; excludeTypes: string[]; softDelete: boolean };
      }>('/api/retention/preview');

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const { preview, policy } = result;
        console.log('Retention Preview');
        console.log('─'.repeat(50));
        console.log(`Total observations:   ${preview.totalObservations.toLocaleString()}`);
        console.log(`Would delete by age:  ${preview.toDelete.byAge.toLocaleString()}`);
        console.log(`Would delete by count: ${preview.toDelete.byCount.toLocaleString()}`);
        console.log(`Total to delete:      ${preview.toDelete.total.toLocaleString()}`);
        console.log(`Excluded (protected): ${preview.excluded.toLocaleString()}`);
        console.log('');
        console.log('Policy:');
        console.log(`  Enabled:      ${policy.enabled ? 'yes' : 'no'}`);
        console.log(`  Max age:      ${policy.maxAgeDays} days`);
        console.log(`  Max count:    ${policy.maxCount} per project`);
        console.log(`  Exclude:      ${policy.excludeTypes.join(', ') || 'none'}`);
        console.log(`  Soft delete:  ${policy.softDelete ? 'yes (archive)' : 'no (permanent)'}`);
        if (preview.affectedProjects.length > 0) {
          console.log('');
          console.log(`Affected projects: ${preview.affectedProjects.slice(0, 5).join(', ')}${preview.affectedProjects.length > 5 ? '...' : ''}`);
        }
      }
      break;
    }

    case 'run': {
      const result = await apiRequest<{
        success: boolean;
        result: { deleted: number; archived: number; errors: string[]; duration: number };
        policy: { enabled: boolean; maxAgeDays: number; maxCount: number; excludeTypes: string[]; softDelete: boolean };
      }>('/api/retention/run', { method: 'POST', body: {} });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log('\x1b[32mRetention cleanup completed\x1b[0m');
          console.log(`  Deleted:  ${result.result.deleted}`);
          console.log(`  Archived: ${result.result.archived}`);
          console.log(`  Duration: ${result.result.duration}ms`);
        } else {
          console.log('\x1b[31mRetention cleanup failed\x1b[0m');
          for (const err of result.result.errors) {
            console.log(`  Error: ${err}`);
          }
        }
      }
      break;
    }

    case 'archive': {
      const result = await apiRequest<{
        observations: Array<{
          id: number;
          type: string;
          title: string | null;
          project: string;
          deleted_at_epoch: number;
          deletion_reason: string | null;
        }>;
        count: number;
        total: number;
      }>('/api/retention/archive/list');

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Archived Observations (${result.count} of ${result.total})`);
        console.log('─'.repeat(60));
        if (result.observations.length === 0) {
          console.log('No archived observations');
        } else {
          for (const obs of result.observations) {
            const deletedAt = new Date(obs.deleted_at_epoch).toLocaleString();
            console.log(`  #${obs.id} ${obs.title || '(untitled)'}`);
            console.log(`    Type: ${obs.type} | Project: ${obs.project}`);
            console.log(`    Deleted: ${deletedAt} | Reason: ${obs.deletion_reason || 'unknown'}`);
          }
        }
      }
      break;
    }

    case 'restore': {
      const result = await apiRequest<{
        success: boolean;
        restored: number;
        errors: string[];
      }>('/api/retention/restore', { method: 'POST', body: {} });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log(`\x1b[32mRestored ${result.restored} observations from archive\x1b[0m`);
        } else {
          console.log('\x1b[31mRestore failed\x1b[0m');
          for (const err of result.errors) {
            console.log(`  Error: ${err}`);
          }
        }
      }
      break;
    }

    default: {
      // Show current policy
      const result = await apiRequest<{
        policy: { enabled: boolean; maxAgeDays: number; maxCount: number; excludeTypes: string[]; softDelete: boolean };
      }>('/api/retention/policy');

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const { policy } = result;
        console.log('Retention Policy');
        console.log('─'.repeat(40));
        console.log(`  Enabled:      ${policy.enabled ? '\x1b[32myes\x1b[0m' : '\x1b[33mno\x1b[0m'}`);
        console.log(`  Max age:      ${policy.maxAgeDays > 0 ? `${policy.maxAgeDays} days` : 'disabled'}`);
        console.log(`  Max count:    ${policy.maxCount > 0 ? `${policy.maxCount} per project` : 'unlimited'}`);
        console.log(`  Exclude:      ${policy.excludeTypes.join(', ') || 'none'}`);
        console.log(`  Soft delete:  ${policy.softDelete ? 'yes (archive)' : 'no (permanent)'}`);
        console.log('');
        console.log('Commands:');
        console.log('  retention preview   Preview what would be deleted');
        console.log('  retention run       Run cleanup');
        console.log('  retention archive   Show archived observations');
        console.log('  retention restore   Restore all from archive');
      }
      break;
    }
  }
}

// ============================================================================
// CLAUDE.md Generation Commands
// ============================================================================

/**
 * Generate CLAUDE.md files for folders in the current project
 * Uses git ls-files to respect .gitignore
 */
export async function generateCommand(options: CLIOptions): Promise<void> {
  const { spawn } = await import('child_process');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  // Find the regenerate script
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const scriptPath = path.resolve(__dirname, '../../scripts/regenerate-claude-md.ts');

  const args: string[] = [];
  if (options.dryRun) {
    args.push('--dry-run');
  }

  if (options.json) {
    console.log(JSON.stringify({ action: 'generate', dryRun: options.dryRun ?? false }));
  }

  return new Promise((resolve, reject) => {
    const child = spawn('bun', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Generate script exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Clean auto-generated CLAUDE.md content
 * Strips <claude-mem-context> tags, deletes empty files
 */
export async function cleanCommand(options: CLIOptions): Promise<void> {
  const { spawn } = await import('child_process');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  // Find the regenerate script
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const scriptPath = path.resolve(__dirname, '../../scripts/regenerate-claude-md.ts');

  const args: string[] = ['--clean'];
  if (options.dryRun) {
    args.push('--dry-run');
  }

  if (options.json) {
    console.log(JSON.stringify({ action: 'clean', dryRun: options.dryRun ?? false }));
  }

  return new Promise((resolve, reject) => {
    const child = spawn('bun', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Clean script exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export async function runCLI(args: string[]): Promise<void> {
  const command = args[0];
  const subArgs = args.slice(1);

  // Parse common options
  const options: CLIOptions = {};
  const positionalArgs: string[] = [];

  for (let i = 0; i < subArgs.length; i++) {
    const arg = subArgs[i];
    if (arg === '--json' || arg === '-j') {
      options.json = true;
    } else if (arg === '--project' || arg === '-p') {
      options.project = subArgs[++i];
    } else if (arg === '--limit' || arg === '-l') {
      options.limit = parseInt(subArgs[++i], 10);
    } else if (arg === '--type' || arg === '-t') {
      options.type = subArgs[++i];
    } else if (arg === '--dry-run' || arg === '-n') {
      options.dryRun = true;
    } else if (!arg.startsWith('-')) {
      positionalArgs.push(arg);
    }
  }

  try {
    switch (command) {
      case 'status':
        await statusCommand(options);
        break;

      case 'search':
        if (positionalArgs.length === 0) {
          console.error('Usage: claude-mem search <query> [--project <name>] [--limit <n>] [--json]');
          process.exit(1);
        }
        await searchCommand(positionalArgs.join(' '), options);
        break;

      case 'export':
        await exportCommand(options);
        break;

      case 'import':
        await importCommand(positionalArgs[0], options);
        break;

      case 'cleanup':
        await cleanupCommand(options);
        break;

      case 'backup':
        if (positionalArgs[0] === 'list') {
          await backupsListCommand(options);
        } else {
          await backupCommand(options);
        }
        break;

      case 'doctor':
        await doctorCommand(options);
        break;

      case 'retention':
        await retentionCommand(positionalArgs[0], options);
        break;

      case 'generate':
        await generateCommand(options);
        break;

      case 'clean':
        await cleanCommand(options);
        break;

      default:
        console.log(`Unknown command: ${command}`);
        console.log('');
        console.log('Available commands:');
        console.log('  status              Show worker and queue status');
        console.log('  search <query>      Search memories');
        console.log('  export              Export memories as JSON');
        console.log('  import [file]       Import memories from file or stdin');
        console.log('  cleanup             Run cleanup tasks');
        console.log('  backup              Create a backup');
        console.log('  backup list         List existing backups');
        console.log('  doctor              Diagnose issues');
        console.log('  retention           Show retention policy');
        console.log('  retention preview   Preview cleanup');
        console.log('  retention run       Run cleanup');
        console.log('  retention archive   Show archived observations');
        console.log('  generate            Generate CLAUDE.md files for project folders');
        console.log('  clean               Remove auto-generated CLAUDE.md content');
        console.log('');
        console.log('Options:');
        console.log('  --json, -j          Output as JSON');
        console.log('  --project, -p       Filter by project');
        console.log('  --limit, -l         Limit results');
        console.log('  --dry-run, -n       Preview changes without writing');
        process.exit(1);
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    process.exit(1);
  }
}
