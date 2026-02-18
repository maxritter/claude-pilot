/**
 * Worker Service - Slim Orchestrator
 *
 * Refactored from 2000-line monolith to ~300-line orchestrator.
 * Delegates to specialized modules:
 * - src/services/server/ - HTTP server, middleware, error handling
 * - src/services/infrastructure/ - Process management, health monitoring, shutdown
 * - src/services/worker/ - Business logic, routes, agents
 */

import path from "path";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getWorkerPort, getWorkerHost, getWorkerBind } from "../shared/worker-utils.js";
import { logger } from "../utils/logger.js";

declare const __DEFAULT_PACKAGE_VERSION__: string;
const packageVersion = typeof __DEFAULT_PACKAGE_VERSION__ !== "undefined" ? __DEFAULT_PACKAGE_VERSION__ : "0.0.0-dev";

import {
  writePidFile,
  removePidFile,
  getPlatformTimeout,
  cleanupOrphanedProcesses,
  cleanupOrphanedClaudeProcesses,
  spawnDaemon,
  createSignalHandler,
} from "./infrastructure/ProcessManager.js";
import {
  isPortInUse,
  waitForHealth,
  waitForPortFree,
  httpShutdown,
  checkVersionMatch,
} from "./infrastructure/HealthMonitor.js";
import { performGracefulShutdown } from "./infrastructure/GracefulShutdown.js";
import { ensureWorkerDaemon } from "./infrastructure/EnsureWorkerDaemon.js";

import { Server } from "./server/Server.js";

import { DatabaseManager } from "./worker/DatabaseManager.js";
import { SessionManager } from "./worker/SessionManager.js";
import { SSEBroadcaster } from "./worker/SSEBroadcaster.js";
import { SDKAgent } from "./worker/SDKAgent.js";
import { PaginationHelper } from "./worker/PaginationHelper.js";
import { SearchManager } from "./worker/SearchManager.js";
import { FormattingService } from "./worker/FormattingService.js";
import { TimelineService } from "./worker/TimelineService.js";
import { SessionEventBroadcaster } from "./worker/events/SessionEventBroadcaster.js";
import type { WorkerRef } from "./worker/agents/types.js";

import { ViewerRoutes } from "./worker/http/routes/ViewerRoutes.js";
import { SessionRoutes } from "./worker/http/routes/SessionRoutes.js";
import { DataRoutes } from "./worker/http/routes/DataRoutes.js";
import { SearchRoutes } from "./worker/http/routes/SearchRoutes.js";
import { LogsRoutes } from "./worker/http/routes/LogsRoutes.js";
import { MemoryRoutes } from "./worker/http/routes/MemoryRoutes.js";
import { BackupRoutes } from "./worker/http/routes/BackupRoutes.js";
import { RetentionRoutes } from "./worker/http/routes/RetentionRoutes.js";
import { MetricsRoutes } from "./worker/http/routes/MetricsRoutes.js";
import { AuthRoutes } from "./worker/http/routes/AuthRoutes.js";
import { PlanRoutes } from "./worker/http/routes/PlanRoutes.js";
import { WorktreeRoutes } from "./worker/http/routes/WorktreeRoutes.js";
import { UsageRoutes } from "./worker/http/routes/UsageRoutes.js";
import { LicenseRoutes } from "./worker/http/routes/LicenseRoutes.js";
import { VaultRoutes } from "./worker/http/routes/VaultRoutes.js";
import { VexorRoutes } from "./worker/http/routes/VexorRoutes.js";
import { SettingsRoutes } from "./worker/http/routes/SettingsRoutes.js";
import { MetricsService } from "./worker/MetricsService.js";
import { startRetentionScheduler, stopRetentionScheduler } from "./worker/RetentionScheduler.js";

/**
 * Build JSON status output for hook framework communication.
 * This is a pure function extracted for testability.
 *
 * @param status - 'ready' for successful startup, 'error' for failures
 * @param message - Optional error message (only included when provided)
 * @returns JSON object with continue, suppressOutput, status, and optionally message
 */
export interface StatusOutput {
  continue: true;
  suppressOutput: true;
  status: "ready" | "error";
  message?: string;
}

