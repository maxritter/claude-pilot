import React from 'react';
import { Card, CardBody, CardTitle, Badge, Icon, EmptyState } from '../../components/ui';

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  project: string;
  timestamp: string;
}

interface RecentActivityProps {
  items: ActivityItem[];
}

const typeConfig: Record<string, { icon: string; variant: 'info' | 'warning' | 'secondary' | 'success' | 'error' | 'accent' }> = {
  observation: { icon: 'lucide:brain', variant: 'info' },
  summary: { icon: 'lucide:file-text', variant: 'warning' },
  prompt: { icon: 'lucide:message-square', variant: 'secondary' },
  bugfix: { icon: 'lucide:bug', variant: 'error' },
  feature: { icon: 'lucide:sparkles', variant: 'success' },
  refactor: { icon: 'lucide:refresh-cw', variant: 'accent' },
  discovery: { icon: 'lucide:search', variant: 'info' },
  decision: { icon: 'lucide:git-branch', variant: 'warning' },
  change: { icon: 'lucide:pencil', variant: 'secondary' },
};

const defaultConfig = { icon: 'lucide:circle', variant: 'secondary' as const };

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="col-span-2">
      <CardBody>
        <CardTitle>Recent Activity</CardTitle>
        {items.length === 0 ? (
          <EmptyState
            icon="lucide:activity"
            title="No recent activity"
            description="New observations will appear here"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => {
              const config = typeConfig[item.type] || defaultConfig;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors cursor-pointer"
                >
                  <Icon icon={config.icon} size={18} className="text-base-content/50" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-xs text-base-content/50">{item.project}</div>
                  </div>
                  <Badge variant={config.variant} size="sm">
                    {item.type}
                  </Badge>
                  <span className="text-xs text-base-content/50">{item.timestamp}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
