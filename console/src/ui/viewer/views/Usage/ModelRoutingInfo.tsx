export function ModelRoutingInfo() {
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="text-lg font-bold mb-2">Model Routing & Subscriptions</h2>
        <div className="space-y-6">
          {/* Model Routing Table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">Routing Strategy</h3>
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
                    <td className="font-mono text-primary">Opus 4.6</td>
                    <td className="font-mono text-secondary">Sonnet 4.5</td>
                  </tr>
                  <tr>
                    <td>Implementation</td>
                    <td className="font-mono text-secondary">Sonnet 4.5</td>
                    <td className="text-base-content/40">&mdash;</td>
                  </tr>
                  <tr>
                    <td>Verification</td>
                    <td className="font-mono text-primary">Opus 4.6</td>
                    <td className="font-mono text-secondary">Sonnet 4.5 + <span className="text-primary">Opus 4.6</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-base-content/70 mt-2">
              Opus handles planning and verification orchestration. Sonnet handles implementation and most review agents to reduce costs.
            </p>
          </div>

          {/* Quick Mode Tip */}
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">
              In quick mode, use <code className="bg-base-300 px-1 rounded">/model</code> in Claude Code to switch between Opus 4.6 (complex tasks) and Sonnet 4.5 (routine fixes).
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

