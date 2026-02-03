import React from 'react';

type ToggleSize = 'xs' | 'sm' | 'md' | 'lg';

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  toggleSize?: ToggleSize;
}

const sizeClasses: Record<ToggleSize, string> = {
  xs: 'toggle-xs',
  sm: 'toggle-sm',
  md: '',
  lg: 'toggle-lg',
};

export function Toggle({ label, toggleSize = 'md', className = '', ...props }: ToggleProps) {
  return (
    <div className="form-control">
      <label className="label cursor-pointer gap-3">
        {label && <span className="label-text">{label}</span>}
        <input
          type="checkbox"
          className={`toggle toggle-primary ${sizeClasses[toggleSize]} ${className}`}
          {...props}
        />
      </label>
    </div>
  );
}
