import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  variant?: 'bordered' | 'lifted' | 'boxed';
}

const variantClasses = {
  bordered: 'tabs-bordered',
  lifted: 'tabs-lifted',
  boxed: 'tabs-boxed',
};

export function Tabs({ tabs, activeTab, onTabChange, variant = 'bordered' }: TabsProps) {
  return (
    <div role="tablist" className={`tabs ${variantClasses[variant]}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
