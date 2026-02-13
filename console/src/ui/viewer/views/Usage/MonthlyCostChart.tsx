import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltip } from '../Dashboard/charts/ChartTooltip';
import { formatStarCount } from '../../utils/formatNumber';

interface MonthlyUsageData {
  month: string;
  totalTokens: number;
  totalCost: number;
}

interface MonthlyCostChartProps {
  monthly: MonthlyUsageData[];
}

export function MonthlyCostChart({ monthly }: MonthlyCostChartProps) {
  if (!monthly || monthly.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-base-content/50">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <BarChart data={monthly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-base-content/10" />
          <XAxis
            dataKey="month"
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
                labelFormatter={(label) => `Month: ${label}`}
                valueFormatter={(value, name) => {
                  if (name === 'totalCost') return [`${Number(value).toFixed(2)}$`, 'Cost'];
                  if (name === 'totalTokens') return [formatStarCount(Number(value)), 'Tokens'];
                  return [value, name];
                }}
              />
            }
          />
          <Bar
            yAxisId="tokens"
            dataKey="totalTokens"
            fill="#8b5cf6"
            opacity={0.4}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="cost"
            dataKey="totalCost"
            fill="#6366f1"
            opacity={0.8}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
