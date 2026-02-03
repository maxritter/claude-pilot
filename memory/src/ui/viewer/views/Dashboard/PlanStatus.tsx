import React from 'react';
import { Card, CardBody, CardTitle, Badge, Icon } from '../../components/ui';

interface PlanInfo {
  name: string;
  status: 'PENDING' | 'COMPLETE' | 'VERIFIED';
  completed: number;
  total: number;
  phase: 'plan' | 'implement' | 'verify';
  iterations: number;
  approved: boolean;
}

interface PlanStatusProps {
  active: boolean;
  plan: PlanInfo | null;
}

const phaseConfig = {
  plan: { label: 'Planning', color: 'info', icon: 'lucide:file-text' },
  implement: { label: 'Implementing', color: 'warning', icon: 'lucide:code' },
  verify: { label: 'Verifying', color: 'accent', icon: 'lucide:check-circle' },
} as const;

export function PlanStatus({ active, plan }: PlanStatusProps) {
  if (!active || !plan) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Spec Status</CardTitle>
            <Badge variant="ghost">Quick Mode</Badge>
          </div>
          <div className="text-sm text-base-content/60">
            <p>No active spec-driven plan.</p>
            <p className="mt-2">Use <code className="text-primary">/spec</code> for complex tasks.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const config = phaseConfig[plan.phase];
  const progressPct = plan.total > 0 ? (plan.completed / plan.total) * 100 : 0;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Spec Status</CardTitle>
          <Badge variant={config.color as 'info' | 'warning' | 'accent'}>
            {config.label}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="lucide:file-text" size={16} className="text-base-content/50" />
            <span className="text-base-content/70">Plan:</span>
            <span className="font-medium truncate" title={plan.name}>{plan.name}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Icon icon={config.icon} size={16} className="text-base-content/50" />
            <span className="text-base-content/70">Phase:</span>
            <span className={`font-medium text-${config.color}`}>{config.label}</span>
            {!plan.approved && plan.phase === 'plan' && (
              <Badge variant="warning" size="xs">Awaiting Approval</Badge>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/70">Progress:</span>
              <span className="font-mono">{plan.completed}/{plan.total} tasks</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  progressPct === 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {plan.iterations > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="lucide:repeat" size={16} className="text-base-content/50" />
              <span className="text-base-content/70">Iterations:</span>
              <span>{plan.iterations}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
