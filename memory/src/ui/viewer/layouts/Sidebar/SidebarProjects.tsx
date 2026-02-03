import React from 'react';
import { Icon } from '../../components/ui';

interface Project {
  name: string;
  observationCount: number;
}

interface SidebarProjectsProps {
  projects: Project[];
  selectedProject: string | null;
  onSelectProject: (name: string | null) => void;
}

export function SidebarProjects({ projects, selectedProject, onSelectProject }: SidebarProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
        Projects
      </div>
      <div className="space-y-1">
        <button
          onClick={() => onSelectProject(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedProject === null ? 'bg-base-300' : 'hover:bg-base-200'
          }`}
        >
          <Icon icon="lucide:layers" size={16} />
          <span className="flex-1 text-left">All Projects</span>
        </button>
        {projects.map((project) => (
          <button
            key={project.name}
            onClick={() => onSelectProject(project.name)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedProject === project.name ? 'bg-base-300' : 'hover:bg-base-200'
            }`}
          >
            <Icon icon="lucide:folder" size={16} />
            <span className="flex-1 text-left truncate">{project.name}</span>
            {project.observationCount > 0 && (
              <span className="badge badge-ghost badge-xs">{project.observationCount}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
