import { StatsCard } from './StatsCard';

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

interface StatsGridProps {
  stats: Stats;
  specStats?: SpecStats;
}

export function StatsGrid({ stats, specStats }: StatsGridProps) {
  const successRate = specStats && specStats.totalSpecs > 0
    ? `${Math.round((specStats.verified / specStats.totalSpecs) * 100)}% success`
    : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        icon="lucide:brain"
        label="Observations"
        value={stats.observations.toLocaleString()}
      />
      <StatsCard
        icon="lucide:scroll"
        label="Total Specs"
        value={(specStats?.totalSpecs ?? 0).toLocaleString()}
      />
      <StatsCard
        icon="lucide:shield-check"
        label="Verified"
        value={(specStats?.verified ?? 0).toLocaleString()}
        subtext={successRate}
      />
      <StatsCard
        icon="lucide:loader"
        label="In Progress"
        value={(specStats?.inProgress ?? 0).toLocaleString()}
      />
      <StatsCard
        icon="lucide:history"
        label="Sessions"
        value={stats.sessions.toLocaleString()}
      />
      <StatsCard
        icon="lucide:clock"
        label="Last Observation"
        value={stats.lastObservationAt || 'None yet'}
      />
      <StatsCard
        icon="lucide:file-text"
        label="Summaries"
        value={stats.summaries.toLocaleString()}
      />
      <StatsCard
        icon="lucide:check-square"
        label="Tasks Completed"
        value={(specStats?.totalTasksCompleted ?? 0).toLocaleString()}
        subtext={specStats && specStats.totalTasks > 0 ? `of ${specStats.totalTasks} total` : undefined}
      />
    </div>
  );
}
