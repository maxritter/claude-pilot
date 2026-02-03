import React from 'react';
import { TopbarSearch } from './TopbarSearch';
import { TopbarActions } from './TopbarActions';
import { TopbarStatus } from './TopbarStatus';

interface TopbarProps {
  onSearch: (query: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLogs?: () => void;
  isProcessing?: boolean;
  lastProcessed?: string;
}

export function Topbar({ onSearch, theme, onToggleTheme, onToggleLogs, isProcessing = false, lastProcessed }: TopbarProps) {
  return (
    <header className="h-16 bg-base-100 border-b border-base-300 flex items-center justify-between px-6 gap-4">
      <TopbarSearch onSearch={onSearch} />
      <TopbarStatus isProcessing={isProcessing} lastProcessed={lastProcessed} />
      <TopbarActions theme={theme} onToggleTheme={onToggleTheme} onToggleLogs={onToggleLogs} />
    </header>
  );
}
