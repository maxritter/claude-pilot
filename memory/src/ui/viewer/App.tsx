import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from './layouts';
import { Router, useRouter } from './router';
import { DashboardView, MemoriesView, SearchView, SettingsView, LiveView, SessionsView, TagsView } from './views';
import { LogsDrawer } from './components/LogsModal';
import { CommandPalette } from './components/CommandPalette';
import { useTheme } from './hooks/useTheme';
import { useStats } from './hooks/useStats';
import { useHotkeys } from './hooks/useHotkeys';
import { ToastProvider } from './context';

const routes = [
  { path: '/', component: DashboardView },
  { path: '/memories', component: MemoriesView },
  { path: '/memories/:type', component: MemoriesView },
  { path: '/sessions', component: SessionsView },
  { path: '/search', component: SearchView },
  { path: '/tags', component: TagsView },
  { path: '/live', component: LiveView },
  { path: '/settings', component: SettingsView },
  { path: '/settings/:tab', component: SettingsView },
];

const SIDEBAR_COLLAPSED_KEY = 'claude-mem-sidebar-collapsed';
const LOGS_OPEN_KEY = 'claude-mem-logs-open';

export function App() {
  const { path, navigate } = useRouter();
  const { resolvedTheme, setThemePreference } = useTheme();
  const { stats, workerStatus, isLoading } = useStats();

  const [projects, setProjects] = useState<{ name: string; observationCount: number }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Default to collapsed on mobile (< 1024px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile) return true;
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showLogs, setShowLogs] = useState(() => {
    try {
      return localStorage.getItem(LOGS_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Fetch projects (without individual counts for performance)
  useEffect(() => {
    async function fetchProjects() {
      try {
        const projectsRes = await fetch('/api/projects');
        const projectsData = await projectsRes.json();
        const projectNames = (projectsData.projects || [])
          .filter((p: string) => p && p.trim() && !p.startsWith('.') && !p.startsWith('-'))
          .slice(0, 30);

        // Just use the project names without counts
        setProjects(projectNames.map((name: string) => ({ name, observationCount: 0 })));
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    }

    fetchProjects();
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    },
    [navigate]
  );

  const handleSelectProject = useCallback(
    (projectName: string | null) => {
      setSelectedProject(projectName);
      // Navigate to memories with project filter
      if (projectName) {
        navigate(`/memories?project=${encodeURIComponent(projectName)}`);
      } else {
        navigate('/memories');
      }
    },
    [navigate]
  );

  const handleToggleTheme = useCallback(() => {
    setThemePreference(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setThemePreference]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      } catch {}
      return newValue;
    });
  }, []);

  const handleToggleLogs = useCallback(() => {
    setShowLogs((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(LOGS_OPEN_KEY, String(newValue));
      } catch {}
      return newValue;
    });
  }, []);

  // Keyboard shortcuts handler
  const handleShortcut = useCallback(
    (action: string) => {
      if (action === 'openCommandPalette') {
        setShowCommandPalette(true);
      } else if (action === 'escape') {
        setShowCommandPalette(false);
        setShowLogs(false);
      } else if (action === 'toggleTheme') {
        setThemePreference(resolvedTheme === 'light' ? 'dark' : 'light');
      } else if (action === 'toggleSidebar') {
        handleToggleSidebar();
      } else if (action === 'focusSearch') {
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      } else if (action.startsWith('navigate:')) {
        navigate(action.replace('navigate:', ''));
      }
    },
    [resolvedTheme, setThemePreference, navigate, handleToggleSidebar]
  );

  useHotkeys(handleShortcut);

  return (
    <ToastProvider>
      <DashboardLayout
        currentPath={`#${path}`}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        workerStatus={workerStatus.status}
        queueDepth={workerStatus.queueDepth}
        onSearch={handleSearch}
        theme={resolvedTheme as 'light' | 'dark'}
        onToggleTheme={handleToggleTheme}
        onToggleLogs={handleToggleLogs}
        isProcessing={workerStatus.status === 'processing'}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      >
        <Router routes={routes} />
      </DashboardLayout>
      <LogsDrawer isOpen={showLogs} onClose={() => setShowLogs(false)} />
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={navigate}
        onToggleTheme={handleToggleTheme}
        onToggleSidebar={handleToggleSidebar}
        projects={projects}
        onSelectProject={handleSelectProject}
      />
    </ToastProvider>
  );
}
