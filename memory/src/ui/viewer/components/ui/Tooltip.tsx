import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionClasses = {
  top: 'tooltip-top',
  bottom: 'tooltip-bottom',
  left: 'tooltip-left',
  right: 'tooltip-right',
};

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  return (
    <div className={`tooltip ${positionClasses[position]}`} data-tip={text}>
      {children}
    </div>
  );
}
