import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './ui';
import { SHORTCUTS, getShortcutDisplay, type Command } from '../constants/shortcuts';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  projects: { name: string }[];
  onSelectProject: (project: string | null) => void;
}

type CommandCategory = 'navigation' | 'action' | 'theme' | 'project';

interface InternalCommand {
  id: string;
  label: string;
  shortcut?: string;
  category: CommandCategory;
  icon: string;
  action: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onToggleTheme,
  onToggleSidebar,
  projects,
  onSelectProject,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command list
  const commands = useMemo<InternalCommand[]>(() => {
    const cmds: InternalCommand[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        shortcut: 'G D',
        category: 'navigation',
        icon: 'lucide:layout-dashboard',
        action: () => onNavigate('/'),
      },
      {
        id: 'nav-memories',
        label: 'Go to Memories',
        shortcut: 'G M',
        category: 'navigation',
        icon: 'lucide:brain',
        action: () => onNavigate('/memories'),
      },
      {
        id: 'nav-live',
        label: 'Go to Live View',
        shortcut: 'G L',
        category: 'navigation',
        icon: 'lucide:radio',
        action: () => onNavigate('/live'),
      },
      {
        id: 'nav-search',
        label: 'Go to Search',
        shortcut: 'G R',
        category: 'navigation',
        icon: 'lucide:search',
        action: () => onNavigate('/search'),
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        shortcut: 'G S',
        category: 'navigation',
        icon: 'lucide:settings',
        action: () => onNavigate('/settings'),
      },
      // Actions
      {
        id: 'action-theme',
        label: 'Toggle Theme',
        shortcut: getShortcutDisplay(SHORTCUTS.TOGGLE_THEME),
        category: 'action',
        icon: 'lucide:sun-moon',
        action: onToggleTheme,
      },
      {
        id: 'action-sidebar',
        label: 'Toggle Sidebar',
        shortcut: getShortcutDisplay(SHORTCUTS.TOGGLE_SIDEBAR),
        category: 'action',
        icon: 'lucide:panel-left',
        action: onToggleSidebar,
      },
      // Projects
      {
        id: 'project-all',
        label: 'All Projects',
        category: 'project',
        icon: 'lucide:folder',
        action: () => onSelectProject(null),
      },
      ...projects.map((p) => ({
        id: `project-${p.name}`,
        label: p.name,
        category: 'project' as CommandCategory,
        icon: 'lucide:folder-open',
        action: () => onSelectProject(p.name),
      })),
    ];
    return cmds;
  }, [onNavigate, onToggleTheme, onToggleSidebar, projects, onSelectProject]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeCommand = (cmd: InternalCommand) => {
    cmd.action();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!open) return null;

  // Group commands by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, InternalCommand[]>
  );

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    action: 'Actions',
    theme: 'Theme',
    project: 'Projects',
  };

  let flatIndex = 0;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xl p-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 p-3 border-b border-base-300">
          <Icon icon="lucide:search" size={18} className="text-base-content/50" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-base"
          />
          <kbd className="kbd kbd-sm">ESC</kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">No commands found</div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="text-xs font-medium text-base-content/50 px-2 py-1 mt-2 first:mt-0">
                  {categoryLabels[category] || category}
                </div>
                {cmds.map((cmd) => {
                  const isSelected = flatIndex === selectedIndex;
                  const currentIndex = flatIndex;
                  flatIndex++;
                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected ? 'bg-primary text-primary-content' : 'hover:bg-base-200'
                      }`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      <Icon
                        icon={cmd.icon}
                        size={16}
                        className={isSelected ? 'text-primary-content' : 'text-base-content/60'}
                      />
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd
                          className={`kbd kbd-sm ${isSelected ? 'bg-primary-content/20 text-primary-content' : ''}`}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-base-300 px-3 py-2 text-xs text-base-content/50 flex gap-4">
          <span>
            <kbd className="kbd kbd-xs">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="kbd kbd-xs">↵</kbd> Select
          </span>
          <span>
            <kbd className="kbd kbd-xs">ESC</kbd> Close
          </span>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
