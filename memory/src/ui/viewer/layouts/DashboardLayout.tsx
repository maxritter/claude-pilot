import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface Project {
  name: string;
  observationCount: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  projects: Project[];
  selectedProject: string | null;
  onSelectProject: (name: string | null) => void;
  workerStatus: 'online' | 'offline' | 'processing';
  queueDepth?: number;
  onSearch: (query: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLogs?: () => void;
  isProcessing?: boolean;
  lastProcessed?: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function DashboardLayout({
  children,
  currentPath,
  projects,
  selectedProject,
  onSelectProject,
  workerStatus,
  queueDepth,
  onSearch,
  theme,
  onToggleTheme,
  onToggleLogs,
  isProcessing,
  lastProcessed,
  sidebarCollapsed,
  onToggleSidebar,
}: DashboardLayoutProps) {
  const themeName = theme === 'dark' ? 'claude-pilot' : 'claude-pilot-light';

  return (
    <div className="dashboard-layout flex min-h-screen" data-theme={themeName}>
      <Sidebar
        currentPath={currentPath}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={onSelectProject}
        workerStatus={workerStatus}
        queueDepth={queueDepth}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onSearch={onSearch}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onToggleLogs={onToggleLogs}
          isProcessing={isProcessing}
          lastProcessed={lastProcessed}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
