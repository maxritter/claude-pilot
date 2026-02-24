import { StatsGrid } from "./StatsGrid";
import { WorkerStatus } from "./WorkerStatus";
import { VexorStatus } from "./VexorStatus";
import { VaultStatus } from "./VaultStatus";
import { PlanStatus } from "./PlanStatus";
import { useStats } from "../../hooks/useStats";
import { useProject } from "../../context";

export function DashboardView() {
  const {
    stats,
    workerStatus,
    vexorStatus,
    vaultStatus,
    planStatus,
    specStats,
    isLoading,
  } = useStats();
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
          {selectedProject
            ? `Filtered by: ${selectedProject}`
            : "Overview of your Pilot Shell Console"}
        </p>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} specStats={specStats} />

      {/* Workspace status cards — not filtered by project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 [&>*]:h-full">
        <VexorStatus
          isIndexed={vexorStatus.isIndexed}
          files={vexorStatus.files}
          generatedAt={vexorStatus.generatedAt}
          isReindexing={vexorStatus.isReindexing}
        />
        <PlanStatus plans={planStatus.plans} />
        <VaultStatus {...vaultStatus} isLoading={isLoading} />
        <WorkerStatus
          status={workerStatus.status}
          version={workerStatus.version}
          uptime={workerStatus.uptime}
          queueDepth={workerStatus.queueDepth}
        />
      </div>
    </div>
  );
}
