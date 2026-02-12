import React, { useState, useCallback } from 'react';
import { Modal } from './ui';

interface ActivationModalProps {
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
}

export function ActivationModal({ open, onClose, onActivated }: ActivationModalProps) {
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
        onActivated();
        onClose();
      } else {
        setError(data.error ?? 'Activation failed');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [key, onActivated, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit();
    }
  }, [handleSubmit, isSubmitting]);

  return (
    <Modal open={open} onClose={onClose} title="Activate License">
      <div className="flex flex-col gap-3">
        <input
          id="license-key-input"
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
          <p className="text-error text-sm">{error}</p>
        )}
        <p className="text-xs text-base-content/50">
          Don't have a key?{' '}
          <a
            href="https://claude-pilot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            claude-pilot.com
          </a>
        </p>
      </div>
      <div className="modal-action">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !key.trim()}
        >
          {isSubmitting ? 'Activating...' : 'Activate'}
        </button>
      </div>
    </Modal>
  );
}
