import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'info' | 'success' | 'warning' | 'error';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  outline?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  ghost: 'badge-ghost',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'badge-xs',
  sm: 'badge-sm',
  md: '',
  lg: 'badge-lg',
};

export function Badge({ children, variant = 'ghost', size = 'md', outline = false, className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variantClasses[variant]} ${sizeClasses[size]} ${outline ? 'badge-outline' : ''} ${className}`}>
      {children}
    </span>
  );
}
