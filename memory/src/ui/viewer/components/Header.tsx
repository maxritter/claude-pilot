import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ThemePreference } from '../hooks/useTheme';
import { useSpinningFavicon } from '../hooks/useSpinningFavicon';
import { Icon } from './ui';

interface HeaderProps {
  isConnected: boolean;
  projects: string[];
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  isProcessing: boolean;
  queueDepth: number;
  themePreference: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onContextPreviewToggle: () => void;
  onSystemSettingsToggle?: () => void;
}

export function Header({
  isConnected,
  projects,
  currentFilter,
  onFilterChange,
  isProcessing,
  queueDepth,
  themePreference,
  onThemeChange,
  onContextPreviewToggle,
  onSystemSettingsToggle
}: HeaderProps) {
  useSpinningFavicon(isProcessing);

  return (
    <div className="header">
      <h1>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src="favicon.jpg" alt="" className={`logomark ${isProcessing ? 'spinning' : ''}`} />
          {queueDepth > 0 && (
            <div className="queue-bubble">
              {queueDepth}
            </div>
          )}
        </div>
        <span className="logo-text">Claude Pilot</span>
      </h1>
      <div className="status">
        <a
          href="https://github.com/maxritter/claude-pilot"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
          title="Repository"
        >
          <Icon icon="lucide:git-branch" size={18} />
        </a>
        <select
          value={currentFilter}
          onChange={e => onFilterChange(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project} value={project}>{project}</option>
          ))}
        </select>
        <ThemeToggle
          preference={themePreference}
          onThemeChange={onThemeChange}
        />
        <button
          className="settings-btn"
          onClick={onContextPreviewToggle}
          title="Context Settings"
        >
          <Icon icon="lucide:settings" size={18} className="settings-icon" />
        </button>
        {onSystemSettingsToggle && (
          <button
            className="settings-btn system-settings-btn"
            onClick={onSystemSettingsToggle}
            title="System Settings"
          >
            <Icon icon="lucide:monitor" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