export function buildStatusOutput(status: "ready" | "error", message?: string): StatusOutput {
  return {
    continue: true,
    suppressOutput: true,
    status,
    ...(message && { message }),
  };
}

/**
 * Verify license using the pilot binary.
 * Returns true if license is valid, false otherwise.
 */
export function verifyLicense(): boolean {
  const pilotPath = `${homedir()}/.pilot/bin/pilot`;

  if (!existsSync(pilotPath)) {
    logger.warn("SYSTEM", "Pilot binary not found, skipping license check");
    return true;
  }

  try {
    execSync(`"${pilotPath}" verify`, {
      stdio: "pipe",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

export class WorkerService {
  private server: Server;
  private startTime: number = Date.now();
  private mcpClient: Client;

  private coreReady: boolean = false;
  private mcpReady: boolean = false;
  private initializationCompleteFlag: boolean = false;
  private isShuttingDown: boolean = false;

  private dbManager: DatabaseManager;
  private sessionManager: SessionManager;
  private sseBroadcaster: SSEBroadcaster;
  private sdkAgent: SDKAgent;
  private paginationHelper: PaginationHelper;
  private sessionEventBroadcaster: SessionEventBroadcaster;

  private searchRoutes: SearchRoutes | null = null;
  private metricsService: MetricsService | null = null;
  private vexorRoutes: VexorRoutes | null = null;

  private initializationComplete: Promise<void>;
  private resolveInitialization!: () => void;

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializationComplete = new Promise((resolve) => {
      this.resolveInitialization = resolve;
    });

    this.dbManager = new DatabaseManager();
    this.sessionManager = new SessionManager(this.dbManager);
    this.sseBroadcaster = new SSEBroadcaster();
    this.sdkAgent = new SDKAgent(this.dbManager, this.sessionManager);

    this.paginationHelper = new PaginationHelper(this.dbManager);
    this.sessionEventBroadcaster = new SessionEventBroadcaster(this.sseBroadcaster, this);

    this.sessionManager.setOnSessionDeleted(() => {
      this.broadcastProcessingStatus();
    });

    this.mcpClient = new Client(
      {
        name: "worker-search-proxy",
        version: packageVersion,
      },
      { capabilities: {} },
    );

    this.server = new Server({
      getInitializationComplete: () => this.initializationCompleteFlag,
      getCoreReady: () => this.coreReady,
      getMcpReady: () => this.mcpReady,
      onShutdown: () => this.shutdown(),
      onRestart: () => this.shutdown(),
    });

    this.registerRoutes();

    this.registerSignalHandlers();
  }

  /**
   * Register signal handlers for graceful shutdown
   */
  private registerSignalHandlers(): void {
    const shutdownRef = { value: this.isShuttingDown };
    const handler = createSignalHandler(() => this.shutdown(), shutdownRef);

    process.on("SIGTERM", () => {
      this.isShuttingDown = shutdownRef.value;
      handler("SIGTERM");
    });
    process.on("SIGINT", () => {
      this.isShuttingDown = shutdownRef.value;
      handler("SIGINT");
    });

    if (process.platform !== "win32") {
      process.on("SIGHUP", () => {
        const isDaemon = process.argv.includes("--daemon");
        if (isDaemon) {
          logger.info("SYSTEM", "Received SIGHUP in daemon mode, ignoring", {});
        } else {
          this.isShuttingDown = shutdownRef.value;
          handler("SIGHUP");
        }
      });
    }
  }

  /**
   * Register all route handlers with the server
   */
  private registerRoutes(): void {
    this.server.app.get("/api/context/inject", async (req, res, next) => {
      const timeoutMs = 300000;
      try {
        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Initialization timeout")), timeoutMs),
        );

        await Promise.race([this.initializationComplete, timeoutPromise]);

        if (!this.searchRoutes) {
          res.status(503).json({ error: "Search routes not initialized" });
          return;
        }

        next();
      } catch {
        res.status(503).json({ error: "Service initialization timed out" });
      }
    });

    this.server.registerRoutes(new AuthRoutes());

    this.server.registerRoutes(new ViewerRoutes(this.sseBroadcaster, this.dbManager, this.sessionManager));
    this.server.registerRoutes(
      new SessionRoutes(this.sessionManager, this.dbManager, this.sdkAgent, this.sessionEventBroadcaster, this),
    );
    this.server.registerRoutes(
      new DataRoutes(
        this.paginationHelper,
        this.dbManager,
        this.sessionManager,
        this.sseBroadcaster,
        this,
        this.startTime,
      ),
    );
    this.server.registerRoutes(new LogsRoutes());
    this.server.registerRoutes(new MemoryRoutes(this.dbManager, "pilot-memory"));
    this.server.registerRoutes(new BackupRoutes(this.dbManager));
    this.server.registerRoutes(new RetentionRoutes(this.dbManager));
    this.server.registerRoutes(new PlanRoutes(this.dbManager, this.sseBroadcaster));
    this.server.registerRoutes(new WorktreeRoutes());

    this.metricsService = new MetricsService(this.dbManager, this.sessionManager, this.startTime);
    this.server.registerRoutes(new MetricsRoutes(this.metricsService));

    this.vexorRoutes = new VexorRoutes(this.dbManager);
    this.server.registerRoutes(this.vexorRoutes);

    this.server.registerRoutes(new UsageRoutes());
    this.server.registerRoutes(new LicenseRoutes());
    this.server.registerRoutes(new VaultRoutes());
    this.server.registerRoutes(new SettingsRoutes());

    startRetentionScheduler(this.dbManager);
  }

  /**
   * Start the worker service
   */
  async start(): Promise<void> {
    const port = getWorkerPort();
    const bind = getWorkerBind();
    const host = getWorkerHost();

    await this.server.listen(port, bind);
    logger.info("SYSTEM", "Worker started", { bind, host, port, pid: process.pid });

    this.initializeBackground().catch((error) => {
      logger.error("SYSTEM", "Background initialization failed", {}, error as Error);
    });
  }

  /**
   * Background initialization - runs after HTTP server is listening
   */
  private async initializeBackground(): Promise<void> {
    try {
      await cleanupOrphanedProcesses();
      await cleanupOrphanedClaudeProcesses();

      const { ModeManager } = await import("./domain/ModeManager.js");
      ModeManager.getInstance().loadMode();
      logger.info("SYSTEM", "Mode loaded: Code Development");

      await this.dbManager.initialize();

      const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
      const projectName = path.basename(projectRoot);
      this.dbManager.getSessionStore().upsertProjectRoot(projectName, projectRoot);

      const { PendingMessageStore } = await import("./sqlite/PendingMessageStore.js");
      const pendingStore = new PendingMessageStore(this.dbManager.getSessionStore().db, 3);
      const STUCK_THRESHOLD_MS = 5 * 60 * 1000;
      const resetCount = pendingStore.resetStuckMessages(STUCK_THRESHOLD_MS);
      if (resetCount > 0) {
        logger.info("SYSTEM", `Recovered ${resetCount} stuck messages from previous session`, { thresholdMinutes: 5 });
      }

      const formattingService = new FormattingService();
      const timelineService = new TimelineService();
      const searchManager = new SearchManager(
        this.dbManager.getSessionSearch(),
        this.dbManager.getSessionStore(),
        this.dbManager.getVectorSync(),
        formattingService,
        timelineService,
      );
      this.searchRoutes = new SearchRoutes(searchManager);
      this.server.registerRoutes(this.searchRoutes);
      logger.info("WORKER", "SearchManager initialized and search routes registered");

      this.coreReady = true;
      logger.info("SYSTEM", "Core services ready (hooks can proceed)");

      const possibleMcpPaths = [
        path.join(__dirname, "mcp-server.cjs"),
        path.join(__dirname, "..", "servers", "mcp-server.ts"),
        path.join(__dirname, "..", "..", "servers", "mcp-server.ts"),
      ];
      const mcpServerPath = possibleMcpPaths.find((p) => existsSync(p)) || possibleMcpPaths[0];
      const isTsFile = mcpServerPath.endsWith(".ts");

      const transport = new StdioClientTransport({
        command: isTsFile ? "bun" : "node",
        args: [mcpServerPath],
        env: process.env as Record<string, string>,
      });

      const MCP_INIT_TIMEOUT_MS = 300000;
      const mcpConnectionPromise = this.mcpClient.connect(transport);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("MCP connection timeout after 5 minutes")), MCP_INIT_TIMEOUT_MS),
      );

      await Promise.race([mcpConnectionPromise, timeoutPromise]);
      this.mcpReady = true;
      logger.success("WORKER", "Connected to MCP server");

      this.initializationCompleteFlag = true;
      this.resolveInitialization();
      logger.info("SYSTEM", "Background initialization complete");

      this.processPendingQueues(50)
        .then((result) => {
          if (result.sessionsStarted > 0) {
            logger.info("SYSTEM", `Auto-recovered ${result.sessionsStarted} sessions with pending work`, {
              totalPending: result.totalPendingSessions,
              started: result.sessionsStarted,
              sessionIds: result.startedSessionIds,
            });
          }
        })
        .catch((error) => {
          logger.error("SYSTEM", "Auto-recovery of pending queues failed", {}, error as Error);
        });

      const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
      const STALE_SESSION_THRESHOLD_MS = 60 * 60 * 1000;
      this.cleanupInterval = setInterval(async () => {
        try {
          const staleSessions = await this.sessionManager.cleanupStaleSessions(STALE_SESSION_THRESHOLD_MS);
          if (staleSessions > 0) {
            logger.info("SYSTEM", `Periodic cleanup: removed ${staleSessions} stale sessions`);
          }

          await cleanupOrphanedProcesses();
          await cleanupOrphanedClaudeProcesses();
          logger.debug("SYSTEM", "Periodic cleanup completed");
        } catch (error) {
          logger.error("SYSTEM", "Periodic cleanup failed", {}, error as Error);
        }
      }, CLEANUP_INTERVAL_MS);
      logger.info("SYSTEM", "Started periodic cleanup (every 5 minutes)");
    } catch (error) {
      logger.error("SYSTEM", "Background initialization failed", {}, error as Error);
      throw error;
    }
  }

  /**
   * Get the agent for processing (Claude SDK only)
   */
  private getActiveAgent(): SDKAgent {
    return this.sdkAgent;
  }

  /**
   * Start a session processor
   */
  private startSessionProcessor(session: ReturnType<typeof this.sessionManager.getSession>, source: string): void {
    if (!session) return;

    if (session.abortController.signal.aborted) {
      session.abortController = new AbortController();
      logger.debug("SYSTEM", "Reset AbortController for session restart", { sessionId: session.sessionDbId });
    }

    const sid = session.sessionDbId;
    const agent = this.getActiveAgent();
    const providerName = agent.constructor.name;

    logger.info("SYSTEM", `Starting generator (${source}) using ${providerName}`, { sessionId: sid });

    session.generatorPromise = agent
      .startSession(session, this as unknown as WorkerRef)
      .catch((error) => {
        logger.error(
          "SDK",
          "Session generator failed",
          {
            sessionId: session.sessionDbId,
            project: session.project,
            provider: providerName,
          },
          error as Error,
        );
      })
      .finally(() => {
        session.generatorPromise = null;
        this.broadcastProcessingStatus();
      });
  }

  /**
   * Process pending session queues
   */
  async processPendingQueues(sessionLimit: number = 10): Promise<{
    totalPendingSessions: number;
    sessionsStarted: number;
    sessionsSkipped: number;
    startedSessionIds: number[];
  }> {
    const { PendingMessageStore } = await import("./sqlite/PendingMessageStore.js");
    const pendingStore = new PendingMessageStore(this.dbManager.getSessionStore().db, 3);
    const sessionStore = this.dbManager.getSessionStore();

    const staleThresholdMs = 30 * 60 * 1000;
    const staleThreshold = Date.now() - staleThresholdMs;

    try {
      const staleSessionIds = sessionStore.db
        .prepare(
          `
        SELECT s.id FROM sdk_sessions s
        WHERE s.status = 'active'
        AND s.started_at_epoch < ?
        AND NOT EXISTS (
          SELECT 1 FROM pending_messages pm
          WHERE pm.session_db_id = s.id
          AND pm.created_at_epoch > ?
        )
        AND NOT EXISTS (
          SELECT 1 FROM observations o
          WHERE o.memory_session_id = s.memory_session_id
          AND o.created_at_epoch > ?
        )
      `,
        )
        .all(staleThreshold, staleThreshold, staleThreshold) as { id: number }[];

      if (staleSessionIds.length > 0) {
        const ids = staleSessionIds.map((r) => r.id);
        const placeholders = ids.map(() => "?").join(",");
        const now = Date.now();

        const sessionsWithSummaries = sessionStore.db
          .prepare(
            `
          SELECT DISTINCT s.id FROM sdk_sessions s
          INNER JOIN session_summaries sm ON sm.memory_session_id = s.memory_session_id
          WHERE s.id IN (${placeholders})
        `,
          )
          .all(...ids) as { id: number }[];
        const completedIds = new Set(sessionsWithSummaries.map((r) => r.id));

        for (const id of ids) {
          const status = completedIds.has(id) ? "completed" : "failed";
          sessionStore.db
            .prepare(
              `
            UPDATE sdk_sessions SET status = ?, completed_at_epoch = ? WHERE id = ?
          `,
            )
            .run(status, now, id);
        }

        const completedCount = completedIds.size;
        const failedCount = ids.length - completedCount;
        if (completedCount > 0) {
          logger.info("SYSTEM", `Marked ${completedCount} stale sessions as completed (had summaries)`);
        }
        if (failedCount > 0) {
          logger.info("SYSTEM", `Marked ${failedCount} stale sessions as failed (no summaries)`);
        }

        const msgResult = sessionStore.db
          .prepare(
            `
          UPDATE pending_messages
          SET status = 'failed', failed_at_epoch = ?
          WHERE status = 'pending'
          AND session_db_id IN (${placeholders})
        `,
          )
          .run(Date.now(), ...ids);

        if (msgResult.changes > 0) {
          logger.info("SYSTEM", `Marked ${msgResult.changes} pending messages from stale sessions as failed`);
        }
      }
    } catch (error) {
      logger.error("SYSTEM", "Failed to clean up stale sessions", {}, error as Error);
    }

    const orphanedSessionIds = pendingStore.getSessionsWithPendingMessages();

    const result = {
      totalPendingSessions: orphanedSessionIds.length,
      sessionsStarted: 0,
      sessionsSkipped: 0,
      startedSessionIds: [] as number[],
    };

    if (orphanedSessionIds.length === 0) return result;

    logger.info("SYSTEM", `Processing up to ${sessionLimit} of ${orphanedSessionIds.length} pending session queues`);

    for (const sessionDbId of orphanedSessionIds) {
      if (result.sessionsStarted >= sessionLimit) break;

      try {
        const existingSession = this.sessionManager.getSession(sessionDbId);
        if (existingSession?.generatorPromise) {
          result.sessionsSkipped++;
          continue;
        }

        const session = this.sessionManager.initializeSession(sessionDbId);
        logger.info("SYSTEM", `Starting processor for session ${sessionDbId}`, {
          project: session.project,
          pendingCount: pendingStore.getPendingCount(sessionDbId),
        });

        this.startSessionProcessor(session, "startup-recovery");
        result.sessionsStarted++;
        result.startedSessionIds.push(sessionDbId);

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error("SYSTEM", `Failed to process session ${sessionDbId}`, {}, error as Error);
        result.sessionsSkipped++;
      }
    }

    return result;
  }

  /**
   * Shutdown the worker service
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info("SYSTEM", "Stopped periodic orphan cleanup");
    }

    stopRetentionScheduler();

    if (this.vexorRoutes) {
      this.vexorRoutes.dispose();
    }

    await performGracefulShutdown({
      server: this.server.getHttpServer(),
      sessionManager: this.sessionManager,
      mcpClient: this.mcpClient,
      dbManager: this.dbManager,
    });
  }

  /**
   * Broadcast processing status change to SSE clients
   */
  broadcastProcessingStatus(): void {
    const isProcessing = this.sessionManager.isAnySessionProcessing();
    const queueDepth = this.sessionManager.getTotalActiveWork();
    const activeSessions = this.sessionManager.getActiveSessionCount();

    logger.info("WORKER", "Broadcasting processing status", {
      isProcessing,
      queueDepth,
      activeSessions,
    });

    this.sseBroadcaster.broadcast({
      type: "processing_status",
      isProcessing,
      queueDepth,
    });
  }
}

