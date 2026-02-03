import React from 'react';
import { Card, CardBody, CardTitle, Select, Input, Button, Icon } from '../../../components/ui';

interface GeneralTabProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

const modeOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'aggressive', label: 'Aggressive' },
];

export function GeneralTab({ settings, onSettingChange }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <CardTitle>Memory Mode</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Controls how aggressively Claude Pilot captures and compresses memories
          </p>
          <Select
            label="Mode"
            options={modeOptions}
            value={settings.CLAUDE_MEM_MODE || 'standard'}
            onChange={(e) => onSettingChange('CLAUDE_MEM_MODE', e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Data Directory</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Location where Claude Pilot stores its database and files
          </p>
          <Input
            label="Data Directory"
            value={settings.CLAUDE_MEM_DATA_DIR || '~/.claude-mem'}
            disabled
          />
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm">
              <Icon icon="lucide:folder-open" size={16} className="mr-2" />
              Open in File Manager
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Worker Settings</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Configure background worker behavior
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Worker Port"
              type="number"
              value={settings.CLAUDE_MEM_WORKER_PORT || '37777'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_WORKER_PORT', e.target.value)}
            />
            <Input
              label="Max Queue Size"
              type="number"
              value={settings.CLAUDE_MEM_WORKER_MAX_QUEUE || '1000'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_WORKER_MAX_QUEUE', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
