import { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "../context";

interface Stats {
  observations: number;
  summaries: number;
  sessions: number;
  lastObservationAt: string | null;
  projects: number;
}

interface SpecStats {
  totalSpecs: number;
  verified: number;
  inProgress: number;
  pending: number;
  avgIterations: number;
  totalTasksCompleted: number;
  totalTasks: number;
  completionTimeline: Array<{ date: string; count: number }>;
  recentlyVerified: Array<{ name: string; verifiedAt: string }>;
}

type ObservationTimeline = Array<{ date: string; count: number }>;

interface WorkerStatus {
  status: "online" | "offline" | "processing";
  version?: string;
  uptime?: string;
  queueDepth?: number;
  workspaceProject?: string;
}

interface VexorStatus {
  isIndexed: boolean;
  files: number;
  mode: string;
  model: string;
  generatedAt: string | null;
  isReindexing: boolean;
}

interface ActivityItem {
  id: number;
  type: "observation" | "summary" | "prompt";
  title: string;
  project: string;
  timestamp: string;
}

interface PlanInfo {
  name: string;
  status: "PENDING" | "COMPLETE" | "VERIFIED";
  completed: number;
  total: number;
  phase: "plan" | "implement" | "verify";
  iterations: number;
  approved: boolean;
  worktree: boolean;
  specType?: "Feature" | "Bugfix";
  filePath?: string;
}

interface PlanStatus {
  active: boolean;
  plans: PlanInfo[];
}

interface GitInfo {
  branch: string | null;
  staged: number;
  unstaged: number;
  untracked: number;
}

interface VaultAsset {
  name: string;
  version: string;
  type: string;
  clients: string[];
  status: string;
  scope: string;
}

interface VaultCatalogItem {
  name: string;
  type: string;
  latestVersion: string;
  versionsCount: number;
}

export interface VaultStatus {
  installed: boolean;
  version: string | null;
  configured: boolean;
  vaultUrl: string | null;
  profile: string | null;
  assets: VaultAsset[];
  catalog: VaultCatalogItem[];
  isInstalling: boolean;
}

interface UseStatsResult {
  stats: Stats;
  workerStatus: WorkerStatus;
  vexorStatus: VexorStatus;
  vaultStatus: VaultStatus;
  recentActivity: ActivityItem[];
  planStatus: PlanStatus;
  gitInfo: GitInfo;
  specStats: SpecStats;
  observationTimeline: ObservationTimeline;
  isLoading: boolean;
  refreshStats: () => Promise<void>;
}

const VEXOR_POLL_INTERVAL_MS = 60_000;

export function useStats(): UseStatsResult {
  const { selectedProject, setProjects } = useProject();

  const [stats, setStats] = useState<Stats>({
    observations: 0,
    summaries: 0,
    sessions: 0,
    lastObservationAt: null,
    projects: 0,
  });
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>({
    status: "offline",
  });
  const [vexorStatus, setVexorStatus] = useState<VexorStatus>({
    isIndexed: false,
    files: 0,
    mode: "",
    model: "",
    generatedAt: null,
    isReindexing: false,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [planStatus, setPlanStatus] = useState<PlanStatus>({
    active: false,
    plans: [],
  });
  const [gitInfo, setGitInfo] = useState<GitInfo>({
    branch: null,
    staged: 0,
    unstaged: 0,
    untracked: 0,
  });
  const [specStats, setSpecStats] = useState<SpecStats>({
    totalSpecs: 0,
    verified: 0,
    inProgress: 0,
    pending: 0,
    avgIterations: 0,
    totalTasksCompleted: 0,
    totalTasks: 0,
    completionTimeline: [],
    recentlyVerified: [],
  });
  const [observationTimeline, setObservationTimeline] =
    useState<ObservationTimeline>([]);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>({
    installed: false,
    version: null,
    configured: false,
    vaultUrl: null,
    profile: null,
    assets: [],
    catalog: [],
    isInstalling: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadVaultStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/vault/status");
      const data = await res.json();
      setVaultStatus(data);
    } catch {}
  }, []);

  const loadVexorStatus = useCallback(async () => {
    try {
      const vexorParam = selectedProject
        ? `?project=${encodeURIComponent(selectedProject)}`
        : "";
      const res = await fetch(`/api/vexor/status${vexorParam}`);
      const data = await res.json();
      setVexorStatus({
        isIndexed: data.isIndexed ?? false,
        files: data.files ?? 0,
        mode: data.mode ?? "",
        model: data.model ?? "",
        generatedAt: data.generatedAt ?? null,
        isReindexing: data.isReindexing ?? false,
      });
    } catch {}
  }, [selectedProject]);

  const loadStats = useCallback(async () => {
    const projectParam = selectedProject
      ? `?project=${encodeURIComponent(selectedProject)}`
      : "";
    try {
      const [
        statsRes,
        healthRes,
        activityRes,
        projectsRes,
        planRes,
        gitRes,
        specStatsRes,
        timelineRes,
      ] = await Promise.all([
        fetch(`/api/stats${projectParam}`),
        fetch("/health"),
        fetch(
          `/api/observations?limit=5${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ""}`,
        ),
        fetch("/api/projects"),
        fetch(`/api/plan${projectParam}`),
        fetch(`/api/git${projectParam}`),
        fetch(`/api/plans/stats${projectParam}`).catch(() => null),
        fetch(
          `/api/analytics/timeline?range=30d${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ""}`,
        ).catch(() => null),
      ]);

      const statsData = await statsRes.json();
      const healthData = await healthRes.json();
      const activityData = await activityRes.json();
      const projectsData = await projectsRes.json();
      const planData = await planRes.json();
      const gitData = await gitRes.json();

      if (specStatsRes?.ok) {
        const specData = await specStatsRes.json();
        setSpecStats(specData);
      }

      if (timelineRes?.ok) {
        const tlData = await timelineRes.json();
        setObservationTimeline(tlData.data || []);
      }

      const rawItems =
        activityData.items || activityData.observations || activityData || [];
      const recentItems = Array.isArray(rawItems) ? rawItems : [];
      const lastObsTimestamp =
        recentItems.length > 0 ? recentItems[0]?.created_at || null : null;

      const projectList: string[] = projectsData.projects || [];
      setProjects(projectList);

      setStats({
        observations: statsData.database?.observations || 0,
        summaries: statsData.database?.summaries || 0,
        sessions: statsData.database?.sessions || 0,
        lastObservationAt: lastObsTimestamp
          ? formatTimestamp(lastObsTimestamp)
          : null,
        projects: projectList.length,
      });

      setWorkerStatus({
        status:
          healthData.status === "ok"
            ? healthData.isProcessing
              ? "processing"
              : "online"
            : "offline",
        version: statsData.worker?.version,
        uptime: statsData.worker?.uptime
          ? formatUptime(statsData.worker.uptime)
          : undefined,
        queueDepth: healthData.queueDepth || 0,
        workspaceProject: statsData.worker?.workspaceProject,
      });

      const items =
        activityData.items || activityData.observations || activityData || [];
      setRecentActivity(
        (Array.isArray(items) ? items : []).slice(0, 5).map((obs: any) => ({
          id: obs.id,
          type: obs.obs_type || obs.type || "observation",
          title: obs.title || obs.content?.slice(0, 100) || "Untitled",
          project: obs.project || "unknown",
          timestamp: formatTimestamp(obs.created_at),
        })),
      );

      const plans: PlanInfo[] =
        planData.plans || (planData.plan ? [planData.plan] : []);
      setPlanStatus({
        active: plans.length > 0,
        plans,
      });

      setGitInfo({
        branch: gitData.branch || null,
        staged: gitData.staged || 0,
        unstaged: gitData.unstaged || 0,
        untracked: gitData.untracked || 0,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
      setWorkerStatus({ status: "offline" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, setProjects]);

  const loadStatsRef = useRef(loadStats);
  useEffect(() => {
    loadStatsRef.current = loadStats;
  }, [loadStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadVexorStatus();
    loadVaultStatus();
    const vexorInterval = setInterval(loadVexorStatus, VEXOR_POLL_INTERVAL_MS);

    const eventSource = new EventSource("/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "processing_status") {
          setWorkerStatus((prev) => ({
            ...prev,
            status: data.isProcessing ? "processing" : "online",
            queueDepth: data.queueDepth ?? prev.queueDepth,
          }));
        }

        if (
          data.type === "new_observation" ||
          data.type === "new_summary" ||
          data.type === "plan_association_changed"
        ) {
          loadStatsRef.current();
        }
      } catch (e) {}
    };

    return () => {
      clearInterval(vexorInterval);
      eventSource.close();
    };
  }, [loadVexorStatus, loadVaultStatus]);

  return {
    stats,
    workerStatus,
    vexorStatus,
    vaultStatus,
    recentActivity,
    planStatus,
    gitInfo,
    specStats,
    observationTimeline,
    isLoading,
    refreshStats: loadStats,
  };
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
