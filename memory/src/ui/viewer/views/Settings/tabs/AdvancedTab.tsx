import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, CardTitle, Select, Input, Toggle, Button, Icon, Spinner } from '../../../components/ui';
import { useToast } from '../../../context';

interface AdvancedTabProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

interface QueueMessage {
  id: number;
  status: string;
  message_type: string;
  tool_name?: string;
  retry_count: number;
  created_at_epoch: number;
  error_message?: string;
}

interface QueueData {
  queue: {
    messages: QueueMessage[];
    totalPending: number;
    totalProcessing: number;
    totalFailed: number;
  };
  recentlyProcessed: QueueMessage[];
  stuckCount: number;
}

const logLevelOptions = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

function QueueManagement() {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/pending-queue');
      const data = await response.json();
      setQueueData(data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      await fetch('/api/pending-queue/process', { method: 'POST' });
      toast.success('Queue processing started');
      fetchQueue();
    } catch (error) {
      toast.error('Failed to start processing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async (messageId: number) => {
    try {
      const response = await fetch(`/api/pending-queue/${messageId}/retry`, { method: 'POST' });
      if (response.ok) {
        toast.success('Message queued for retry');
        fetchQueue();
      } else {
        toast.error('Failed to retry message');
      }
    } catch (error) {
      toast.error('Failed to retry message');
    }
  };

  const handleClearFailed = async () => {
    if (!confirm('Clear all failed messages?')) return;
    try {
      await fetch('/api/pending-queue/failed', { method: 'DELETE' });
      toast.success('Failed messages cleared');
      fetchQueue();
    } catch (error) {
      toast.error('Failed to clear messages');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear ALL queue messages? This cannot be undone.')) return;
    try {
      await fetch('/api/pending-queue/all', { method: 'DELETE' });
      toast.success('All messages cleared');
      fetchQueue();
    } catch (error) {
      toast.error('Failed to clear messages');
    }
  };

  if (isLoading) {
    return <Spinner size="sm" />;
  }

  const { queue } = queueData || { queue: { messages: [], totalPending: 0, totalProcessing: 0, totalFailed: 0 } };
  const failedMessages = queue.messages.filter(m => m.status === 'failed');

  return (
    <div className="space-y-4">
      {/* Queue Stats */}
      <div className="flex gap-4 text-sm">
        <div className="badge badge-info gap-1">
          <Icon icon="lucide:clock" size={12} />
          {queue.totalPending} pending
        </div>
        <div className="badge badge-warning gap-1">
          <Icon icon="lucide:loader" size={12} />
          {queue.totalProcessing} processing
        </div>
        <div className="badge badge-error gap-1">
          <Icon icon="lucide:alert-circle" size={12} />
          {queue.totalFailed} failed
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={handleProcess} loading={isProcessing}>
          <Icon icon="lucide:play" size={14} className="mr-1" />
          Process Queue
        </Button>
        <Button size="sm" variant="ghost" onClick={fetchQueue}>
          <Icon icon="lucide:refresh-cw" size={14} className="mr-1" />
          Refresh
        </Button>
        {queue.totalFailed > 0 && (
          <Button size="sm" variant="ghost" onClick={handleClearFailed}>
            <Icon icon="lucide:trash-2" size={14} className="mr-1" />
            Clear Failed
          </Button>
        )}
        {(queue.totalPending + queue.totalProcessing + queue.totalFailed) > 0 && (
          <Button size="sm" variant="error" onClick={handleClearAll}>
            <Icon icon="lucide:trash" size={14} className="mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Failed Messages List */}
      {failedMessages.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Failed Messages</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {failedMessages.map((msg) => (
              <div key={msg.id} className="flex items-center justify-between p-2 bg-base-200 rounded text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{msg.message_type}</span>
                  {msg.tool_name && <span className="text-base-content/60 ml-2">{msg.tool_name}</span>}
                  <span className="text-base-content/40 ml-2">
                    ({msg.retry_count} retries)
                  </span>
                  {msg.error_message && (
                    <div className="text-error truncate" title={msg.error_message}>
                      {msg.error_message}
                    </div>
                  )}
                </div>
                <Button size="xs" variant="ghost" onClick={() => handleRetry(msg.id)}>
                  <Icon icon="lucide:rotate-ccw" size={12} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdvancedTab({ settings, onSettingChange }: AdvancedTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <CardTitle>Queue Management</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            View and manage the processing queue
          </p>
          <QueueManagement />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Logging</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Configure logging verbosity
          </p>
          <Select
            label="Log Level"
            options={logLevelOptions}
            value={settings.CLAUDE_MEM_LOG_LEVEL || 'info'}
            onChange={(e) => onSettingChange('CLAUDE_MEM_LOG_LEVEL', e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Tool Filtering</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Skip processing for specific tools (comma-separated)
          </p>
          <Input
            label="Skip Tools"
            placeholder="Read, Write, Grep"
            value={settings.CLAUDE_MEM_SKIP_TOOLS || ''}
            onChange={(e) => onSettingChange('CLAUDE_MEM_SKIP_TOOLS', e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>File Exclusions</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Patterns to exclude from folder markdown generation
          </p>
          <Input
            label="Exclude Patterns"
            placeholder="node_modules, .git, dist"
            value={settings.CLAUDE_MEM_FOLDER_MD_EXCLUDE || 'node_modules,.git,dist'}
            onChange={(e) => onSettingChange('CLAUDE_MEM_FOLDER_MD_EXCLUDE', e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Privacy</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Control what data is stored
          </p>
          <div className="space-y-3">
            <Toggle
              label="Store User Prompts"
              checked={settings.CLAUDE_MEM_STORE_PROMPTS !== false}
              onChange={(e) => onSettingChange('CLAUDE_MEM_STORE_PROMPTS', e.target.checked)}
            />
            <Toggle
              label="Store Tool Results"
              checked={settings.CLAUDE_MEM_STORE_TOOL_RESULTS !== false}
              onChange={(e) => onSettingChange('CLAUDE_MEM_STORE_TOOL_RESULTS', e.target.checked)}
            />
            <Toggle
              label="Store File Contents"
              checked={settings.CLAUDE_MEM_STORE_FILE_CONTENTS !== false}
              onChange={(e) => onSettingChange('CLAUDE_MEM_STORE_FILE_CONTENTS', e.target.checked)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Compression</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Memory compression settings
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Content Length"
              type="number"
              value={settings.CLAUDE_MEM_MIN_CONTENT_LENGTH || '100'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_MIN_CONTENT_LENGTH', e.target.value)}
            />
            <Input
              label="Max Content Length"
              type="number"
              value={settings.CLAUDE_MEM_MAX_CONTENT_LENGTH || '10000'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_MAX_CONTENT_LENGTH', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Experimental</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Experimental features (may be unstable)
          </p>
          <div className="space-y-3">
            <Toggle
              label="Enable Concept Extraction"
              checked={settings.CLAUDE_MEM_ENABLE_CONCEPTS === true}
              onChange={(e) => onSettingChange('CLAUDE_MEM_ENABLE_CONCEPTS', e.target.checked)}
            />
            <Toggle
              label="Enable Auto-Summarization"
              checked={settings.CLAUDE_MEM_AUTO_SUMMARIZE === true}
              onChange={(e) => onSettingChange('CLAUDE_MEM_AUTO_SUMMARIZE', e.target.checked)}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
