import React, { useState } from 'react';
import {
  MODEL_CHOICES_FULL,
  MODEL_CHOICES_AGENT,
  DEFAULT_SETTINGS,
  useSettings,
} from '../../hooks/useSettings.js';
import { ModelSelect } from './ModelSelect.js';

// Source: https://www.anthropic.com/pricing

const COMMAND_LABELS: Record<string, string> = {
  spec: '/spec (dispatcher)',
  'spec-plan': '/spec planning phase',
  'spec-implement': '/spec implementation phase',
  'spec-verify': '/spec verification phase',
  vault: '/vault',
  sync: '/sync',
  learn: '/learn',
};

const AGENT_LABELS: Record<string, string> = {
  'plan-challenger': 'plan-challenger (adversarial reviewer)',
  'plan-verifier': 'plan-verifier (alignment checker)',
  'spec-reviewer-compliance': 'spec-reviewer-compliance (code vs plan)',
  'spec-reviewer-quality': 'spec-reviewer-quality (code review)',
};

export function SettingsView() {
  const { settings, isLoading, error, isDirty, saved, updateModel, updateCommand, updateAgent, save } =
    useSettings();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await save();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card bg-base-200 animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-base-300 rounded w-32 mb-4" />
                <div className="h-8 bg-base-300 rounded w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="alert alert-error">
          <span>Failed to load settings: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-base-content/60">Configure model selection for Claude Pilot</p>
      </div>

      {/* 1M context warning */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm">
          <span className="font-semibold">Sonnet 4.6 1M and Opus 4.6 1M</span> require a compatible Anthropic subscription with 1M context access.
          Not all users have access. These variants are only available for the main session and commands — never for sub-agents.
        </div>
      </div>

      {/* Restart notice */}
      {saved && (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Settings saved. <strong>Restart Pilot</strong> to apply changes.</span>
        </div>
      )}

      {saveError && (
        <div className="alert alert-error">
          <span>{saveError}</span>
        </div>
      )}

      {/* Section 1: Main Model (Quick Mode) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-base">Main Model</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Used for Quick Mode (direct chat). Changing this also sets the baseline for new commands without explicit config.
          </p>
          <div className="flex items-center gap-4">
            <ModelSelect
              value={settings.model}
              choices={MODEL_CHOICES_FULL}
              onChange={updateModel}
              id="main-model"
            />
            <div className="text-xs text-base-content/50">
              {settings.model.includes('[1m]') ? '1M context' : '200K context'}
              {settings.model.startsWith('opus') ? ' · ~1.67× cost of Sonnet' : ''}
            </div>
          </div>

          {/* Cost/performance context */}
          <div className="mt-4 p-3 bg-base-100 rounded-lg">
            <p className="text-xs font-semibold text-base-content/70 mb-2">Model comparison</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-base-content/60">
              <div>
                <span className="font-mono text-primary">Sonnet 4.6</span>
                <div>$3/$15 per MTok · Fast, near Opus quality</div>
                <div className="text-base-content/40">Best for implementation & most tasks</div>
              </div>
              <div>
                <span className="font-mono text-secondary">Opus 4.6</span>
                <div>$5/$25 per MTok · Deepest reasoning</div>
                <div className="text-base-content/40">Best for planning & complex analysis</div>
              </div>
            </div>
            <p className="text-xs text-base-content/40 mt-2">
              Sonnet 4.6 often matches Opus quality. Default routing uses Opus only for planning & verification.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Commands */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-base">Commands</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Model used when each slash command is invoked. Defaults use Opus for planning/verification, Sonnet for execution.
          </p>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Model</th>
                  <th className="text-base-content/50">Context</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(DEFAULT_SETTINGS.commands).map((cmd) => (
                  <tr key={cmd}>
                    <td>
                      <span className="font-mono text-sm">{COMMAND_LABELS[cmd] ?? cmd}</span>
                    </td>
                    <td>
                      <ModelSelect
                        value={settings.commands[cmd] ?? DEFAULT_SETTINGS.commands[cmd]}
                        choices={MODEL_CHOICES_FULL}
                        onChange={(model) => updateCommand(cmd, model)}
                        id={`cmd-${cmd}`}
                      />
                    </td>
                    <td className="text-xs text-base-content/40">
                      {(settings.commands[cmd] ?? '').includes('[1m]') ? '1M' : '200K'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: Sub-Agents */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-base">Sub-Agents</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Models used by verification sub-agents spawned during <code className="bg-base-300 px-1 rounded">/spec</code>. Limited to Sonnet or Opus — 1M context is not available for sub-agents.
          </p>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Model</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(DEFAULT_SETTINGS.agents).map((agent) => (
                  <tr key={agent}>
                    <td>
                      <span className="font-mono text-sm">{AGENT_LABELS[agent] ?? agent}</span>
                    </td>
                    <td>
                      <ModelSelect
                        value={settings.agents[agent] ?? DEFAULT_SETTINGS.agents[agent]}
                        choices={MODEL_CHOICES_AGENT}
                        onChange={(model) => updateAgent(agent, model)}
                        id={`agent-${agent}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4 pb-4">
        <button
          className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
          onClick={handleSave}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {isDirty && !saved && (
          <span className="text-sm text-base-content/50">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
