import { useState, useCallback } from 'react';
import { DashboardLayout } from './layouts';
import { Router, useRouter } from './router';
import { DashboardView, MemoriesView, SessionsView, SettingsView, SpecView, UsageView, VaultView } from './views';
import { LogsDrawer } from './components/LogsModal';
import { CommandPalette } from './components/CommandPalette';
import { LicenseGate } from './components/LicenseGate';
import { useTheme } from './hooks/useTheme';
import { useStats } from './hooks/useStats';
import { useHotkeys } from './hooks/useHotkeys';
import { useLicense } from './hooks/useLicense';
import { ToastProvider, ProjectProvider } from './context';

const routes = [
  { path: '/', component: DashboardView },
  { path: '/spec', component: SpecView },
  { path: '/memories', component: MemoriesView },
  { path: '/memories/:type', component: MemoriesView },
  { path: '/sessions', component: SessionsView },
  { path: '/usage', component: UsageView },
  { path: '/vault', component: VaultView },
  { path: '/settings', component: SettingsView },
];

const SIDEBAR_COLLAPSED_KEY = 'pilot-memory-sidebar-collapsed';

export function App() {
  const { path, navigate } = useRouter();
  const { resolvedTheme, setThemePreference } = useTheme();
  const { workerStatus } = useStats();
  const { license, isLoading: licenseLoading, refetch: refetchLicense } = useLicense();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile) return true;
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showLogs, setShowLogs] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

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
    setShowLogs((prev) => !prev);
  }, []);

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

  const isLicenseValid = !licenseLoading && license?.valid === true && !license.isExpired;

  if (licenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200" data-theme={resolvedTheme === 'dark' ? 'claude-pilot' : 'claude-pilot-light'}>
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!isLicenseValid) {
    return (
      <div data-theme={resolvedTheme === 'dark' ? 'claude-pilot' : 'claude-pilot-light'}>
        <LicenseGate license={license} onActivated={refetchLicense} />
      </div>
    );
  }

  return (
    <ProjectProvider>
    <ToastProvider>
      <DashboardLayout
        currentPath={`#${path}`}
        workerStatus={workerStatus.status}
        version={workerStatus.version}
        queueDepth={workerStatus.queueDepth}
        theme={resolvedTheme as 'light' | 'dark'}
        onToggleTheme={handleToggleTheme}
        onToggleLogs={handleToggleLogs}
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
      />
    </ToastProvider>
    </ProjectProvider>
  );
}
