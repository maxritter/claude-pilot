import React, { useState, useEffect } from 'react';
import { Icon, Button, Tooltip } from '../../components/ui';

interface TopbarActionsProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLogs?: () => void;
}

export function TopbarActions({ theme, onToggleTheme, onToggleLogs }: TopbarActionsProps) {
  const [showLogout, setShowLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        setShowLogout(data.authRequired);
      })
      .catch(() => {
        setShowLogout(false);
      });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {onToggleLogs && (
        <Tooltip text="Toggle console logs" position="bottom">
          <Button variant="ghost" size="sm" onClick={onToggleLogs}>
            <Icon icon="lucide:terminal" size={18} />
          </Button>
        </Tooltip>
      )}
      <Tooltip text={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} position="bottom">
        <Button variant="ghost" size="sm" onClick={onToggleTheme}>
          <Icon icon={theme === 'light' ? 'lucide:moon' : 'lucide:sun'} size={18} />
        </Button>
      </Tooltip>
      <Tooltip text="Repository" position="bottom">
        <a
          href="https://github.com/maxritter/claude-pilot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
        >
          <Icon icon="lucide:git-branch" size={18} />
        </a>
      </Tooltip>
      {showLogout && (
        <Tooltip text="Logout" position="bottom">
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
            <Icon icon="lucide:log-out" size={18} />
          </Button>
        </Tooltip>
      )}
    </div>
  );
}
