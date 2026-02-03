import React from 'react';

type InputSize = 'xs' | 'sm' | 'md' | 'lg';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  inputSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  xs: 'input-xs',
  sm: 'input-sm',
  md: '',
  lg: 'input-lg',
};

export function Input({ label, error, inputSize = 'md', className = '', ...props }: InputProps) {
  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <input
        className={`input input-bordered w-full ${sizeClasses[inputSize]} ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
