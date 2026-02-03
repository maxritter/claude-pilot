import React from 'react';

type SelectSize = 'xs' | 'sm' | 'md' | 'lg';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  selectSize?: SelectSize;
  error?: string;
}

const sizeClasses: Record<SelectSize, string> = {
  xs: 'select-xs',
  sm: 'select-sm',
  md: '',
  lg: 'select-lg',
};

export function Select({ label, options, selectSize = 'md', error, className = '', ...props }: SelectProps) {
  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <select
        className={`select select-bordered w-full ${sizeClasses[selectSize]} ${error ? 'select-error' : ''} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
