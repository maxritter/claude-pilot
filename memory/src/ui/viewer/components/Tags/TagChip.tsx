import React from 'react';
import { Icon } from '../ui';

interface TagChipProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function TagChip({
  name,
  color = '#6b7280',
  onRemove,
  onClick,
  size = 'sm',
  className = ''
}: TagChipProps) {
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5 gap-1',
    sm: 'text-sm px-2 py-1 gap-1.5',
    md: 'text-base px-3 py-1.5 gap-2'
  };

  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 14
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-colors ${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`
      }}
      onClick={onClick}
    >
      <Icon icon="lucide:tag" size={iconSizes[size]} />
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-60 transition-opacity"
        >
          <Icon icon="lucide:x" size={iconSizes[size]} />
        </button>
      )}
    </span>
  );
}
