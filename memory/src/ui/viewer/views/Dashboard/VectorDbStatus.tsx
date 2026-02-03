import React from 'react';
import { Card, CardBody, CardTitle, Badge, Icon } from '../../components/ui';

interface VectorDbStatusProps {
  type: 'qdrant' | 'chroma' | 'none';
  status: 'connected' | 'disconnected' | 'error';
  documentCount?: number;
  collectionCount?: number;
}

export function VectorDbStatus({ type, status, documentCount = 0, collectionCount = 0 }: VectorDbStatusProps) {
  const statusConfig = {
    connected: { variant: 'success' as const, label: 'Connected' },
    disconnected: { variant: 'warning' as const, label: 'Disconnected' },
    error: { variant: 'error' as const, label: 'Error' },
  };

  const typeLabels = {
    qdrant: 'Qdrant',
    chroma: 'ChromaDB',
    none: 'None',
  };

  const config = statusConfig[status];

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Vector Database</CardTitle>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="lucide:database" size={16} className="text-base-content/50" />
            <span className="text-base-content/70">Type:</span>
            <span className="font-semibold">{typeLabels[type]}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="lucide:folder" size={16} className="text-base-content/50" />
            <span className="text-base-content/70">Collections:</span>
            <span>{collectionCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="lucide:file" size={16} className="text-base-content/50" />
            <span className="text-base-content/70">Documents:</span>
            <span>{documentCount.toLocaleString()}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
