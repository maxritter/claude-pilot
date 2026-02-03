/**
 * Keyboard shortcuts configuration
 * Central location for all shortcut definitions
 */

export interface Shortcut {
  key: string;
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[];
  description: string;
  action: string;
}

export interface SequenceShortcut {
  sequence: string[];
  description: string;
  action: string;
}

// Single-key shortcuts with modifiers
export const SHORTCUTS: Record<string, Shortcut> = {
  COMMAND_PALETTE: {
    key: 'k',
    modifiers: ['ctrl', 'meta'],
    description: 'Open command palette',
    action: 'openCommandPalette',
  },
  SEARCH: {
    key: '/',
    modifiers: ['ctrl', 'meta'],
    description: 'Focus search',
    action: 'focusSearch',
  },
  ESCAPE: {
    key: 'Escape',
    description: 'Close modal/palette',
    action: 'escape',
  },
  TOGGLE_THEME: {
    key: 't',
    modifiers: ['ctrl', 'meta'],
    description: 'Toggle theme',
    action: 'toggleTheme',
  },
  TOGGLE_SIDEBAR: {
    key: 'b',
    modifiers: ['ctrl', 'meta'],
    description: 'Toggle sidebar',
    action: 'toggleSidebar',
  },
} as const;

// Sequence shortcuts (g then d, etc.)
export const SEQUENCE_SHORTCUTS: SequenceShortcut[] = [
  { sequence: ['g', 'd'], description: 'Go to Dashboard', action: 'navigate:/' },
  { sequence: ['g', 'm'], description: 'Go to Memories', action: 'navigate:/memories' },
  { sequence: ['g', 'l'], description: 'Go to Live', action: 'navigate:/live' },
  { sequence: ['g', 's'], description: 'Go to Settings', action: 'navigate:/settings' },
  { sequence: ['g', 'r'], description: 'Go to Search', action: 'navigate:/search' },
];

// Command palette commands
export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: 'navigation' | 'action' | 'theme' | 'project';
  action: () => void;
}

export function getShortcutDisplay(shortcut: Shortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const parts: string[] = [];

  if (shortcut.modifiers?.includes('ctrl') || shortcut.modifiers?.includes('meta')) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.modifiers?.includes('shift')) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.modifiers?.includes('alt')) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  parts.push(shortcut.key.toUpperCase());
  return parts.join(isMac ? '' : '+');
}
