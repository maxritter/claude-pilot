import React from 'react';
import { Icon, Tooltip } from '../../components/ui';

interface SidebarNavItemProps {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
  badge?: string | number;
  collapsed?: boolean;
}

export function SidebarNavItem({ icon, label, href, active = false, badge, collapsed = false }: SidebarNavItemProps) {
  const content = (
    <a
      href={href}
      className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        active ? 'active' : ''
      } ${collapsed ? 'justify-center' : ''}`}
    >
      <Icon icon={icon} size={20} />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge !== undefined && (
            <span className={`badge badge-sm ${active ? 'badge-primary-content' : 'badge-ghost'}`}>
              {badge}
            </span>
          )}
        </>
      )}
    </a>
  );

  if (collapsed) {
    return <Tooltip text={label}>{content}</Tooltip>;
  }

  return content;
}
