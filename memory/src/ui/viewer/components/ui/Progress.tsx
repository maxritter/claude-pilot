import React from 'react';

type ProgressVariant = 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

interface ProgressProps {
  value?: number;
  max?: number;
  variant?: ProgressVariant;
  className?: string;
}

const variantClasses: Record<ProgressVariant, string> = {
  primary: 'progress-primary',
  secondary: 'progress-secondary',
  accent: 'progress-accent',
  info: 'progress-info',
  success: 'progress-success',
  warning: 'progress-warning',
  error: 'progress-error',
};

export function Progress({ value, max = 100, variant = 'primary', className = '' }: ProgressProps) {
  return (
    <progress
      className={`progress ${variantClasses[variant]} ${className}`}
      value={value}
      max={max}
    />
  );
}
