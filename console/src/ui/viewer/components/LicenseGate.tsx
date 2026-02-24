import React, { useState, useCallback } from 'react';
import type { LicenseResponse } from '../../../services/worker/http/routes/LicenseRoutes.js';

interface LicenseGateProps {
  license: LicenseResponse | null;
  onActivated: () => void;
}

export function LicenseGate({ license, onActivated }: LicenseGateProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = key.trim();
    if (!trimmed) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      });
      const data = await res.json();

      if (data.success) {
        setKey('');
        setError(null);
        onActivated();
      } else {
        setError(data.error ?? 'Activation failed');
      }
    } catch {
      setError('Connection failed. Is the Pilot worker running?');
    } finally {
      setIsSubmitting(false);
    }
  }, [key, onActivated]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit();
    }
  }, [handleSubmit, isSubmitting]);

  const isExpired = license?.isExpired === true;
  const title = isExpired ? 'License Expired' : 'License Required';
  const subtitle = isExpired
    ? 'Your Pilot Shell license has expired. Please activate a new license to continue using the Console.'
    : 'Pilot Shell Console requires an active license or trial. Activate your license key below to get started.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body items-center text-center gap-4">
          <div className="text-5xl mb-2">
            {isExpired ? '\u{1F6AB}' : '\u{1F512}'}
          </div>

          <h1 className="card-title text-2xl">{title}</h1>
          <p className="text-base-content/60 text-sm">{subtitle}</p>

          <div className="w-full space-y-3 mt-2">
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Enter your license key"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
            />

            {error && (
              <p className="text-error text-sm text-left">{error}</p>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || !key.trim()}
            >
              {isSubmitting ? 'Activating...' : 'Activate License'}
            </button>
          </div>

          <div className="divider text-base-content/40 text-xs my-1">or</div>

          <a
            href="https://pilot-shell.com/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm w-full"
          >
            Get a License
          </a>

          <p className="text-base-content/40 text-xs mt-2">
            Visit{' '}
            <a
              href="https://pilot-shell.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              pilot-shell.com
            </a>
            {' '}to learn more about Pilot Shell.
          </p>
        </div>
      </div>
    </div>
  );
}
