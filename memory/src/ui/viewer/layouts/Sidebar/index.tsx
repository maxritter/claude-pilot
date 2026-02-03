import React from 'react';
import { SidebarLogo } from './SidebarLogo';
import { SidebarNav } from './SidebarNav';
import { SidebarProjects } from './SidebarProjects';
import { SidebarFooter } from './SidebarFooter';
import { Icon } from '../../components/ui';

interface Project {
  name: string;
  observationCount: number;
}

interface SidebarProps {
  currentPath: string;
  projects: Project[];
  selectedProject: string | null;
  onSelectProject: (name: string | null) => void;
  workerStatus: 'online' | 'offline' | 'processing';
  queueDepth?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  currentPath,
  projects,
  selectedProject,
  onSelectProject,
  workerStatus,
  queueDepth,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={`dashboard-sidebar flex flex-col border-r border-base-300 transition-all duration-300 h-screen sticky top-0 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Logo with collapse button - fixed height */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-base-300/50">
        {!collapsed && <SidebarLogo />}
        <button
          onClick={onToggleCollapse}
          className="btn btn-ghost btn-sm btn-square"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon icon={collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'} size={18} />
        </button>
      </div>

      {/* Navigation - fixed height */}
      <div className="flex-shrink-0">
        <SidebarNav currentPath={currentPath} collapsed={collapsed} />
      </div>

      {/* Projects - scrollable, takes remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <SidebarProjects
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={onSelectProject}
          />
        )}
      </div>

      {/* Footer - fixed at bottom */}
      <div className="flex-shrink-0">
        <SidebarFooter workerStatus={workerStatus} queueDepth={queueDepth} collapsed={collapsed} />
      </div>
    </aside>
  );
}
