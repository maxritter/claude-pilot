import React from 'react';
import { SidebarNavItem } from './SidebarNavItem';

interface SidebarNavProps {
  currentPath: string;
  collapsed?: boolean;
}

const navItems = [
  { icon: 'lucide:layout-dashboard', label: 'Dashboard', href: '#/' },
  { icon: 'lucide:brain', label: 'Memories', href: '#/memories' },
  { icon: 'lucide:history', label: 'Sessions', href: '#/sessions' },
  { icon: 'lucide:search', label: 'Search', href: '#/search' },
  { icon: 'lucide:tags', label: 'Tags', href: '#/tags' },
  { icon: 'lucide:activity', label: 'Live', href: '#/live' },
  { icon: 'lucide:settings', label: 'Settings', href: '#/settings' },
];

export function SidebarNav({ currentPath, collapsed = false }: SidebarNavProps) {
  return (
    <nav className="py-4 space-y-1 px-2">
      {navItems.map((item) => (
        <SidebarNavItem
          key={item.href}
          icon={item.icon}
          label={item.label}
          href={item.href}
          active={currentPath === item.href || currentPath.startsWith(item.href + '/')}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}
