import React from 'react';
import { StatsGrid } from './StatsGrid';
import { WorkerStatus } from './WorkerStatus';
import { VectorDbStatus } from './VectorDbStatus';
import { PlanStatus } from './PlanStatus';
import { GitStatus } from './GitStatus';
import { RecentActivity } from './RecentActivity';
import { AnalyticsSection } from './AnalyticsSection';
import { useStats } from '../../hooks/useStats';

export function DashboardView() {
  const { stats, workerStatus, vectorDbStatus, recentActivity, planStatus, gitInfo, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-base-content/60">Overview of your Claude Pilot memory instance</p>
      </div>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanStatus
          active={planStatus.active}
          plan={planStatus.plan}
        />
        <WorkerStatus
          status={workerStatus.status}
          version={workerStatus.version}
          uptime={workerStatus.uptime}
          queueDepth={workerStatus.queueDepth}
        />
        <VectorDbStatus
          type={vectorDbStatus.type}
          status={vectorDbStatus.status}
          documentCount={vectorDbStatus.documentCount}
          collectionCount={vectorDbStatus.collectionCount}
        />
        <GitStatus gitInfo={gitInfo} />
        <RecentActivity items={recentActivity} />
      </div>

      <AnalyticsSection />
    </div>
  );
}
