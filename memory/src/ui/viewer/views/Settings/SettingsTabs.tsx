import React from 'react';
import { Tabs, Icon } from '../../components/ui';

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'general', label: 'General', icon: <Icon icon="lucide:settings" size={16} /> },
  { id: 'provider', label: 'Provider', icon: <Icon icon="lucide:cpu" size={16} /> },
  { id: 'context', label: 'Context', icon: <Icon icon="lucide:layers" size={16} /> },
  { id: 'vectordb', label: 'Vector DB', icon: <Icon icon="lucide:database" size={16} /> },
  { id: 'backup', label: 'Backup', icon: <Icon icon="lucide:archive" size={16} /> },
  { id: 'advanced', label: 'Advanced', icon: <Icon icon="lucide:wrench" size={16} /> },
];

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return <Tabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} variant="boxed" />;
}
