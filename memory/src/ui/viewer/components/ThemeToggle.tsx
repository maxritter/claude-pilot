import React from 'react';
import { ThemePreference } from '../hooks/useTheme';
import { Icon } from './ui';

interface ThemeToggleProps {
  preference: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

export function ThemeToggle({ preference, onThemeChange }: ThemeToggleProps) {
  const cycleTheme = () => {
    const cycle: ThemePreference[] = ['system', 'light', 'dark'];
    const currentIndex = cycle.indexOf(preference);
    const nextIndex = (currentIndex + 1) % cycle.length;
    onThemeChange(cycle[nextIndex]);
  };

  const getIcon = () => {
    switch (preference) {
      case 'light':
        return <Icon icon="lucide:sun" size={18} />;
      case 'dark':
        return <Icon icon="lucide:moon" size={18} />;
      case 'system':
      default:
        return <Icon icon="lucide:monitor" size={18} />;
    }
  };

  const getTitle = () => {
    switch (preference) {
      case 'light':
        return 'Theme: Light (click for Dark)';
      case 'dark':
        return 'Theme: Dark (click for System)';
      case 'system':
      default:
        return 'Theme: System (click for Light)';
    }
  };

  return (
    <button
      className="theme-toggle-btn"
      onClick={cycleTheme}
      title={getTitle()}
      aria-label={getTitle()}
    >
      {getIcon()}
    </button>
  );
}
