import React from 'react';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'loading-xs',
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return <span className={`loading loading-spinner ${sizeClasses[size]} ${className}`} />;
}
