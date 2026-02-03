import React, { useState, useEffect, useCallback } from 'react';
import { SettingsTabs } from './SettingsTabs';
import { GeneralTab } from './tabs/GeneralTab';
import { ProviderTab } from './tabs/ProviderTab';
import { ContextTab } from './tabs/ContextTab';
import { VectorDbTab } from './tabs/VectorDbTab';
import { AdvancedTab } from './tabs/AdvancedTab';
import { BackupTab } from './tabs/BackupTab';
import { Button, Icon, Spinner } from '../../components/ui';
import { useToast } from '../../context';

interface SettingsViewProps {
  tab?: string;
}

export function SettingsView({ tab: initialTab }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab || 'general');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const toast = useToast();

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error('Failed to save');
      }
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    fetchSettings();
    setHasChanges(false);
    toast.info('Settings reset to last saved values');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const renderTab = () => {
    const props = { settings, onSettingChange: handleSettingChange };
    switch (activeTab) {
      case 'general':
        return <GeneralTab {...props} />;
      case 'provider':
        return <ProviderTab {...props} />;
      case 'context':
        return <ContextTab {...props} />;
      case 'vectordb':
        return <VectorDbTab {...props} />;
      case 'backup':
        return <BackupTab {...props} />;
      case 'advanced':
        return <AdvancedTab {...props} />;
      default:
        return <GeneralTab {...props} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-base-content/60">Configure your Claude Pilot memory instance</p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleReset}>
              <Icon icon="lucide:undo" size={16} className="mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              <Icon icon="lucide:save" size={16} className="mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">{renderTab()}</div>
    </div>
  );
}
