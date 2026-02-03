import React from 'react';
import { Card, CardBody, CardTitle, Input, Toggle } from '../../../components/ui';

interface ContextTabProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

export function ContextTab({ settings, onSettingChange }: ContextTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <CardTitle>Context Limits</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Control how much context is injected into sessions
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Observations"
              type="number"
              value={settings.CLAUDE_MEM_CONTEXT_MAX_OBSERVATIONS || '50'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_MAX_OBSERVATIONS', e.target.value)}
            />
            <Input
              label="Max Tokens"
              type="number"
              value={settings.CLAUDE_MEM_CONTEXT_MAX_TOKENS || '8000'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_MAX_TOKENS', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Context Types</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Enable or disable specific context types
          </p>
          <div className="space-y-3">
            <Toggle
              label="Include Observations"
              checked={settings.CLAUDE_MEM_CONTEXT_INCLUDE_OBSERVATIONS !== false}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_INCLUDE_OBSERVATIONS', e.target.checked)}
            />
            <Toggle
              label="Include Summaries"
              checked={settings.CLAUDE_MEM_CONTEXT_INCLUDE_SUMMARIES !== false}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_INCLUDE_SUMMARIES', e.target.checked)}
            />
            <Toggle
              label="Include Prompts"
              checked={settings.CLAUDE_MEM_CONTEXT_INCLUDE_PROMPTS !== false}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_INCLUDE_PROMPTS', e.target.checked)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Recency Settings</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Control how recent context is prioritized
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Recent Days Weight"
              type="number"
              value={settings.CLAUDE_MEM_CONTEXT_RECENT_DAYS || '7'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_RECENT_DAYS', e.target.value)}
            />
            <Input
              label="Recency Boost Factor"
              type="number"
              step="0.1"
              value={settings.CLAUDE_MEM_CONTEXT_RECENCY_BOOST || '1.5'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_RECENCY_BOOST', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Semantic Search</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Configure semantic search for context retrieval
          </p>
          <div className="space-y-4">
            <Toggle
              label="Enable Semantic Search"
              checked={settings.CLAUDE_MEM_CONTEXT_USE_SEMANTIC !== false}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_USE_SEMANTIC', e.target.checked)}
            />
            <Input
              label="Semantic Weight"
              type="number"
              step="0.1"
              value={settings.CLAUDE_MEM_CONTEXT_SEMANTIC_WEIGHT || '0.6'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_SEMANTIC_WEIGHT', e.target.value)}
            />
            <Input
              label="Min Similarity Score"
              type="number"
              step="0.1"
              value={settings.CLAUDE_MEM_CONTEXT_MIN_SIMILARITY || '0.3'}
              onChange={(e) => onSettingChange('CLAUDE_MEM_CONTEXT_MIN_SIMILARITY', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
