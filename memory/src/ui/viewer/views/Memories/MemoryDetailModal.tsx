import React, { useState } from 'react';
import { Modal, Badge, Icon } from '../../components/ui';

interface Memory {
  id: number;
  type: string;
  title: string;
  content: string;
  project: string;
  timestamp: string;
  concepts?: string[];
}

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
}

const typeConfig: Record<string, { icon: string; variant: string }> = {
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

export function MemoryDetailModal({ memory, onClose }: MemoryDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'metadata'>('content');

  const config = memory ? (typeConfig[memory.type] || { icon: 'lucide:circle', variant: 'secondary' }) : { icon: 'lucide:circle', variant: 'secondary' };

  return (
    <Modal open={!!memory} onClose={onClose} title="Memory Details">
      {memory && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-lg bg-base-200 text-${config.variant}`}>
              <Icon icon={config.icon} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={config.variant as any} size="sm">{memory.type}</Badge>
                <span className="text-sm text-base-content/50">#{memory.id}</span>
              </div>
              <h3 className="text-lg font-semibold">{memory.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-base-content/60">
                <Icon icon="lucide:folder" size={14} />
                <span>{memory.project}</span>
                <span>•</span>
                <span>{memory.timestamp}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${activeTab === 'content' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              Content
            </button>
            <button
              className={`tab ${activeTab === 'metadata' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('metadata')}
            >
              Metadata
            </button>
          </div>

          {/* Content */}
          {activeTab === 'content' && (
            <div className="bg-base-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap break-words">
                {memory.content || 'No content available'}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {activeTab === 'metadata' && (
            <div className="space-y-4">
              {memory.concepts && memory.concepts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Concepts</h4>
                  <div className="flex flex-wrap gap-1">
                    {memory.concepts.map((concept: string) => (
                      <Badge key={concept} variant="ghost" size="sm">{concept}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">ID</h4>
                <code className="text-xs bg-base-200 px-2 py-1 rounded">{memory.id}</code>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
