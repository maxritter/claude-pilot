import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

interface TypesChartProps {
  data: Array<{ type: string; count: number; color: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  bugfix: 'Bug Fix',
  feature: 'Feature',
  discovery: 'Discovery',
  refactor: 'Refactor',
  decision: 'Decision',
  change: 'Change',
};

export function TypesChart({ data }: TypesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-base-content/50">
        No data available
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    name: TYPE_LABELS[item.type] || item.type,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="count"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(value) => [value, 'Count']}
              />
            }
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: '0.75rem' }}
            formatter={(value) => <span className="text-base-content/70">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
