import React from 'react';
import { Card, CardBody, Badge, Icon } from '../../components/ui';

interface Session {
  id: number;
  content_session_id: string;
  memory_session_id: string;
  project: string;
  user_prompt: string;
  started_at: string;
  started_at_epoch: number;
  completed_at: string | null;
  completed_at_epoch: number | null;
  status: string;
  observation_count: number;
  prompt_count: number;
}

interface SessionCardProps {
  session: Session;
  isExpanded: boolean;
  onToggle: () => void;
}

const statusConfig: Record<string, { variant: string; icon: string }> = {
  active: { variant: 'warning', icon: 'lucide:play' },
  completed: { variant: 'success', icon: 'lucide:check' },
  failed: { variant: 'error', icon: 'lucide:x' },
};

function formatDate(timestamp: string | number): string {
  const date = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startEpoch: number, endEpoch: number | null): string {
  if (!endEpoch) return 'ongoing';
  const durationMs = endEpoch - startEpoch;
  const minutes = Math.floor(durationMs / 60000);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

export function SessionCard({ session, isExpanded, onToggle }: SessionCardProps) {
  const config = statusConfig[session.status] || statusConfig.active;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${isExpanded ? 'ring-2 ring-primary' : ''}`}
      onClick={onToggle}
    >
      <CardBody>
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div className={`p-2 rounded-lg bg-base-200`}>
            <Icon icon={config.icon} size={20} className={`text-${config.variant}`} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.variant as any} size="sm">{session.status}</Badge>
              <span className="text-xs text-base-content/50">#{session.id}</span>
            </div>
            <h3 className="font-medium line-clamp-1">
              {session.user_prompt || session.project || 'Untitled Session'}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-base-content/60">
              <span className="flex items-center gap-1">
                <Icon icon="lucide:folder" size={14} />
                {session.project}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="lucide:calendar" size={14} />
                {formatDate(session.started_at)}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="lucide:clock" size={14} />
                {formatDuration(session.started_at_epoch, session.completed_at_epoch)}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{session.observation_count}</div>
              <div className="text-xs text-base-content/50">observations</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{session.prompt_count}</div>
              <div className="text-xs text-base-content/50">prompts</div>
            </div>
            <Icon
              icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
              size={20}
              className="text-base-content/50"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
