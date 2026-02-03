import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';

interface TimelineChartProps {
  data: Array<{ date: string; count: number }>;
}

export function TimelineChart({ data }: TimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-base-content/50">
        No data available
      </div>
    );
  }

  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-base-content/10" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            className="text-base-content/60"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-base-content/60"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(label) => `Date: ${label}`}
                valueFormatter={(value) => [value, 'Memories']}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="oklch(var(--p))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'oklch(var(--p))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
