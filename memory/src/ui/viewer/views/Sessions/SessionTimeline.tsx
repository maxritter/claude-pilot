import React, { useState, useEffect } from 'react';
import { Card, CardBody, Badge, Icon, Spinner } from '../../components/ui';

interface TimelineItem {
  type: 'prompt' | 'observation';
  id: number;
  timestamp: number;
  data: any;
}

interface SessionSummary {
  request: string | null;
  investigated: string | null;
  learned: string | null;
  completed: string | null;
  next_steps: string | null;
  created_at: string;
}

interface SessionInfo {
  id: number;
  project: string;
  user_prompt: string;
  started_at: string;
  completed_at: string | null;
  status: string;
}

interface TimelineData {
  session: SessionInfo;
  timeline: TimelineItem[];
  summary: SessionSummary | null;
  stats: {
    observations: number;
    prompts: number;
  };
}

interface SessionTimelineProps {
  sessionId: number;
}

const typeConfig: Record<string, { icon: string; color: string }> = {
  prompt: { icon: 'lucide:message-square', color: 'text-primary' },
  observation: { icon: 'lucide:brain', color: 'text-info' },
  bugfix: { icon: 'lucide:bug', color: 'text-error' },
  feature: { icon: 'lucide:sparkles', color: 'text-success' },
  refactor: { icon: 'lucide:refresh-cw', color: 'text-accent' },
  discovery: { icon: 'lucide:search', color: 'text-info' },
  decision: { icon: 'lucide:git-branch', color: 'text-warning' },
  change: { icon: 'lucide:pencil', color: 'text-secondary' },
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionTimeline({ sessionId }: SessionTimelineProps) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchTimeline() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/sessions/${sessionId}/timeline`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeline();
  }, [sessionId]);

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-base-content/50">
        Failed to load timeline
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'badge-success',
    completed: 'badge-info',
    failed: 'badge-error',
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Session Header */}
      <Card className="bg-base-200/50">
        <CardBody className="py-3">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Badge variant="ghost" size="sm" className={statusColors[data.session.status] || ''}>
              {data.session.status}
            </Badge>
            <span className="text-sm text-base-content/60">
              {new Date(data.session.started_at).toLocaleString()}
            </span>
            {data.session.completed_at && (
              <span className="text-sm text-base-content/60">
                → {new Date(data.session.completed_at).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Icon icon="lucide:message-square" size={14} className="text-primary" />
              <span className="font-medium">{data.stats.prompts}</span>
              <span className="text-base-content/60">prompts</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon icon="lucide:brain" size={14} className="text-info" />
              <span className="font-medium">{data.stats.observations}</span>
              <span className="text-base-content/60">observations</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Summary if exists */}
      {data.summary && (
        <Card className="bg-warning/10 border-warning/30">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="lucide:file-text" size={16} className="text-warning" />
              <span className="font-medium text-sm">Session Summary</span>
              <span className="text-xs text-base-content/50">
                {new Date(data.summary.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {data.summary.request && (
                <div>
                  <div className="font-medium text-warning mb-1">Request</div>
                  <div className="text-base-content/80">{data.summary.request}</div>
                </div>
              )}
              {data.summary.investigated && (
                <div>
                  <div className="font-medium text-info mb-1">Investigated</div>
                  <div className="text-base-content/80">{data.summary.investigated}</div>
                </div>
              )}
              {data.summary.learned && (
                <div>
                  <div className="font-medium text-success mb-1">Learned</div>
                  <div className="text-base-content/80">{data.summary.learned}</div>
                </div>
              )}
              {data.summary.completed && (
                <div>
                  <div className="font-medium text-primary mb-1">Completed</div>
                  <div className="text-base-content/80">{data.summary.completed}</div>
                </div>
              )}
              {data.summary.next_steps && (
                <div>
                  <div className="font-medium text-accent mb-1">Next Steps</div>
                  <div className="text-base-content/80">{data.summary.next_steps}</div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Timeline */}
      <div className="ml-8 border-l-2 border-base-300 pl-6 space-y-4">

        {/* Timeline items - reversed (newest first) */}
        {[...data.timeline].reverse().map((item, index) => {
          const key = `${item.type}-${item.id}`;
          const isExpanded = expandedItems.has(key);
          const config = item.type === 'prompt'
            ? typeConfig.prompt
            : typeConfig[item.data.type] || typeConfig.observation;

          // Parse concepts for observations
          let concepts: string[] = [];
          if (item.type === 'observation' && item.data.concepts) {
            try {
              concepts = JSON.parse(item.data.concepts);
            } catch { /* ignore */ }
          }

          return (
            <div key={key} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-9 top-3 w-4 h-4 rounded-full border-2 border-base-100 ${
                item.type === 'prompt' ? 'bg-primary' : 'bg-info'
              }`} />

              <Card
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(key);
                }}
              >
                <CardBody className="py-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded bg-base-200 ${config.color}`}>
                      <Icon icon={config.icon} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge
                          variant={item.type === 'prompt' ? 'primary' : 'info'}
                          size="xs"
                        >
                          {item.type === 'prompt'
                            ? `prompt #${item.data.prompt_number || '?'}`
                            : item.data.type || 'observation'}
                        </Badge>
                        <span className="text-xs text-base-content/50">
                          {formatTime(item.timestamp)}
                        </span>
                        <span className="text-xs text-base-content/40">#{item.id}</span>
                        {/* Concepts as tags */}
                        {concepts.length > 0 && concepts.map((concept) => (
                          <Badge key={concept} variant="ghost" size="xs" className="text-base-content/50">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                      {/* Title */}
                      <p className="text-sm font-medium">
                        {item.type === 'prompt'
                          ? (item.data.prompt_text?.length > 100
                              ? item.data.prompt_text.substring(0, 100) + '...'
                              : item.data.prompt_text)
                          : item.data.title || 'Untitled'}
                      </p>

                      {/* Always show narrative for observations */}
                      {item.type === 'observation' && item.data.narrative && (
                        <p className={`text-sm text-base-content/70 mt-1 ${isExpanded ? '' : 'line-clamp-3'}`}>
                          {item.data.narrative}
                        </p>
                      )}

                      {/* Always show prompt text for prompts (full when expanded) */}
                      {item.type === 'prompt' && item.data.prompt_text?.length > 100 && (
                        <p className={`text-sm text-base-content/70 mt-1 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                          {isExpanded ? item.data.prompt_text : item.data.prompt_text.substring(100)}
                        </p>
                      )}

                      {/* Files info (always visible if present) */}
                      {item.type === 'observation' && (item.data.files_read || item.data.files_modified) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.data.files_read && (() => {
                            try {
                              const files = JSON.parse(item.data.files_read);
                              if (files.length > 0) {
                                return (
                                  <span className="text-xs text-base-content/50">
                                    <Icon icon="lucide:file" size={12} className="inline mr-1" />
                                    {files.length} read
                                  </span>
                                );
                              }
                            } catch { return null; }
                          })()}
                          {item.data.files_modified && (() => {
                            try {
                              const files = JSON.parse(item.data.files_modified);
                              if (files.length > 0) {
                                return (
                                  <span className="text-xs text-base-content/50">
                                    <Icon icon="lucide:pencil" size={12} className="inline mr-1" />
                                    {files.length} modified
                                  </span>
                                );
                              }
                            } catch { return null; }
                          })()}
                        </div>
                      )}

                      {/* Expanded content - full text and file details */}
                      {isExpanded && item.type === 'observation' && item.data.text && (
                        <div className="mt-3 pt-3 border-t border-base-200">
                          <p className="text-sm text-base-content/70 whitespace-pre-wrap">
                            {item.data.text}
                          </p>
                          {(item.data.files_read || item.data.files_modified) && (
                            <div className="mt-3 space-y-1">
                              {item.data.files_read && (() => {
                                try {
                                  const files = JSON.parse(item.data.files_read);
                                  if (files.length > 0) {
                                    return (
                                      <div>
                                        <span className="text-xs font-medium">Files Read:</span>
                                        <div className="text-xs text-base-content/50 mt-1">
                                          {files.map((f: string, i: number) => (
                                            <div key={i} className="truncate">{f}</div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                } catch { return null; }
                              })()}
                              {item.data.files_modified && (() => {
                                try {
                                  const files = JSON.parse(item.data.files_modified);
                                  if (files.length > 0) {
                                    return (
                                      <div>
                                        <span className="text-xs font-medium">Files Modified:</span>
                                        <div className="text-xs text-base-content/50 mt-1">
                                          {files.map((f: string, i: number) => (
                                            <div key={i} className="truncate">{f}</div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                } catch { return null; }
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Icon
                      icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                      size={16}
                      className="text-base-content/30"
                    />
                  </div>
                </CardBody>
              </Card>
            </div>
          );
        })}

        {data.timeline.length === 0 && (
          <div className="text-center py-8 text-base-content/50">
            No activity in this session
          </div>
        )}
      </div>
    </div>
  );
}
