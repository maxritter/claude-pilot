import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Icon } from './ui';

// Log levels and components matching the logger.ts definitions
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LogComponent = 'HOOK' | 'WORKER' | 'SDK' | 'PARSER' | 'DB' | 'SYSTEM' | 'HTTP' | 'SESSION' | 'CHROMA';

interface ParsedLogLine {
  raw: string;
  timestamp?: string;
  level?: LogLevel;
  component?: LogComponent;
  correlationId?: string;
  message?: string;
  isSpecial?: 'dataIn' | 'dataOut' | 'success' | 'failure' | 'timing' | 'happyPath';
}

// Configuration for log levels
const LOG_LEVELS: { key: LogLevel; label: string; icon: string; color: string }[] = [
  { key: 'DEBUG', label: 'Debug', icon: '🔍', color: 'text-gray-400' },
  { key: 'INFO', label: 'Info', icon: 'ℹ️', color: 'text-info' },
  { key: 'WARN', label: 'Warn', icon: '⚠️', color: 'text-warning' },
  { key: 'ERROR', label: 'Error', icon: '❌', color: 'text-error' },
];

// Configuration for log components
const LOG_COMPONENTS: { key: LogComponent; label: string; icon: string; color: string }[] = [
  { key: 'HOOK', label: 'Hook', icon: '🪝', color: 'text-purple-400' },
  { key: 'WORKER', label: 'Worker', icon: '⚙️', color: 'text-info' },
  { key: 'SDK', label: 'SDK', icon: '📦', color: 'text-success' },
  { key: 'PARSER', label: 'Parser', icon: '📄', color: 'text-sky-400' },
  { key: 'DB', label: 'DB', icon: '🗄️', color: 'text-orange-400' },
  { key: 'SYSTEM', label: 'System', icon: '💻', color: 'text-gray-400' },
  { key: 'HTTP', label: 'HTTP', icon: '🌐', color: 'text-green-400' },
  { key: 'SESSION', label: 'Session', icon: '📋', color: 'text-pink-400' },
  { key: 'CHROMA', label: 'Chroma', icon: '🔮', color: 'text-violet-400' },
];

// Parse a single log line into structured data
function parseLogLine(line: string): ParsedLogLine {
  // Pattern: [timestamp] [LEVEL] [COMPONENT] [correlation?] message
  const pattern = /^\[([^\]]+)\]\s+\[(\w+)\s*\]\s+\[(\w+)\s*\]\s+(?:\[([^\]]+)\]\s+)?(.*)$/;
  const match = line.match(pattern);

  if (!match) {
    return { raw: line };
  }

  const [, timestamp, level, component, correlationId, message] = match;

  // Detect special message types
  let isSpecial: ParsedLogLine['isSpecial'] = undefined;
  if (message.startsWith('→')) isSpecial = 'dataIn';
  else if (message.startsWith('←')) isSpecial = 'dataOut';
  else if (message.startsWith('✓')) isSpecial = 'success';
  else if (message.startsWith('✗')) isSpecial = 'failure';
  else if (message.startsWith('⏱')) isSpecial = 'timing';
  else if (message.includes('[HAPPY-PATH]')) isSpecial = 'happyPath';

  return {
    raw: line,
    timestamp,
    level: level?.trim() as LogLevel,
    component: component?.trim() as LogComponent,
    correlationId: correlationId || undefined,
    message,
    isSpecial,
  };
}

interface LogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogsDrawer({ isOpen, onClose }: LogsDrawerProps) {
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [height, setHeight] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  // Filter state
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(
    new Set(['DEBUG', 'INFO', 'WARN', 'ERROR'])
  );
  const [activeComponents, setActiveComponents] = useState<Set<LogComponent>>(
    new Set(['HOOK', 'WORKER', 'SDK', 'PARSER', 'DB', 'SYSTEM', 'HTTP', 'SESSION', 'CHROMA'])
  );
  const [alignmentOnly, setAlignmentOnly] = useState(false);

