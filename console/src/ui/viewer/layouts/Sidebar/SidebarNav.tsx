import React from 'react';
import { SidebarNavItem } from './SidebarNavItem';

interface SidebarNavProps {
  currentPath: string;
  collapsed?: boolean;
}

const navItems = [
  { icon: 'lucide:layout-dashboard', label: 'Dashboard', href: '#/' },
  { icon: 'lucide:scroll', label: 'Specification', href: '#/spec' },
  { icon: 'lucide:brain', label: 'Memories', href: '#/memories' },
  { icon: 'lucide:history', label: 'Sessions', href: '#/sessions' },
  { icon: 'lucide:bar-chart-3', label: 'Usage', href: '#/usage' },
  { icon: 'lucide:archive', label: 'Vault', href: '#/vault' },
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
