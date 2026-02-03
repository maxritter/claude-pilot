import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, CardTitle, Icon } from '../../components/ui';
import { TimelineChart } from './charts/TimelineChart';
import { TypesChart } from './charts/TypesChart';
import { ProjectsChart } from './charts/ProjectsChart';
import { TokensChart } from './charts/TokensChart';

type TimeRange = '7d' | '30d' | '90d' | 'all';

interface AnalyticsData {
  timeline: Array<{ date: string; count: number }>;
  types: Array<{ type: string; count: number; color: string }>;
  projects: Array<{ project: string; count: number; tokens: number }>;
  tokens: {
    totals: { totalTokens: number; avgTokensPerObservation: number; totalObservations: number };
    daily: Array<{ date: string; tokens: number; observations: number }>;
    byType: Array<{ type: string; tokens: number; count: number }>;
  };
}

export function AnalyticsSection() {
  const [range, setRange] = useState<TimeRange>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [timeline, types, projects, tokens] = await Promise.all([
        fetch(`/api/analytics/timeline?range=${range}`).then(r => r.json()),
        fetch(`/api/analytics/types?range=${range}`).then(r => r.json()),
        fetch(`/api/analytics/projects?range=${range}&limit=10`).then(r => r.json()),
        fetch(`/api/analytics/tokens?range=${range}`).then(r => r.json()),
      ]);

      setData({
        timeline: timeline?.data ?? [],
        types: types?.data ?? [],
        projects: projects?.data ?? [],
        tokens: {
          totals: tokens?.totals ?? { totalTokens: 0, avgTokensPerObservation: 0, totalObservations: 0 },
          daily: tokens?.daily ?? [],
          byType: tokens?.byType ?? [],
        },
      });
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Analytics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const rangeLabels: Record<TimeRange, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    'all': 'All time',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-base-content/60">Insights from your memory data</p>
        </div>
        <div className="join">
          {(Object.keys(rangeLabels) as TimeRange[]).map((r) => (
            <button
              key={r}
              className={`btn btn-sm join-item ${range === r ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setRange(r)}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-error">
              <Icon icon="lucide:alert-circle" size={20} />
              <span>{error}</span>
            </div>
          </CardBody>
        </Card>
      ) : data ? (
        <>
          {/* Timeline Chart - Full Width */}
          <Card>
            <CardBody>
              <CardTitle className="mb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:trending-up" size={20} />
                  <span>Memories Over Time</span>
                </div>
              </CardTitle>
              <TimelineChart data={data.timeline} />
            </CardBody>
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Types Pie Chart */}
            <Card>
              <CardBody>
                <CardTitle className="mb-4">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:pie-chart" size={20} />
                    <span>By Type</span>
                  </div>
                </CardTitle>
                <TypesChart data={data.types} />
              </CardBody>
            </Card>

            {/* Projects Bar Chart */}
            <Card>
              <CardBody>
                <CardTitle className="mb-4">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:bar-chart-3" size={20} />
                    <span>Top Projects</span>
                  </div>
                </CardTitle>
                <ProjectsChart data={data.projects} />
              </CardBody>
            </Card>

            {/* Token Stats */}
            <Card>
              <CardBody>
                <CardTitle className="mb-4">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:hash" size={20} />
                    <span>Token Usage</span>
                  </div>
                </CardTitle>
                <TokensChart data={data.tokens} />
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