  // Parse and filter log lines
  const parsedLines = useMemo(() => {
    if (!logs) return [];
    return logs.split('\n').map(parseLogLine);
  }, [logs]);

  const filteredLines = useMemo(() => {
    return parsedLines.filter(line => {
      if (alignmentOnly) {
        return line.raw.includes('[ALIGNMENT]');
      }
      if (!line.level || !line.component) return true;
      return activeLevels.has(line.level) && activeComponents.has(line.component);
    });
  }, [parsedLines, activeLevels, activeComponents, alignmentOnly]);

  // Check if user is at bottom before updating
  const checkIfAtBottom = useCallback(() => {
    if (!contentRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (contentRef.current && wasAtBottomRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    wasAtBottomRef.current = checkIfAtBottom();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }
      const data = await response.json();
      setLogs(data.logs || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [checkIfAtBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const handleClearLogs = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all logs?')) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/logs/clear', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Failed to clear logs: ${response.statusText}`);
      }
      setLogs('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.min(Math.max(150, startHeightRef.current + deltaY), window.innerHeight - 100);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (isOpen) {
      wasAtBottomRef.current = true;
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) {
      return;
    }
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchLogs]);

  const toggleLevel = useCallback((level: LogLevel) => {
    setActiveLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  const toggleComponent = useCallback((component: LogComponent) => {
    setActiveComponents(prev => {
      const next = new Set(prev);
      if (next.has(component)) {
        next.delete(component);
      } else {
        next.add(component);
      }
      return next;
    });
  }, []);

  const setAllLevels = useCallback((enabled: boolean) => {
    if (enabled) {
      setActiveLevels(new Set(['DEBUG', 'INFO', 'WARN', 'ERROR']));
    } else {
      setActiveLevels(new Set());
    }
  }, []);

  const setAllComponents = useCallback((enabled: boolean) => {
    if (enabled) {
      setActiveComponents(new Set(['HOOK', 'WORKER', 'SDK', 'PARSER', 'DB', 'SYSTEM', 'HTTP', 'SESSION', 'CHROMA']));
    } else {
      setActiveComponents(new Set());
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  const getLevelColor = (level?: LogLevel) => {
    const config = LOG_LEVELS.find(l => l.key === level);
    return config?.color || 'text-base-content';
  };

  const getComponentColor = (component?: LogComponent) => {
    const config = LOG_COMPONENTS.find(c => c.key === component);
    return config?.color || 'text-base-content';
  };

  const getLineClasses = (line: ParsedLogLine) => {
    if (line.level === 'ERROR') return 'bg-error/10';
    if (line.level === 'WARN') return 'bg-warning/5';
    return '';
  };

  const renderLogLine = (line: ParsedLogLine, index: number) => {
    if (!line.timestamp) {
      return (
        <div key={index} className="whitespace-pre-wrap break-all text-base-content/60">
          {line.raw}
        </div>
      );
    }

    const levelConfig = LOG_LEVELS.find(l => l.key === line.level);
    const componentConfig = LOG_COMPONENTS.find(c => c.key === line.component);

    return (
      <div key={index} className={`whitespace-pre-wrap break-all py-0.5 px-1 rounded ${getLineClasses(line)}`}>
        <span className="text-base-content/40">[{line.timestamp}]</span>
        {' '}
        <span className={`font-medium ${getLevelColor(line.level)}`} title={line.level}>
          [{levelConfig?.icon || ''} {line.level?.padEnd(5)}]
        </span>
        {' '}
        <span className={`font-medium ${getComponentColor(line.component)}`} title={line.component}>
          [{componentConfig?.icon || ''} {line.component?.padEnd(7)}]
        </span>
        {' '}
        {line.correlationId && (
          <>
            <span className="text-base-content/50">[{line.correlationId}]</span>
            {' '}
          </>
        )}
        <span className={line.isSpecial === 'success' ? 'text-success' : line.isSpecial === 'failure' ? 'text-error' : 'text-base-content'}>
          {line.message}
        </span>
      </div>
    );
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 flex flex-col z-50 shadow-2xl"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1.5 cursor-ns-resize flex items-center justify-center bg-base-200 hover:bg-base-300 transition-colors"
        onMouseDown={handleMouseDown}
      >
        <div className="w-12 h-1 bg-base-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center px-3 h-9 bg-base-200 border-b border-base-300">
        <div className="flex gap-1">
          <div className="px-3 py-1 text-xs font-medium bg-base-100 text-base-content rounded">
            Console
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-base-content/60 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={fetchLogs}
            disabled={isLoading}
            title="Refresh logs"
          >
            <Icon icon="lucide:refresh-cw" size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={() => {
              wasAtBottomRef.current = true;
              scrollToBottom();
            }}
            title="Scroll to bottom"
          >
            <Icon icon="lucide:arrow-down" size={14} />
          </button>
          <button
            className="btn btn-ghost btn-xs btn-square hover:text-error"
            onClick={handleClearLogs}
            disabled={isLoading}
            title="Clear logs"
          >
            <Icon icon="lucide:trash-2" size={14} />
          </button>
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={onClose}
            title="Close console"
          >
            <Icon icon="lucide:x" size={14} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 px-3 py-2 bg-base-200/50 border-b border-base-300 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-base-content/50 uppercase text-[10px]">Quick:</span>
          <button
            className={`badge badge-sm cursor-pointer ${alignmentOnly ? 'badge-warning' : 'badge-ghost opacity-50'}`}
            onClick={() => setAlignmentOnly(!alignmentOnly)}
            title="Show only session alignment logs"
          >
            🔗 Alignment
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-base-content/50 uppercase text-[10px]">Levels:</span>
          <div className="flex flex-wrap gap-1">
            {LOG_LEVELS.map(level => (
              <button
                key={level.key}
                className={`badge badge-sm cursor-pointer ${activeLevels.has(level.key) ? 'badge-primary' : 'badge-ghost opacity-40'}`}
                onClick={() => toggleLevel(level.key)}
                title={level.label}
              >
                {level.icon} {level.label}
              </button>
            ))}
            <button
              className="badge badge-sm badge-ghost cursor-pointer"
              onClick={() => setAllLevels(activeLevels.size === 0)}
              title={activeLevels.size === LOG_LEVELS.length ? 'Select none' : 'Select all'}
            >
              {activeLevels.size === LOG_LEVELS.length ? '○' : '●'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-base-content/50 uppercase text-[10px]">Components:</span>
          <div className="flex flex-wrap gap-1">
            {LOG_COMPONENTS.map(comp => (
              <button
                key={comp.key}
                className={`badge badge-sm cursor-pointer ${activeComponents.has(comp.key) ? 'badge-secondary' : 'badge-ghost opacity-40'}`}
                onClick={() => toggleComponent(comp.key)}
                title={comp.label}
              >
                {comp.icon} {comp.label}
              </button>
            ))}
            <button
              className="badge badge-sm badge-ghost cursor-pointer"
              onClick={() => setAllComponents(activeComponents.size === 0)}
              title={activeComponents.size === LOG_COMPONENTS.length ? 'Select none' : 'Select all'}
            >
              {activeComponents.size === LOG_COMPONENTS.length ? '○' : '●'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-3 py-2 bg-error/10 text-error text-xs">
          ⚠ {error}
        </div>
      )}

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2" ref={contentRef}>
        <div className="font-mono text-xs leading-relaxed">
          {filteredLines.length === 0 ? (
            <div className="text-base-content/40 italic">No logs available</div>
          ) : (
            filteredLines.map((line, index) => renderLogLine(line, index))
          )}
        </div>
      </div>
    </div>
  );
}
