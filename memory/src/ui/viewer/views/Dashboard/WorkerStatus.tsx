import React from 'react';
import { Card, CardBody, CardTitle, Badge, Icon } from '../../components/ui';

interface WorkerStatusProps {
  status: 'online' | 'offline' | 'processing';
  version?: string;
  uptime?: string;
  queueDepth?: number;
}

export function WorkerStatus({ status, version, uptime, queueDepth = 0 }: WorkerStatusProps) {
  const isProcessing = status === 'processing';
  const isOnline = status !== 'offline';

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Worker Status</CardTitle>
          <Badge variant={isOnline ? 'success' : 'error'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <div className="space-y-3">
          {version && (
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="lucide:tag" size={16} className="text-base-content/50" />
              <span className="text-base-content/70">Version:</span>
              <span className="font-mono">{version}</span>
            </div>
          )}
          {uptime && (
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="lucide:clock" size={16} className="text-base-content/50" />
              <span className="text-base-content/70">Uptime:</span>
              <span>{uptime}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Icon
              icon={isProcessing ? 'lucide:loader-2' : 'lucide:layers'}
              size={16}
              className={`${isProcessing ? 'text-warning animate-spin' : 'text-base-content/50'}`}
            />
            <span className="text-base-content/70">Queue:</span>
            <span className={isProcessing ? 'text-warning font-medium' : ''}>
              {queueDepth} items
            </span>
            {isProcessing && (
              <Badge variant="warning" size="xs">Processing</Badge>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
