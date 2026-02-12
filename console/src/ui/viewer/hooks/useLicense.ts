import { useState, useEffect, useCallback } from 'react';
import type { LicenseResponse } from '../../../services/worker/http/routes/LicenseRoutes.js';

interface UseLicenseResult {
  license: LicenseResponse | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useLicense(): UseLicenseResult {
  const [license, setLicense] = useState<LicenseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLicense = useCallback(() => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data: LicenseResponse) => {
        setLicense(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  return { license, isLoading, refetch: fetchLicense };
}
