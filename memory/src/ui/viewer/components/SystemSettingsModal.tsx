import React, { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';
import { API_ENDPOINTS } from '../constants/api';
import { Icon } from './ui';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
  isSaving: boolean;
  saveStatus: string;
}

// Form field with optional tooltip
function FormField({
  label,
  tooltip,
  children
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-field">
      <label className="form-field-label">
        {label}
        {tooltip && (
          <span className="tooltip-trigger" title={tooltip}>
            <Icon icon="lucide:circle-help" size={14} />
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = true
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`settings-section-collapsible ${isOpen ? 'open' : ''}`}>
      <button
        className="section-header-btn"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="section-header-content">
          <span className="section-title">{title}</span>
          {description && <span className="section-description">{description}</span>}
        </div>
        <Icon icon="lucide:chevron-down" size={16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </button>
      {isOpen && <div className="section-content">{children}</div>}
    </div>
  );
}

export function SystemSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  isSaving,
  saveStatus
}: SystemSettingsModalProps) {
  const [formState, setFormState] = useState<Settings>(settings);
  const [workerStatus, setWorkerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartStatus, setRestartStatus] = useState('');
  const [queueDepth, setQueueDepth] = useState<number | null>(null);

  // Update form state when settings prop changes
  useEffect(() => {
    setFormState(settings);
  }, [settings]);

  // Check worker status
  const checkWorkerStatus = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HEALTH, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json();
        setWorkerStatus('online');
        setQueueDepth(data.queueDepth ?? null);
      } else {
        setWorkerStatus('offline');
      }
    } catch {
      setWorkerStatus('offline');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkWorkerStatus();
      const interval = setInterval(checkWorkerStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, checkWorkerStatus]);

  const updateSetting = useCallback((key: keyof Settings, value: string) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(formState);
  }, [formState, onSave]);

  const handleRestart = async () => {
    setIsRestarting(true);
    setRestartStatus('Restarting worker...');
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/restart`, {
        method: 'POST'
      });
      if (response.ok) {
        setRestartStatus('✓ Worker restarting...');
        setWorkerStatus('checking');
        // Wait a bit then check status
        setTimeout(() => {
          checkWorkerStatus();
          setRestartStatus('');
        }, 3000);
      } else {
        setRestartStatus('✗ Restart failed');
      }
    } catch (e) {
      setRestartStatus('✗ Could not reach worker');
    }
    setIsRestarting(false);
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="system-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>System Settings</h2>
          <button
            onClick={onClose}
            className="modal-close-btn"
            title="Close (Esc)"
          >
            <Icon icon="lucide:x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body system-settings-body">
          {/* Worker Status Section */}
          <CollapsibleSection
            title="Worker Status"
            description="Background service health and controls"
          >
            <div className="worker-status-panel">
              <div className="status-row">
                <span className="status-label">Status:</span>
                <span className={`status-badge ${workerStatus}`}>
                  {workerStatus === 'checking' && '⏳ Checking...'}
                  {workerStatus === 'online' && '✓ Online'}
                  {workerStatus === 'offline' && '✗ Offline'}
                </span>
              </div>
              {queueDepth !== null && (
                <div className="status-row">
                  <span className="status-label">Queue:</span>
                  <span className={queueDepth > 10 ? 'queue-warning' : ''}>
                    {queueDepth} pending {queueDepth > 10 && '⚠️'}
                  </span>
                </div>
              )}
              <div className="restart-section">
                <button
                  className="restart-btn"
                  onClick={handleRestart}
                  disabled={isRestarting}
                >
                  {isRestarting ? 'Restarting...' : '↻ Restart Worker'}
                </button>
                {restartStatus && (
                  <span className={`restart-status ${restartStatus.includes('✓') ? 'success' : 'error'}`}>
                    {restartStatus}
                  </span>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Logging Section */}
          <CollapsibleSection
            title="Logging"
            description="Log level and debugging"
            defaultOpen={false}
          >
            <FormField
              label="Log Level"
              tooltip="Verbosity of worker logs"
            >
              <select
                value={formState.CLAUDE_MEM_LOG_LEVEL || 'INFO'}
                onChange={(e) => updateSetting('CLAUDE_MEM_LOG_LEVEL', e.target.value)}
              >
                {logLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </FormField>
          </CollapsibleSection>

          {/* Tool Filtering Section */}
          <CollapsibleSection
            title="Tool Filtering"
            description="Which tools to skip observing"
            defaultOpen={false}
          >
            <FormField
              label="Skip Tools"
              tooltip="Comma-separated list of tool names to ignore (e.g., TodoWrite,AskUserQuestion)"
            >
              <textarea
                value={formState.CLAUDE_MEM_SKIP_TOOLS || ''}
                onChange={(e) => updateSetting('CLAUDE_MEM_SKIP_TOOLS', e.target.value)}
                placeholder="TodoWrite,AskUserQuestion,Skill"
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </FormField>
          </CollapsibleSection>

          {/* CLAUDE.md Section */}
          <CollapsibleSection
            title="CLAUDE.md Generation"
            description="Folder-level context files"
            defaultOpen={false}
          >
            <FormField
              label="Excluded Folders"
              tooltip="JSON array of folder paths to exclude from CLAUDE.md generation"
            >
              <textarea
                value={formState.CLAUDE_MEM_FOLDER_MD_EXCLUDE || '[]'}
                onChange={(e) => updateSetting('CLAUDE_MEM_FOLDER_MD_EXCLUDE', e.target.value)}
                placeholder='["/path/to/exclude"]'
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </FormField>
          </CollapsibleSection>

          {/* OpenRouter Advanced Section */}
          {formState.CLAUDE_MEM_PROVIDER === 'openrouter' && (
            <CollapsibleSection
              title="OpenRouter Advanced"
              description="Context window and token limits"
              defaultOpen={false}
            >
              <FormField
                label="Max Context Messages"
                tooltip="Maximum number of messages to keep in conversation history"
              >
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={formState.CLAUDE_MEM_OPENROUTER_MAX_CONTEXT_MESSAGES || '20'}
                  onChange={(e) => updateSetting('CLAUDE_MEM_OPENROUTER_MAX_CONTEXT_MESSAGES', e.target.value)}
                />
              </FormField>
              <FormField
                label="Max Tokens"
                tooltip="Maximum estimated tokens in context window"
              >
                <input
                  type="number"
                  min="10000"
                  max="500000"
                  step="10000"
                  value={formState.CLAUDE_MEM_OPENROUTER_MAX_TOKENS || '100000'}
                  onChange={(e) => updateSetting('CLAUDE_MEM_OPENROUTER_MAX_TOKENS', e.target.value)}
                />
              </FormField>
            </CollapsibleSection>
          )}
        </div>

        {/* Footer with Save button */}
        <div className="modal-footer">
          <div className="save-status">
            {saveStatus && <span className={saveStatus.includes('✓') ? 'success' : saveStatus.includes('✗') ? 'error' : ''}>{saveStatus}</span>}
          </div>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
