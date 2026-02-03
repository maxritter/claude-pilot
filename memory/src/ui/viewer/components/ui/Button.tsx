import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'error';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  error: 'btn-error',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="loading loading-spinner loading-sm" />}
      {children}
    </button>
  );
}
