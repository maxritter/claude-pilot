import React from 'react';

interface TokensChartProps {
  data: {
    totals: {
      totalTokens: number;
      avgTokensPerObservation: number;
      totalObservations: number;
    };
    daily: Array<{ date: string; tokens: number; observations: number }>;
    byType: Array<{ type: string; tokens: number; count: number }>;
  };
}

const TYPE_LABELS: Record<string, string> = {
  bugfix: 'Bug Fix',
  feature: 'Feature',
  discovery: 'Discovery',
  refactor: 'Refactor',
  decision: 'Decision',
  change: 'Change',
};

const TYPE_COLORS: Record<string, string> = {
  bugfix: 'bg-error',
  feature: 'bg-secondary',
  discovery: 'bg-info',
  refactor: 'bg-warning',
  decision: 'bg-success',
  change: 'bg-base-content/50',
};

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function TokensChart({ data }: TokensChartProps) {
  const totals = data?.totals ?? { totalTokens: 0, avgTokensPerObservation: 0, totalObservations: 0 };
  const byType = data?.byType ?? [];

  if (!data || totals.totalObservations === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-base-content/50">
        No data available
      </div>
    );
  }

  // Calculate total for percentages
  const totalByType = byType.reduce((sum, t) => sum + t.tokens, 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-base-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-primary">
            {formatTokens(totals.totalTokens)}
          </div>
          <div className="text-xs text-base-content/60">Total Tokens</div>
        </div>
        <div className="bg-base-200 rounded-lg p-3">
          <div className="text-2xl font-bold">
            {formatTokens(totals.avgTokensPerObservation)}
          </div>
          <div className="text-xs text-base-content/60">Avg per Memory</div>
        </div>
      </div>

      {/* Tokens by Type */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-base-content/60 uppercase tracking-wider">
          By Type
        </div>
        {byType.slice(0, 4).map((item) => {
          const percent = totalByType > 0 ? (item.tokens / totalByType) * 100 : 0;
          return (
            <div key={item.type} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-base-content/70">
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                <span className="font-mono">{formatTokens(item.tokens)}</span>
              </div>
              <div className="w-full bg-base-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${TYPE_COLORS[item.type] || 'bg-primary'}`}
                  style={{ width: `${Math.max(percent, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
