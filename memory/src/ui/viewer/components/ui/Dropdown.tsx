import React from 'react';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
}

export function Dropdown({ trigger, items, align = 'end' }: DropdownProps) {
  return (
    <div className={`dropdown ${align === 'end' ? 'dropdown-end' : ''}`}>
      <div tabIndex={0} role="button">
        {trigger}
      </div>
      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow-lg border border-base-200">
        {items.map((item, i) => (
          <li key={i}>
            <button onClick={item.onClick} disabled={item.disabled} className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
