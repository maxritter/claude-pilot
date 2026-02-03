import React from 'react';
import { Icon as IconifyIcon } from '@iconify/react';

interface IconProps {
  icon: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ icon, size = 20, className = '', style }: IconProps) {
  return <IconifyIcon icon={icon} width={size} height={size} className={className} style={style} />;
}
