import { StatsGrid } from './StatsGrid';
import { WorkerStatus } from './WorkerStatus';
import { VexorStatus } from './VexorStatus';
import { PlanStatus } from './PlanStatus';
import { GitStatus } from './GitStatus';
import { useStats } from '../../hooks/useStats';
import { useProject } from '../../context';

export function DashboardView() {
  const { stats, workerStatus, vexorStatus, planStatus, gitInfo, specStats, isLoading } = useStats();
  const { selectedProject } = useProject();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-base-content/60">
          {selectedProject ? `Filtered by: ${selectedProject}` : 'Overview of your Pilot Console'}
        </p>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} specStats={specStats} />

      {/* Workspace-level status (shown when no project filter or matching workspace project) */}
      {(!selectedProject || selectedProject === workerStatus.workspaceProject) && <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/40">Workspace</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PlanStatus plans={planStatus.plans} />
          <WorkerStatus
            status={workerStatus.status}
            version={workerStatus.version}
            uptime={workerStatus.uptime}
            queueDepth={workerStatus.queueDepth}
          />
          <VexorStatus
            isIndexed={vexorStatus.isIndexed}
            files={vexorStatus.files}
            generatedAt={vexorStatus.generatedAt}
            isReindexing={vexorStatus.isReindexing}
          />
          <GitStatus gitInfo={gitInfo} />
        </div>
      </div>}
    </div>
  );
}
