import React from 'react';
import { StatsCard } from './StatsCard';

interface Stats {
  observations: number;
  summaries: number;
  prompts: number;
  projects: number;
}

interface StatsGridProps {
  stats: Stats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        icon="lucide:brain"
        label="Observations"
        value={stats.observations.toLocaleString()}
      />
      <StatsCard
        icon="lucide:file-text"
        label="Summaries"
        value={stats.summaries.toLocaleString()}
      />
      <StatsCard
        icon="lucide:message-square"
        label="Prompts"
        value={stats.prompts.toLocaleString()}
      />
      <StatsCard
        icon="lucide:folder"
        label="Projects"
        value={stats.projects.toLocaleString()}
      />
    </div>
  );
}
