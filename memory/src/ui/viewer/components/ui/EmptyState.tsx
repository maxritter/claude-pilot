import React from 'react';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'lucide:inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon icon={icon} size={48} className="text-base-content/30 mb-4" />
      <h3 className="font-semibold text-lg text-base-content/70">{title}</h3>
      {description && <p className="text-base-content/50 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
