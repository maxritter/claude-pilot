import { useUsage } from '../../hooks/useUsage';
import { UsageSummaryCards } from './UsageSummaryCards';
import { DailyCostChart } from './DailyCostChart';
import { MonthlyCostChart } from './MonthlyCostChart';
import { ModelRoutingInfo } from './ModelRoutingInfo';

export function UsageView() {
  const { daily, monthly, isLoading, error, available, dataExists } = useUsage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!available) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-base-content/60">Token usage and API cost tracking</p>
        </div>
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-bold">Usage tracking requires ccusage</h3>
            <div className="text-xs">Install with: <code className="bg-base-300 px-1 rounded">npm install -g ccusage@latest</code></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-base-content/60">Token usage and API cost tracking</p>
        </div>
        <div className="alert alert-error">
          <span>Failed to load usage data: {error}</span>
        </div>
      </div>
    );
  }

  if (!dataExists) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-base-content/60">Token usage and API cost tracking</p>
        </div>
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>No usage data yet. Statistics will appear here after you use Claude Code.</span>
        </div>
      </div>
    );
  }

  const recentDaily = daily.slice(-14);
  const sideBySide = monthly.length <= 2;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">Usage</h1>
        <span className="text-xs text-base-content/40">All projects</span>
      </div>

      <UsageSummaryCards daily={daily} />

      <div className={sideBySide ? 'grid grid-cols-1 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        <div className={`card bg-base-200 ${sideBySide ? 'lg:col-span-2' : ''}`}>
          <div className="card-body">
            <h2 className="card-title text-sm">Daily Cost & Tokens (Last 14 Days)</h2>
            <DailyCostChart daily={recentDaily} />
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title text-sm">Monthly Cost & Tokens</h2>
            <MonthlyCostChart monthly={monthly} />
          </div>
        </div>
      </div>

      <ModelRoutingInfo />
    </div>
  );
}
