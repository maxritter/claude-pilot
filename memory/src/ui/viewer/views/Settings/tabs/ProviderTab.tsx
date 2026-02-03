import React, { useState } from 'react';
import { Card, CardBody, CardTitle, Select, Input, Toggle, Badge, Icon, Button } from '../../../components/ui';

interface ProviderTabProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

const providerOptions = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'mistral', label: 'Mistral AI' },
];

interface ApiKeyInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ApiKeyInput({ label, placeholder, value, onChange }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      <div className="flex gap-2">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="input input-bordered w-full flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKey(!showKey)}
          className="btn-square"
        >
          <Icon icon={showKey ? 'lucide:eye-off' : 'lucide:eye'} size={18} />
        </Button>
      </div>
      {value && (
        <label className="label">
          <span className="label-text-alt text-success">Key configured ({value.length} chars)</span>
        </label>
      )}
    </div>
  );
}

export function ProviderTab({ settings, onSettingChange }: ProviderTabProps) {
  const currentProvider = settings.CLAUDE_MEM_PROVIDER || 'anthropic';

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <CardTitle>AI Provider</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Select which AI provider to use for memory compression
          </p>
          <Select
            label="Provider"
            options={providerOptions}
            value={currentProvider}
            onChange={(e) => onSettingChange('CLAUDE_MEM_PROVIDER', e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Anthropic</CardTitle>
            {currentProvider === 'anthropic' && <Badge variant="success">Active</Badge>}
          </div>
          <div className="space-y-4">
            <ApiKeyInput
              label="API Key"
              placeholder="sk-ant-..."
              value={settings.CLAUDE_MEM_ANTHROPIC_API_KEY || ''}
              onChange={(e) => onSettingChange('CLAUDE_MEM_ANTHROPIC_API_KEY', e.target.value)}
            />
            <Input
              label="Model"
              placeholder="claude-sonnet-4-20250514"
              value={settings.CLAUDE_MEM_MODEL || 'claude-sonnet-4-20250514'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_MODEL', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>OpenRouter</CardTitle>
            {currentProvider === 'openrouter' && <Badge variant="success">Active</Badge>}
          </div>
          <div className="space-y-4">
            <ApiKeyInput
              label="API Key"
              placeholder="sk-or-..."
              value={settings.CLAUDE_MEM_OPENROUTER_API_KEY || ''}
              onChange={(e) => onSettingChange('CLAUDE_MEM_OPENROUTER_API_KEY', e.target.value)}
            />
            <Input
              label="Model"
              placeholder="anthropic/claude-sonnet-4"
              value={settings.CLAUDE_MEM_OPENROUTER_MODEL || ''}
              onChange={(e) => onSettingChange('CLAUDE_MEM_OPENROUTER_MODEL', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Google Gemini</CardTitle>
            {currentProvider === 'gemini' && <Badge variant="success">Active</Badge>}
          </div>
          <div className="space-y-4">
            <ApiKeyInput
              label="API Key"
              placeholder="AIza..."
              value={settings.CLAUDE_MEM_GEMINI_API_KEY || ''}
              onChange={(e) => onSettingChange('CLAUDE_MEM_GEMINI_API_KEY', e.target.value)}
            />
            <Input
              label="Model"
              placeholder="gemini-2.0-flash"
              value={settings.CLAUDE_MEM_GEMINI_MODEL || 'gemini-2.0-flash'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_GEMINI_MODEL', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Mistral AI</CardTitle>
            {currentProvider === 'mistral' && <Badge variant="success">Active</Badge>}
          </div>
          <div className="space-y-4">
            <ApiKeyInput
              label="API Key"
              placeholder="Your Mistral API key"
              value={settings.CLAUDE_MEM_MISTRAL_API_KEY || ''}
              onChange={(e) => onSettingChange('CLAUDE_MEM_MISTRAL_API_KEY', e.target.value)}
            />
            <Input
              label="Model"
              placeholder="mistral-small-latest"
              value={settings.CLAUDE_MEM_MISTRAL_MODEL || 'mistral-small-latest'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_MISTRAL_MODEL', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
