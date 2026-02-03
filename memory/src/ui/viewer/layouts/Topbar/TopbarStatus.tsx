import React from 'react';
import { Icon, Spinner } from '../../components/ui';

interface TopbarStatusProps {
  isProcessing: boolean;
  lastProcessed?: string;
}

export function TopbarStatus({ isProcessing, lastProcessed }: TopbarStatusProps) {
  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/70">
        <Spinner size="xs" />
        <span>Processing...</span>
      </div>
    );
  }

  if (lastProcessed) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/50">
        <Icon icon="lucide:check-circle" size={16} className="text-success" />
        <span>Last: {lastProcessed}</span>
      </div>
    );
  }

  return null;
}
