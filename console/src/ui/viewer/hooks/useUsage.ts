import { useState, useEffect, useCallback } from 'react';

interface DailyUsageData {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
}

interface MonthlyUsageData {
  month: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  modelBreakdowns?: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  }>;
}

interface ModelUsageData {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
}

interface UsageAPIResponse {
  available: boolean;
  dataExists?: boolean;
  daily?: DailyUsageData[];
  monthly?: MonthlyUsageData[];
  models?: ModelUsageData[];
  error?: string;
}

interface UseUsageResult {
  daily: DailyUsageData[];
  monthly: MonthlyUsageData[];
  models: ModelUsageData[];
  isLoading: boolean;
  error: string | null;
  available: boolean;
  dataExists: boolean;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useUsage(): UseUsageResult {
  const [daily, setDaily] = useState<DailyUsageData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyUsageData[]>([]);
  const [models, setModels] = useState<ModelUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [dataExists, setDataExists] = useState(true);

  const fetchUsageData = useCallback(async () => {
    try {
      const [dailyRes, monthlyRes, modelsRes] = await Promise.all([
        fetch('/api/usage/daily'),
        fetch('/api/usage/monthly'),
        fetch('/api/usage/models'),
      ]);

      const [dailyData, monthlyData, modelsData]: UsageAPIResponse[] = await Promise.all([
        dailyRes.json(),
        monthlyRes.json(),
        modelsRes.json(),
      ]);

      if (dailyData.available === false) {
        setAvailable(false);
        setDataExists(false);
        setDaily([]);
        setMonthly([]);
        setModels([]);
        setError(null);
        return;
      }

      setAvailable(true);

      const hasData = (dailyData.daily?.length ?? 0) > 0 ||
                      (monthlyData.monthly?.length ?? 0) > 0;
      setDataExists(hasData);

      setDaily(dailyData.daily || []);
      setMonthly(monthlyData.monthly || []);
      setModels(modelsData.models || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
      setAvailable(true);
      setDataExists(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageData();

    const interval = setInterval(fetchUsageData, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [fetchUsageData]);

  return {
    daily,
    monthly,
    models,
    isLoading,
    error,
    available,
    dataExists,
  };
}
