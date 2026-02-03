import React from 'react';
import { Icon, Badge, Tooltip } from '../../components/ui';

interface SidebarFooterProps {
  workerStatus: 'online' | 'offline' | 'processing';
  queueDepth?: number;
  collapsed?: boolean;
}

export function SidebarFooter({ workerStatus, queueDepth = 0, collapsed = false }: SidebarFooterProps) {
  // Simplified: only show online/offline in sidebar, processing details on dashboard
  const isOnline = workerStatus !== 'offline';
  const statusConfig = {
    online: { color: 'success', label: 'Online', icon: 'lucide:circle-check' },
    offline: { color: 'error', label: 'Offline', icon: 'lucide:circle-x' },
  } as const;

  const config = statusConfig[isOnline ? 'online' : 'offline'];

  if (collapsed) {
    return (
      <div className="p-3 border-t border-base-300/50">
        <Tooltip text={`Worker: ${config.label}`}>
          <div className="flex justify-center">
            <Icon
              icon={config.icon}
              size={20}
              className={`text-${config.color}`}
            />
          </div>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-base-300/50">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon
            icon={config.icon}
            size={16}
            className={`text-${config.color}`}
          />
          <span className="text-base-content/70">Worker</span>
        </div>
        <Badge variant={config.color as any} size="sm">
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
