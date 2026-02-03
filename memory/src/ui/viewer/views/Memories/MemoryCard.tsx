import React from 'react';
import { Card, CardBody, Badge, Icon, Dropdown, Button } from '../../components/ui';

interface Memory {
  id: number;
  type: string;
  title: string;
  content: string;
  project: string;
  timestamp: string;
  concepts?: string[];
}

interface MemoryCardProps {
  memory: Memory;
  viewMode: 'grid' | 'list';
  onDelete?: (id: number) => void;
  onView?: (id: number) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: number) => void;
}

const typeConfig: Record<string, { icon: string; variant: string; color: string }> = {
  observation: { icon: 'lucide:brain', variant: 'info', color: 'text-info' },
  summary: { icon: 'lucide:file-text', variant: 'warning', color: 'text-warning' },
  prompt: { icon: 'lucide:message-square', variant: 'secondary', color: 'text-secondary' },
  bugfix: { icon: 'lucide:bug', variant: 'error', color: 'text-error' },
  feature: { icon: 'lucide:sparkles', variant: 'success', color: 'text-success' },
  refactor: { icon: 'lucide:refresh-cw', variant: 'accent', color: 'text-accent' },
  discovery: { icon: 'lucide:search', variant: 'info', color: 'text-info' },
  decision: { icon: 'lucide:git-branch', variant: 'warning', color: 'text-warning' },
  change: { icon: 'lucide:pencil', variant: 'secondary', color: 'text-secondary' },
};

const defaultConfig = { icon: 'lucide:circle', variant: 'secondary', color: 'text-secondary' };

export function MemoryCard({
  memory,
  viewMode,
  onDelete,
  onView,
  selectionMode,
  isSelected,
  onToggleSelection,
}: MemoryCardProps) {
  const config = typeConfig[memory.type] || defaultConfig;
  const isGrid = viewMode === 'grid';

  const dropdownItems = [
    { label: 'View Details', onClick: () => onView?.(memory.id), icon: <Icon icon="lucide:eye" size={16} /> },
    { label: 'Copy ID', onClick: () => navigator.clipboard.writeText(String(memory.id)), icon: <Icon icon="lucide:copy" size={16} /> },
    { label: 'Delete', onClick: () => onDelete?.(memory.id), icon: <Icon icon="lucide:trash-2" size={16} /> },
  ];

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelection?.(memory.id);
    }
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${isGrid ? '' : 'flex flex-row'} ${
        selectionMode ? 'cursor-pointer' : ''
      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={handleCardClick}
    >
      <CardBody className={isGrid ? '' : 'flex flex-row items-start gap-4 flex-1'}>
        <div className={`flex items-start gap-3 ${isGrid ? 'mb-3' : 'flex-1'}`}>
          {selectionMode ? (
            <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={isSelected}
                onChange={() => onToggleSelection?.(memory.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <div className={`p-2 rounded-lg bg-base-200 ${config.color}`}>
              <Icon icon={config.icon} size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.variant as any} size="xs">{memory.type}</Badge>
              <span className="text-xs text-base-content/50">#{memory.id}</span>
            </div>
            <h3 className="font-medium text-sm line-clamp-2">{memory.title}</h3>
            {isGrid && (
              <p className="text-xs text-base-content/60 mt-1 line-clamp-3">{memory.content}</p>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-2 ${isGrid ? 'justify-between mt-3 pt-3 border-t border-base-200' : ''}`}>
          <div className="flex items-center gap-2 text-xs text-base-content/50">
            <Icon icon="lucide:folder" size={14} />
            <span className="truncate max-w-24">{memory.project}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/50">{memory.timestamp}</span>
            <Dropdown
              trigger={
                <Button variant="ghost" size="xs" className="btn-square">
                  <Icon icon="lucide:more-vertical" size={14} />
                </Button>
              }
              items={dropdownItems}
            />
          </div>
        </div>

        {isGrid && memory.concepts && memory.concepts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {memory.concepts.slice(0, 3).map((concept) => (
              <Badge key={concept} variant="ghost" size="xs">{concept}</Badge>
            ))}
            {memory.concepts.length > 3 && (
              <Badge variant="ghost" size="xs">+{memory.concepts.length - 3}</Badge>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
