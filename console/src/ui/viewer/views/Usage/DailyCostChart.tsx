import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltip } from '../Dashboard/charts/ChartTooltip';
import { formatStarCount } from '../../utils/formatNumber';

interface DailyUsageData {
  date: string;
  totalCost: number;
  totalTokens: number;
}

interface DailyCostChartProps {
  daily: DailyUsageData[];
}

export function DailyCostChart({ daily }: DailyCostChartProps) {
  if (!daily || daily.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-base-content/50">
        No data available
      </div>
    );
  }

  const formattedData = daily.map((item) => ({
    ...item,
    displayDate: item.date.includes('-')
      ? `${item.date.slice(5, 7)}/${item.date.slice(8, 10)}`
      : `${item.date.slice(4, 6)}/${item.date.slice(6, 8)}`,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <AreaChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="dailyCostGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dailyTokenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-base-content/10" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            className="text-base-content/60"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="cost"
            tick={{ fontSize: 12 }}
            className="text-base-content/60"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value.toFixed(0)}$`}
          />
          <YAxis
            yAxisId="tokens"
            orientation="right"
            tick={{ fontSize: 12 }}
            className="text-base-content/60"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatStarCount(value)}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(label) => `Date: ${label}`}
                valueFormatter={(value, name) => {
                  if (name === 'totalCost') return [`${Number(value).toFixed(2)}$`, 'Cost'];
                  if (name === 'totalTokens') return [formatStarCount(Number(value)), 'Tokens'];
                  return [value, name];
                }}
              />
            }
          />
          <Area
            yAxisId="tokens"
            type="monotone"
            dataKey="totalTokens"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            fill="url(#dailyTokenGradient)"
          />
          <Area
            yAxisId="cost"
            type="monotone"
            dataKey="totalCost"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#dailyCostGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
