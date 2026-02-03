import React from 'react';
import { Card, CardBody, Icon } from '../../components/ui';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: { value: number; label: string };
}

export function StatsCard({ icon, label, value, subtext, trend }: StatsCardProps) {
  return (
    <Card>
      <CardBody className="flex flex-row items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon icon={icon} size={24} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-base-content/60">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          {subtext && <div className="text-xs text-base-content/50">{subtext}</div>}
        </div>
        {trend && (
          <div className={`text-sm ${trend.value >= 0 ? 'text-success' : 'text-error'}`}>
            <Icon icon={trend.value >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'} size={16} />
            <span className="ml-1">{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
