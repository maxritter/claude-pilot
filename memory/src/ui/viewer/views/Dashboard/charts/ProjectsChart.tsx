import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProjectTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { project: string; count: number; tokens: number } }>;
}

function ProjectTooltip({ active, payload }: ProjectTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-base-200 border border-base-300 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-base-content font-medium">{data.project}</p>
      <p className="text-base-content/80">{data.count} memories</p>
      <p className="text-base-content/60 text-xs">{data.tokens.toLocaleString()} tokens</p>
    </div>
  );
}

interface ProjectsChartProps {
  data: Array<{ project: string; count: number; tokens: number }>;
}

// Vibrant color palette for project bars
const BAR_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#22c55e', // green
];

export function ProjectsChart({ data }: ProjectsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-base-content/50">
        No data available
      </div>
    );
  }

  // Truncate long project names
  const chartData = data.slice(0, 5).map((item) => ({
    ...item,
    shortName: item.project.length > 12 ? item.project.slice(0, 12) + '...' : item.project,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            className="text-base-content/60"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            tick={{ fontSize: 11 }}
            className="text-base-content/60"
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<ProjectTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
