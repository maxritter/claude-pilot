import React from 'react';
import { useSettings, MODEL_DISPLAY_NAMES, DEFAULT_SETTINGS } from '../../hooks/useSettings.js';

export function ModelRoutingInfo() {
  const { settings, isLoading } = useSettings();

  const cfg = isLoading ? DEFAULT_SETTINGS : settings;

  const d = (model: string) => MODEL_DISPLAY_NAMES[model] ?? model;

  const planModel = d(cfg.commands?.['spec-plan'] ?? DEFAULT_SETTINGS.commands['spec-plan']);
  const implModel = d(cfg.commands?.['spec-implement'] ?? DEFAULT_SETTINGS.commands['spec-implement']);
  const verifyModel = d(cfg.commands?.['spec-verify'] ?? DEFAULT_SETTINGS.commands['spec-verify']);
  const qualityAgentModel = d(cfg.agents?.['spec-reviewer-quality'] ?? DEFAULT_SETTINGS.agents['spec-reviewer-quality']);
  const complianceAgentModel = d(cfg.agents?.['spec-reviewer-compliance'] ?? DEFAULT_SETTINGS.agents['spec-reviewer-compliance']);
  const mainModel = d(cfg.model ?? DEFAULT_SETTINGS.model);

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-lg font-bold">Model Routing</h2>
          <a href="#/settings" className="text-xs text-primary hover:underline">Configure in Settings →</a>
        </div>
        <div className="space-y-6">
          {/* Model Routing Table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">
              /spec Routing Strategy
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>/spec Phase</th>
                    <th>Orchestrator</th>
                    <th>Review Agents</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Planning</td>
                    <td className="font-mono text-primary">{planModel}</td>
                    <td className="font-mono text-secondary">{complianceAgentModel}</td>
                  </tr>
                  <tr>
                    <td>Implementation</td>
                    <td className="font-mono text-secondary">{implModel}</td>
                    <td className="text-base-content/40">&mdash;</td>
                  </tr>
                  <tr>
                    <td>Verification</td>
                    <td className="font-mono text-primary">{verifyModel}</td>
                    <td className="font-mono text-secondary">
                      {complianceAgentModel} + <span className="text-primary">{qualityAgentModel}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-base-content/70 mt-2">
              Quick Mode uses <span className="font-mono">{mainModel}</span>.
              Routing defaults use Opus for planning and verification orchestration, Sonnet for implementation.
            </p>
          </div>

          {/* Quick Mode Tip */}
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">
              In quick mode, use <code className="bg-base-300 px-1 rounded">/model</code> in Claude Code to temporarily switch models.
              Permanent changes can be configured in <a href="#/settings" className="underline">Settings</a>.
            </span>
          </div>

          {/* Subscription Tiers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">Subscription Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
                target="_blank"
                rel="noopener noreferrer"
                className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="card-body p-4">
                  <h4 className="card-title text-base">Max 5x</h4>
                  <p className="text-sm text-base-content/70">Moderate solo usage</p>
                </div>
              </a>

              <a
                href="https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
                target="_blank"
                rel="noopener noreferrer"
                className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="card-body p-4">
                  <h4 className="card-title text-base">Max 20x</h4>
                  <p className="text-sm text-base-content/70">Heavy solo usage</p>
                </div>
              </a>

              <a
                href="https://support.claude.com/en/articles/9266767-what-is-the-team-plan"
                target="_blank"
                rel="noopener noreferrer"
                className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="card-body p-4">
                  <h4 className="card-title text-base">Team Premium</h4>
                  <p className="text-sm text-base-content/70">6.25x/member + SSO/admin</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