async function main() {
  const command = process.argv[2];
  const port = getWorkerPort();

  function exitWithStatus(status: "ready" | "error", message?: string): never {
    const output = buildStatusOutput(status, message);
    console.log(JSON.stringify(output));
    process.exit(0);
  }

  switch (command) {
    case "start": {
      if (!verifyLicense()) {
        logger.error("SYSTEM", "License verification failed");
        exitWithStatus(
          "error",
          "UNLICENSED: Using Claude Pilot without a valid license is not permitted. Subscribe at https://claude-pilot.com then run: pilot activate <LICENSE_KEY>",
        );
      }

      const result = await ensureWorkerDaemon(port, __filename);
      if (result.ready) {
        logger.info("SYSTEM", "Worker started successfully");
        exitWithStatus("ready");
      } else {
        logger.error("SYSTEM", result.error ?? "Worker failed to start");
        exitWithStatus("error", result.error);
      }
    }

    case "stop": {
      await httpShutdown(port);
      const freed = await waitForPortFree(port, getPlatformTimeout(15000));
      if (!freed) {
        logger.warn("SYSTEM", "Port did not free up after shutdown", { port });
      }
      removePidFile();
      logger.info("SYSTEM", "Worker stopped successfully");
      process.exit(0);
    }

    case "restart": {
      logger.info("SYSTEM", "Restarting worker");
      await httpShutdown(port);
      const freed = await waitForPortFree(port, getPlatformTimeout(15000));
      if (!freed) {
        logger.error("SYSTEM", "Port did not free up after shutdown, aborting restart", { port });
        process.exit(0);
      }
      removePidFile();

      const pid = spawnDaemon(__filename, port);
      if (pid === undefined) {
        logger.error("SYSTEM", "Failed to spawn worker daemon during restart");
        process.exit(0);
      }

      writePidFile({ pid, port, startedAt: new Date().toISOString() });

      const healthy = await waitForHealth(port, getPlatformTimeout(30000));
      if (!healthy) {
        removePidFile();
        logger.error("SYSTEM", "Worker failed to restart");
        process.exit(0);
      }

      logger.info("SYSTEM", "Worker restarted successfully");
      process.exit(0);
    }

    case "status": {
      const { runCLI } = await import("../cli/commands.js");
      await runCLI(process.argv.slice(2));
      process.exit(0);
    }

    case "hook": {
      const platform = process.argv[3];
      const event = process.argv[4];
      if (!platform || !event) {
        console.error("Usage: pilot-memory hook <platform> <event>");
        console.error("Platforms: claude-code, raw");
        console.error("Events: context, session-init, observation, summarize, user-message");
        process.exit(1);
      }
      await ensureWorkerDaemon(port, __filename);
      const { hookCommand } = await import("../cli/hook-command.js");
      await hookCommand(platform, event);
      break;
    }

    case "search":
    case "export":
    case "import":
    case "cleanup":
    case "backup":
    case "doctor":
    case "retention":
    case "vacuum": {
      const { runCLI } = await import("../cli/commands.js");
      await runCLI(process.argv.slice(2));
      process.exit(0);
    }

    case "--daemon":
    default: {
      process.on("unhandledRejection", (reason, promise) => {
        logger.failure(
          "SYSTEM",
          "Unhandled rejection in daemon mode",
          { promise: String(promise) },
          reason instanceof Error ? reason : new Error(String(reason)),
        );
      });

      process.on("uncaughtException", (error) => {
        logger.failure("SYSTEM", "Uncaught exception in daemon mode", {}, error);
      });

      const worker = new WorkerService();
      worker.start().catch((error) => {
        logger.failure("SYSTEM", "Worker failed to start", {}, error as Error);
        removePidFile();
        process.exit(0);
      });
    }
  }
}

const isMainModule =
  typeof require !== "undefined" && typeof module !== "undefined"
    ? require.main === module || !module.parent
    : import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("worker-service");

if (isMainModule) {
  main();
}
