import { formatStarCount } from '../../utils/formatNumber';

interface DailyUsageData {
  date: string;
  totalTokens: number;
  totalCost: number;
}

interface UsageSummaryCardsProps {
  daily: DailyUsageData[];
}

export function UsageSummaryCards({ daily }: UsageSummaryCardsProps) {
  const latest = daily.length > 0 ? daily[daily.length - 1] : null;
  const dailyCost = latest?.totalCost || 0;
  const dailyTokens = latest?.totalTokens || 0;
  const activeDays = daily.filter((d) => d.totalCost > 0 || d.totalTokens > 0);
  const totalCost = activeDays.reduce((sum, d) => sum + (d.totalCost || 0), 0);
  const totalTokens = activeDays.reduce((sum, d) => sum + (d.totalTokens || 0), 0);
  const activeDayCount = activeDays.length || 1;
  const avgDailyCost = totalCost / activeDayCount;
  const avgDailyTokens = Math.round(totalTokens / activeDayCount);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="stats shadow bg-base-200">
        <div className="stat">
          <div className="stat-title">Daily Cost</div>
          <div className="stat-value text-primary">{dailyCost.toFixed(2)}$</div>
          <div className="stat-desc">Today</div>
        </div>
      </div>

      <div className="stats shadow bg-base-200">
        <div className="stat">
          <div className="stat-title">Avg Daily Cost</div>
          <div className="stat-value">⌀ {avgDailyCost.toFixed(2)}$</div>
          <div className="stat-desc">Last {activeDayCount} working days</div>
        </div>
      </div>

      <div className="stats shadow bg-base-200">
        <div className="stat">
          <div className="stat-title">Daily Tokens</div>
          <div className="stat-value text-primary">{formatStarCount(dailyTokens)}</div>
          <div className="stat-desc">Today</div>
        </div>
      </div>

      <div className="stats shadow bg-base-200">
        <div className="stat">
          <div className="stat-title">Avg Daily Tokens</div>
          <div className="stat-value">⌀ {formatStarCount(avgDailyTokens)}</div>
          <div className="stat-desc">Last {activeDayCount} working days</div>
        </div>
      </div>
    </div>
  );
}
