import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, Badge, Icon, Button } from '../../components/ui';

interface StreamEvent {
  id: number;
  type: string;
  timestamp: number;
  data: any;
}

export function LiveView() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventIdRef = useRef(0);

  const toggleEventExpanded = (id: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const eventSource = new EventSource('/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newEvent: StreamEvent = {
          id: eventIdRef.current++,
          type: data.type || 'unknown',
          timestamp: data.timestamp || Date.now(),
          data,
        };

        setEvents((prev) => {
          // Replace the last processing_status event instead of adding a new one
          if (data.type === 'processing_status') {
            const lastProcessingIndex = prev.findLastIndex(e => e.type === 'processing_status');
            if (lastProcessingIndex !== -1) {
              const updated = [...prev];
              updated[lastProcessingIndex] = { ...newEvent, id: prev[lastProcessingIndex].id };
              return updated;
            }
          }
          return [...prev.slice(-100), newEvent];
        });
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = () => setIsConnected(false);

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const clearEvents = () => setEvents([]);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderEventContent = (event: StreamEvent) => {
    const { type, data } = event;

    switch (type) {
      case 'new_observation': {
        const obs = data.observation || data;
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium">{obs.title || 'New Observation'}</div>
            <div className="flex items-center gap-2 mt-1">
              {obs.project && (
                <div className="text-xs text-base-content/50 flex items-center gap-1">
                  <Icon icon="lucide:folder" size={12} />
                  {obs.project}
                </div>
              )}
              {obs.type && (
                <Badge variant="ghost" size="xs">{obs.type}</Badge>
              )}
            </div>
            {obs.subtitle && (
              <div className="text-xs text-base-content/60 mt-1">{obs.subtitle}</div>
            )}
          </div>
        );
      }

      case 'new_summary': {
        const summary = data.summary || data;
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium">Summary Generated</div>
            {summary.project && (
              <div className="text-xs text-base-content/50 flex items-center gap-1 mt-1">
                <Icon icon="lucide:folder" size={12} />
                {summary.project}
              </div>
            )}
            {summary.completed && (
              <div className="text-xs text-base-content/60 mt-1 line-clamp-2">{summary.completed}</div>
            )}
          </div>
        );
      }

      case 'processing_status':
        return (
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="font-medium">
              {data.isProcessing ? 'Processing...' : 'Idle'}
            </div>
            {data.queueDepth > 0 && (
              <Badge variant="warning" size="xs">{data.queueDepth} in queue</Badge>
            )}
          </div>
        );

      case 'initial_load':
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium">Connected to Worker</div>
            <div className="text-xs text-base-content/50">
              {data.projects?.length || 0} projects loaded
            </div>
          </div>
        );

      case 'connected':
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium text-success">Stream Connected</div>
          </div>
        );

      case 'error':
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium text-error">{data.message || 'Error'}</div>
            {data.details && (
              <div className="text-xs text-base-content/50 mt-0.5">{data.details}</div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium">{type}</div>
            {Object.keys(data).length > 1 && (
              <div className="text-xs text-base-content/50 mt-0.5">
                {Object.entries(data)
                  .filter(([k]) => k !== 'type' && k !== 'timestamp')
                  .slice(0, 3)
                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`)
                  .join(' • ')}
              </div>
            )}
          </div>
        );
    }
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'new_observation': return 'lucide:brain';
      case 'new_summary': return 'lucide:file-text';
      case 'new_prompt': return 'lucide:message-square';
      case 'processing_status': return 'lucide:loader-2';
      case 'initial_load': return 'lucide:plug';
      case 'connected': return 'lucide:wifi';
      case 'error': return 'lucide:alert-circle';
      default: return 'lucide:radio';
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'new_observation': return 'info';
      case 'new_summary': return 'warning';
      case 'new_prompt': return 'secondary';
      case 'processing_status': return 'accent';
      case 'initial_load': return 'success';
      case 'connected': return 'success';
      case 'error': return 'error';
      default: return 'secondary';
    }
  };

  const hasExpandableContent = (event: StreamEvent): boolean => {
    const { type, data } = event;
    if (type === 'new_observation') {
      const obs = data.observation || data;
      return !!(obs.narrative || obs.text || obs.facts || obs.concepts);
    }
    if (type === 'new_summary') {
      const summary = data.summary || data;
      return !!(summary.request || summary.investigated || summary.learned || summary.completed || summary.next_steps);
    }
    return false;
  };

  const renderEventDetails = (event: StreamEvent) => {
    const { type, data } = event;

    if (type === 'new_observation') {
      const obs = data.observation || data;
      const concepts = obs.concepts ? (typeof obs.concepts === 'string' ? JSON.parse(obs.concepts) : obs.concepts) : [];
      const filesRead = obs.files_read ? (typeof obs.files_read === 'string' ? JSON.parse(obs.files_read) : obs.files_read) : [];
      const filesModified = obs.files_modified ? (typeof obs.files_modified === 'string' ? JSON.parse(obs.files_modified) : obs.files_modified) : [];

      return (
        <div className="mt-3 space-y-3 text-sm">
          {obs.narrative && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Narrative</div>
              <div className="text-base-content/80 whitespace-pre-wrap">{obs.narrative}</div>
            </div>
          )}
          {obs.text && !obs.narrative && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Content</div>
              <div className="text-base-content/80 whitespace-pre-wrap">{obs.text}</div>
            </div>
          )}
          {concepts.length > 0 && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Concepts</div>
              <div className="flex flex-wrap gap-1">
                {concepts.map((c: string) => (
                  <Badge key={c} variant="ghost" size="xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}
          {filesRead.length > 0 && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Files Read</div>
              <div className="text-xs text-base-content/60 font-mono">{filesRead.join(', ')}</div>
            </div>
          )}
          {filesModified.length > 0 && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Files Modified</div>
              <div className="text-xs text-base-content/60 font-mono">{filesModified.join(', ')}</div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'new_summary') {
      const summary = data.summary || data;
      return (
        <div className="mt-3 space-y-3 text-sm">
          {summary.request && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Request</div>
              <div className="text-base-content/80">{summary.request}</div>
            </div>
          )}
          {summary.investigated && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Investigated</div>
              <div className="text-base-content/80">{summary.investigated}</div>
            </div>
          )}
          {summary.learned && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Learned</div>
              <div className="text-base-content/80">{summary.learned}</div>
            </div>
          )}
          {summary.completed && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Completed</div>
              <div className="text-base-content/80">{summary.completed}</div>
            </div>
          )}
          {summary.next_steps && (
            <div>
              <div className="text-xs font-medium text-base-content/50 mb-1">Next Steps</div>
              <div className="text-base-content/80">{summary.next_steps}</div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Stream</h1>
          <p className="text-base-content/60">Real-time events from the worker</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}`} />
            <span className="text-sm text-base-content/70">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span className="text-sm">Auto-scroll</span>
          </label>
          <Button variant="ghost" size="sm" onClick={clearEvents}>
            <Icon icon="lucide:trash-2" size={16} />
            Clear
          </Button>
        </div>
      </div>

      <Card className="flex-1 min-h-0">
        <CardBody className="p-0 h-full">
          <div
            ref={containerRef}
            className="h-[calc(100vh-280px)] overflow-y-auto"
          >
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-full text-base-content/50">
                <div className="text-center">
                  <Icon icon="lucide:radio" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Waiting for events...</p>
                  <p className="text-xs mt-1">Events will appear here in real-time</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-base-300/30">
                {events.map((event) => {
                  const isExpanded = expandedEvents.has(event.id);
                  const canExpand = hasExpandableContent(event);

                  return (
                    <div
                      key={event.id}
                      className={`px-4 py-3 transition-colors ${canExpand ? 'cursor-pointer hover:bg-base-200/50' : ''}`}
                      onClick={() => canExpand && toggleEventExpanded(event.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${getEventColor(event.type)}/10`}>
                          <Icon
                            icon={getEventIcon(event.type)}
                            size={16}
                            className={`text-${getEventColor(event.type)} ${event.type === 'processing_status' && event.data?.isProcessing ? 'animate-spin' : ''}`}
                          />
                        </div>
                        {renderEventContent(event)}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-base-content/40 whitespace-nowrap">
                            {formatTime(event.timestamp)}
                          </span>
                          {canExpand && (
                            <Icon
                              icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                              size={14}
                              className="text-base-content/40"
                            />
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="ml-11 border-l-2 border-base-300 pl-4">
                          {renderEventDetails(event)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-4 text-sm text-base-content/60">
        <span>{events.length} events</span>
        <span>•</span>
        <span>Showing last 100</span>
      </div>
    </div>
  );
}
