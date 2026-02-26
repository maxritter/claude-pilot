<div align="center">

<img src="docs/img/logo.png" alt="Pilot Shell" width="400">

**The professional development environment for [Claude Code](https://docs.anthropic.com/en/docs/claude-code)**

### Claude Code is powerful. Pilot Shell makes it reliable.

Start a task, grab a coffee, come back to production-grade code.</br>
**Tests enforced. Context preserved. Quality automated.**

[![Stars](https://img.shields.io/github/stars/maxritter/pilot-shell?style=flat&color=F59E0B)](https://github.com/maxritter/pilot-shell/stargazers)
[![Star History](https://img.shields.io/badge/Star_History-chart-8B5CF6)](https://star-history.com/#maxritter/pilot-shell&Date)
[![Downloads](https://img.shields.io/github/downloads/maxritter/pilot-shell/total?color=3B82F6)](https://github.com/maxritter/pilot-shell/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-10B981.svg)](https://github.com/maxritter/pilot-shell/pulls)

⭐ [Star this repo](https://github.com/maxritter/pilot-shell) · 🌐 [Website](https://pilot-shell.com) · 🔔 [Follow for updates](https://www.linkedin.com/in/rittermax/) · 📋 [Changelog](https://pilot.openchangelog.com/) · 📄 [License](LICENSE)

<br>

```bash
curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/main/install.sh | bash
```

**Works on macOS, Linux, and Windows (WSL2).**

<br>

<img src="docs/img/demo.gif" alt="Pilot Shell Demo" width="700">

</div>

---

## Why I Built This

Claude Code writes code fast. But without structure, it skips tests, loses context, and produces inconsistent results — especially on complex, established codebases where there are real conventions to follow and real regressions to catch. I tried other frameworks. Most of them add complexity — dozens of agents, elaborate scaffolding, thousands of lines of instruction files — but the output doesn't get better. You just burn more tokens, wait longer, and deal with more things breaking.

**So I built Pilot Shell**. Instead of adding process on top, it bakes quality into every interaction. Linting, formatting, and type checking run as enforced hooks on every edit. TDD is mandatory, not suggested. Context is preserved across sessions. Every rule exists because I hit a real problem: a bug that slipped through, a regression that shouldn't have happened, a session where Claude cut corners and nobody caught it.

This isn't a vibe coding tool, it's true agentic engineering, but without the added complexity. You install it in any existing project, run `pilot`, then `/sync` to learn your codebase. The guardrails are just there. The end result is that you can walk away — start a `/spec` task, approve the plan, go grab a coffee. When you come back, the work is tested, verified, formatted, and ready to ship.

---

## Getting Started

### Prerequisites

**Claude Subscription:** Solo developers should choose [Max 5x](https://claude.com/pricing) for moderate usage or [Max 20x](https://claude.com/pricing) for heavy usage. Teams and companies should use [Team Premium](https://claude.com/pricing) which provides 6.25x usage per member plus SSO, admin tools, and billing management. Using the API instead may lead to much higher costs.

### Installation

**Works with any existing project.** Pilot Shell doesn't scaffold or restructure your code — it installs alongside your project and adapts to your conventions. `cd` into your project folder, then run:

```bash
curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/main/install.sh | bash
```

**Choose your environment:**

- **Local Installation** — Install directly on your system using Homebrew. Works on macOS, Linux, and Windows (WSL2).
- **Dev Container** — Pre-configured, isolated environment with all tools ready. No system conflicts and works on any OS.

After installation, run `pilot` or `ccp` in your project folder to start Pilot Shell.

<details>
<summary><b>What the installer does</b></summary>

8-step installer with progress tracking, rollback on failure, and idempotent re-runs:

1. **Prerequisites** — Checks Homebrew, Node.js, Python 3.12+, uv, git
2. **Dependencies** — Installs Vexor, playwright-cli, Claude Code, property-based testing tools
3. **Shell integration** — Auto-configures bash, fish, and zsh with `pilot` alias
4. **Config & Claude files** — Sets up `.claude/` plugin, rules, commands, hooks, MCP servers
5. **VS Code extensions** — Installs recommended extensions for your stack
6. **Dev Container** — Auto-setup with all tools pre-configured
7. **Automated updater** — Checks for updates on launch with release notes and one-key upgrade
8. **Cross-platform** — macOS, Linux, Windows (WSL2)

</details>

<details>
<summary><b>Installing a specific version or uninstalling</b></summary>

**Specific version** (see [releases](https://github.com/maxritter/pilot-shell/releases)):

```bash
export VERSION=7.0.5
curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/main/install.sh | bash
```

**Uninstall** — removes the Pilot binary, plugin files, managed commands/rules, settings and shell aliases:

```bash
curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/main/uninstall.sh | bash
```

</details>

---

## How It Works

### /spec — Spec-Driven Development

Features, bug fixes, refactoring — describe it and `/spec` handles the rest. Auto-detects whether it's a feature or a bugfix and adapts the workflow.

```bash
pilot
> /spec "Add user authentication with OAuth and JWT tokens"   # → feature mode
> /spec "Fix the crash when deleting nodes with two children"  # → bugfix mode (auto-detected)
```

```
Plan  →  Approve  →  Implement (TDD)  →  Verify  →  Done
                                            ↑         ↓
                                            └── Loop──┘
```

<details>
<summary><b>Feature Mode</b></summary>

Full exploration workflow for new functionality, refactoring, or architectural changes.

**Plan:** Explores codebase with semantic search → asks clarifying questions → writes detailed spec with scope, tasks, and definition of done → **plan-verifier sub-agent** validates completeness → waits for your approval.

**Implement:** Creates an isolated git worktree → implements each task with strict TDD (RED → GREEN → REFACTOR) → quality hooks auto-lint, format, and type-check every edit → full test suite after each task.

**Verify:** Full test suite + actual program execution → **three review sub-agents** in parallel (compliance, quality, goal) → auto-fixes findings → squash merges to main on success.

</details>

<details>
<summary><b>Bugfix Mode</b></summary>

Lighter, property-aware workflow for targeted fixes. Defines the bug precisely before touching any code.

**Analysis:** Traces the bug to a specific `file:line` root cause → formalizes the Bug Condition (C) and Postcondition (P) → creates a **Behavior Contract** defining what must change and what must NOT change.

**Test-Before-Fix:** Writes a bug-condition test that FAILS on current code → writes preservation tests that PASS on current code → implements the minimal fix → verifies all tests pass.

**Verify:** Lightweight verification — **Behavior Contract audit** (explicitly verifies Fix Property and Preservation Property) → full test suite → lint + type check → process compliance. No review sub-agents — the Behavior Contract mathematically proves correctness through tests.

**Why this matters:** The Behavior Contract prevents regressions. The bug test proves the fix works. The preservation tests prove nothing else broke. No guessing, no "fix one thing, break another."

</details>

### Quick Mode

Just chat — no plan, no approval gate. Quality hooks and TDD enforcement still apply. Best for small tasks and exploration.

### Other Commands

| Command  | What it does                                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sync`  | Explores your codebase, discovers conventions, builds a search index, updates project rules. Run once initially, then anytime your project changes. |
| `/learn` | Captures non-obvious discoveries as reusable skills. Triggers automatically or on demand.                                                           |
| `/vault` | Shares rules, commands, and skills across your team via a private Git repository.                                                                   |

### Extensibility

Create your own rules, commands, and skills in `.claude/` — all plain markdown. Add MCP servers in `.mcp.json` and run `/sync` to generate docs.

| Type         | Loaded                                       | Best for                               |
| ------------ | -------------------------------------------- | -------------------------------------- |
| **Rules**    | Every session, or conditionally by file type | Guidelines Claude should always follow |
| **Commands** | On demand via `/command`                     | Specific workflows or multi-step tasks |
| **Skills**   | On demand, created via `/learn`              | Reusable knowledge from past sessions  |

### Pilot Shell Console

A local web dashboard with 7 views and real-time notifications when Claude needs your input:

<img src="docs/img/dashboard.png" alt="Pilot Shell Console — Dashboard" width="700">

<details>
<summary><b>All views</b></summary>

| View               | What it shows                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Dashboard**      | Workspace status, active sessions, spec progress, git info, recent activity              |
| **Specifications** | All spec plans with task progress, phase tracking, and iteration history                 |
| **Memories**       | Browsable observations — decisions, discoveries, bugfixes — with type filters and search |
| **Sessions**       | Active and past sessions with observation counts and duration                            |
| **Usage**          | Daily token costs, model routing breakdown, and usage trends                             |
| **Vault**          | Shared team assets with version tracking                                                 |
| **Settings**       | Model selection per command/sub-agent, extended context toggle                           |

</details>

---

## Demo

A full-stack project — created from scratch with a single prompt, then extended with **3 features built in parallel** using `/spec`. Every line of code was planned, implemented, tested, and verified entirely by AI. Zero manual code edits, zero bug fixes by a human. **[Watch the demo and browse the code →](https://github.com/maxritter/pilot-shell-demo)**

---

## Under the Hood

### The Hooks Pipeline

Hooks fire automatically across the entire lifecycle — formatting, linting, type checking, TDD enforcement, context preservation, and memory capture. Every file edit triggers quality checks. Every session start restores state. Every session end persists context.

<details>
<summary><b>All hooks by lifecycle event</b></summary>

#### SessionStart (on startup, clear, or compact)

| Hook                      | Type     | What it does                                                           |
| ------------------------- | -------- | ---------------------------------------------------------------------- |
| Memory loader             | Blocking | Loads persistent context from Pilot Shell Console memory               |
| `post_compact_restore.py` | Blocking | After auto-compaction: re-injects active plan, task state, and context |
| Session tracker           | Async    | Initializes user message tracking for the session                      |

#### PreToolUse (before search, web, or task tools)

| Hook               | Type     | What it does                                                                                                                             |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tool_redirect.py` | Blocking | Blocks WebSearch/WebFetch (MCP alternatives exist), EnterPlanMode/ExitPlanMode (/spec conflict). Hints vexor for semantic Grep patterns. |

#### PostToolUse (after every Write / Edit / MultiEdit)

| Hook                 | Type         | What it does                                                                                                                                                         |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file_checker.py`    | Blocking     | Dispatches to language-specific checkers: Python (ruff + basedpyright), TypeScript (Prettier + ESLint + tsc), Go (gofmt + golangci-lint). Auto-fixes formatting.     |
| `tdd_enforcer.py`    | Non-blocking | Checks if implementation files were modified without failing tests first. Shows reminder to write tests. Excludes test files, docs, config, TSX, and infrastructure. |
| `context_monitor.py` | Non-blocking | Monitors context usage. Warns at ~80% (informational) and ~90%+ (caution). Prompts `/learn` at key thresholds.                                                       |
| Memory observer      | Async        | Captures development observations to persistent memory.                                                                                                              |

#### PreCompact (before auto-compaction)

| Hook             | Type     | What it does                                                                                                   |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `pre_compact.py` | Blocking | Captures Pilot Shell state (active plan, task list, key context) to persistent memory before compaction fires. |

#### Stop (when Claude tries to finish)

| Hook                 | Type     | What it does                                                                                                                               |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `spec_stop_guard.py` | Blocking | If an active spec exists with PENDING or COMPLETE status, **blocks stopping**. Forces verification to complete before the session can end. |
| Session summarizer   | Async    | Saves session observations to persistent memory for future sessions.                                                                       |

#### SessionEnd (when the session closes)

| Hook             | Type     | What it does                                                                                                   |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `session_end.py` | Blocking | Stops the worker daemon when no other Pilot Shell sessions are active. Sends real-time dashboard notification. |

</details>

### Context Preservation

Pilot Shell preserves context automatically across compaction boundaries. Before compaction fires, hooks capture the active plan, task list, and key decisions to persistent memory. After compaction, hooks restore everything — work continues exactly where it left off. Multiple sessions can run in parallel on the same project without interference.

<details>
<summary><b>How the effective context display works</b></summary>

Claude Code reserves ~16.5% of the context window as a compaction buffer, triggering auto-compaction at ~83.5% raw usage. Pilot Shell rescales this to an **effective 0–100% range** so the status bar fills naturally to 100% right before compaction fires. A `▓` buffer indicator at the end of the bar shows the reserved zone. The context monitor warns at ~80% effective (informational) and ~90%+ effective (caution) — no confusing raw percentages.

</details>

### Smart Model Routing

Opus for planning and verification — where reasoning quality matters most. Sonnet for implementation — where a clear spec makes fast execution predictable. All model assignments are configurable per-component via the Pilot Shell Console settings.

<details>
<summary><b>Phase-by-phase breakdown</b></summary>

| Phase                 | Default | Why                                                                                                                                               |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Planning**          | Opus    | Exploring your codebase, designing architecture, and writing the spec requires deep reasoning. A good plan is the foundation of everything.       |
| **Plan Verification** | Opus    | Catching gaps, missing edge cases, and requirement mismatches before implementation saves expensive rework.                                       |
| **Implementation**    | Sonnet  | With a solid plan, writing code is straightforward. Sonnet is fast, cost-effective, and produces high-quality code when guided by a clear spec.   |
| **Code Verification** | Opus    | Independent code review against the plan requires the same reasoning depth as planning — catching subtle bugs, logic errors, and spec deviations. |

Choose between Sonnet 4.6 and Opus 4.6 for the main session, each command, and sub-agents. A global "Extended Context (1M)" toggle enables the 1M token context window across all models simultaneously. **Note:** 1M context models require a Max (20x) or Enterprise subscription — not available to all users.

</details>

### Built-in Rules & Standards

Production-tested best practices loaded into every session. Core rules cover workflow, testing, verification, debugging, and tools. Coding standards activate conditionally by file type. These aren't suggestions, they're enforced.

<details>
<summary><b>Core Workflow</b></summary>

- `task-and-workflow.md` — Task management, /spec orchestration, deviation handling
- `testing.md` — TDD workflow, test strategy, coverage requirements
- `verification.md` — Execution verification, completion requirements

</details>

<details>
<summary><b>Development Practices</b></summary>

- `development-practices.md` — Project policies, debugging methodology, git rules
- `context-management.md` — Auto-compaction and context preservation
- `pilot-memory.md` — Online learning triggers

</details>

<details>
<summary><b>Tools</b></summary>

- `research-tools.md` — Search priority and tool selection guide
- `cli-tools.md` — Pilot CLI, Vexor semantic search
- `playwright-cli.md` — Browser automation for E2E UI testing

</details>

<details>
<summary><b>Collaboration</b></summary>

- `team-vault.md` — Team Vault asset sharing via sx

</details>

<details>
<summary><b>Coding Standards (activated by file type)</b></summary>

| Standard   | Activates On                                      | Coverage                                                |
| ---------- | ------------------------------------------------- | ------------------------------------------------------- |
| Python     | `*.py`                                            | uv, pytest, ruff, basedpyright, type hints              |
| TypeScript | `*.ts`, `*.tsx`, `*.js`, `*.jsx`                  | npm/pnpm, Jest, ESLint, Prettier, React patterns        |
| Go         | `*.go`                                            | Modules, testing, formatting, error handling            |
| Frontend   | `*.tsx`, `*.jsx`, `*.html`, `*.vue`, `*.css`      | Components, CSS, accessibility, responsive design       |
| Backend    | `**/models/**`, `**/routes/**`, `**/api/**`, etc. | API design, data models, query optimization, migrations |

</details>

### MCP Servers

MCP servers provide external context in every session — library docs, persistent memory, web search, GitHub code search, and web page fetching.

<details>
<summary><b>All servers</b></summary>

| Server         | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| **lib-docs**   | Library documentation lookup — get API docs for any dependency   |
| **mem-search** | Persistent memory search — recall context from past sessions     |
| **web-search** | Web search via DuckDuckGo, Bing, and Exa                         |
| **grep-mcp**   | GitHub code search — find real-world usage patterns across repos |
| **web-fetch**  | Web page fetching — read documentation, APIs, references         |

</details>

### Language Servers (LSP)

Real-time diagnostics and go-to-definition for Python (basedpyright), TypeScript (vtsls), and Go (gopls). Auto-installed, auto-configured via `.lsp.json`, and auto-restart on crash.

### Pilot Shell CLI

The `pilot` binary (`~/.pilot/bin/pilot`) manages sessions, worktrees, licensing, and context. Run `pilot` or `ccp` to start Claude with Pilot Shell enhancements. All commands support `--json` for structured output.

<details>
<summary><b>Session & Context</b></summary>

| Command                               | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `pilot`                               | Start Claude with Pilot Shell enhancements, auto-update, and license check |
| `pilot run [args...]`                 | Same as above, with optional flags (e.g., `--skip-update-check`)           |
| `pilot check-context --json`          | Get current context usage percentage                                       |
| `pilot register-plan <path> <status>` | Associate a plan file with the current session                             |
| `pilot sessions [--json]`             | Show count of active Pilot Shell sessions                                  |

</details>

<details>
<summary><b>Worktree Isolation</b></summary>

| Command                                | Purpose                                               |
| -------------------------------------- | ----------------------------------------------------- |
| `pilot worktree create --json <slug>`  | Create isolated git worktree for safe experimentation |
| `pilot worktree detect --json <slug>`  | Check if a worktree already exists                    |
| `pilot worktree diff --json <slug>`    | List changed files in the worktree                    |
| `pilot worktree sync --json <slug>`    | Squash merge worktree changes back to base branch     |
| `pilot worktree cleanup --json <slug>` | Remove worktree and branch when done                  |
| `pilot worktree status --json`         | Show active worktree info for current session         |

</details>

<details>
<summary><b>License & Auth</b></summary>

| Command                        | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `pilot activate <key>`         | Activate a license key on this machine |
| `pilot deactivate`             | Deactivate license on this machine     |
| `pilot status [--json]`        | Show current license status            |
| `pilot verify [--json]`        | Verify license (used by hooks)         |
| `pilot trial --check [--json]` | Check trial eligibility                |
| `pilot trial --start [--json]` | Start a trial                          |

</details>

---

## What Users Say

<!-- Replace with real testimonials from GitHub issues, discussions, or direct feedback as they come in -->

> "I stopped reviewing every line Claude writes. The hooks catch formatting and type errors automatically, TDD catches logic errors, and the spec verifier catches everything else. I review the plan, approve it, and the output is production-grade."

> "Other frameworks I tried added so much overhead that half my tokens went to the system itself. Pilot Shell is lean — quick mode has zero scaffolding, and even /spec only adds structure where it matters. More of my context goes to actual work."

> "The persistent memory changed everything. I can pick up a project after a week and Claude already knows my architecture decisions, the bugs we fixed, and why we chose certain patterns. No more re-explaining the same context every session."

---

## License

Pilot Shell is source-available under a commercial license. See the [LICENSE](LICENSE) file for full terms.

| Tier     | Seats | Includes                                                                     |
| :------- | :---- | :--------------------------------------------------------------------------- |
| **Solo** | 1     | All features, continuous updates, bug reports via [GitHub Issues][gh-issues] |
| **Team** | Multi | Solo + multiple seats, priority email support, feature requests              |

All plans work across multiple personal machines and Dev Containers — one subscription, all your devices.

[gh-issues]: https://github.com/maxritter/pilot-shell/issues

Details and licensing at [pilot-shell.com](https://pilot-shell.com).

---

## FAQ

<details>
<summary><b>Does Pilot Shell send my code or data to external services?</b></summary>

**No code, files, prompts, project data, or personal information ever leaves your machine through Pilot Shell.** All development tools — vector search (Vexor), persistent memory (Pilot Shell Console), session state, and quality hooks — run entirely locally.

Pilot Shell makes external calls **only for licensing**. Here is the complete list:

| When                              | Where             | What is sent                     |
| --------------------------------- | ----------------- | -------------------------------- |
| License validation (once per 24h) | `api.polar.sh`    | License key, organization ID     |
| License activation (once)         | `api.polar.sh`    | License key, machine fingerprint |
| Trial start (once)                | `pilot-shell.com` | Hashed hardware fingerprint      |

That's it — three calls total, each sent at most once (validation re-checks daily). No OS, no architecture, no Python version, no locale, no analytics, no heartbeats. The validation result is cached locally, and Pilot Shell works fully offline for up to 7 days between checks. Beyond these licensing calls, the only external communication is between Claude Code and Anthropic's API — using your own subscription or API key.

</details>

<details>
<summary><b>Is Pilot Shell enterprise-compliant for data privacy?</b></summary>

Yes. Your source code, project files, and development context never leave your machine through Pilot Shell. The only external calls are license validation (daily, license key only) and one-time activation/trial start (machine fingerprint only). No OS info, no version strings, no analytics, no telemetry. Enterprises using Claude Code with their own API key or Anthropic Enterprise subscription can add Pilot Shell without changing their data compliance posture.

</details>

<details>
<summary><b>What are the licenses of Pilot Shell's dependencies?</b></summary>

All external tools and dependencies that Pilot Shell installs and uses are open source with permissive licenses (MIT, Apache 2.0, BSD). This includes ruff, basedpyright, Prettier, ESLint, gofmt, uv, Vexor, playwright-cli, and all MCP servers. No copyleft or restrictive-licensed dependencies are introduced into your environment.

</details>

<details>
<summary><b>Do I need a separate Anthropic subscription?</b></summary>

Yes. Pilot Shell enhances Claude Code — it doesn't replace it. You need an active Claude subscription — [Max 5x or 20x](https://claude.com/pricing) for solo developers, or [Team Premium](https://claude.com/pricing) for teams and companies. Using the Anthropic API directly is also possible but may lead to much higher costs. Pilot Shell adds quality automation on top of whatever Claude Code access you already have.

</details>

<details>
<summary><b>Does Pilot Shell work with Codex, Gemini CLI, OpenCode, or other AI coding tools?</b></summary>

No. Pilot Shell is built exclusively for Claude Code. Every hook, rule, command, and workflow is engineered specifically for Claude's tool-use protocol, prompt format, and session lifecycle. Pilot Shell also only supports Claude Sonnet 4.6 and Claude Opus 4.6 — these are the models that produce the best results, and every rule and prompt is optimized for their behavior. Supporting other tools or models would mean compromising on quality, which is the opposite of what Pilot Shell is designed to do.

</details>

<details>
<summary><b>Does Pilot Shell work with existing projects?</b></summary>

Yes — that's the primary use case. Pilot Shell doesn't scaffold or restructure your code. You install it, run `/sync`, and it explores your codebase to discover your tech stack, conventions, and patterns. From there, every session has full context about your project. The more complex and established your codebase, the more value Pilot Shell adds — quality hooks catch regressions, persistent memory preserves decisions across sessions, and `/spec` plans features against your real architecture.

</details>

<details>
<summary><b>Does Pilot Shell work with any programming language?</b></summary>

Pilot Shell's quality hooks (auto-formatting, linting, type checking) currently support Python, TypeScript/JavaScript, and Go out of the box. TDD enforcement, spec-driven development, persistent memory, context preservation hooks, and all rules and standards work with any language that Claude Code supports. You can add custom hooks for additional languages.

</details>

<details>
<summary><b>Can I use Pilot Shell on multiple projects?</b></summary>

Yes. Pilot Shell installs once and works across all your projects. Each project can have its own `.claude/` rules, custom skills, and MCP servers. Run `/sync` in each project to generate project-specific documentation and standards.

</details>

<details>
<summary><b>Can I add my own rules, commands, and skills?</b></summary>

Yes. Create your own in your project's `.claude/` folder — rules, commands, and skills are all plain markdown files. Your project-level assets are loaded alongside Pilot Shell's built-in defaults and take precedence when they overlap. `/sync` auto-discovers your codebase patterns and generates project-specific rules for you. `/learn` extracts reusable knowledge from sessions into custom skills. Hooks can be extended for additional languages. Use `/vault` to share your custom assets across your team.

</details>

---

## Changelog

See the full changelog at [pilot.openchangelog.com](https://pilot.openchangelog.com/).

---

## Contributing

**Pull Requests** — New features, improvements, and bug fixes are welcome. You can improve Pilot Shell with Pilot Shell — a self-improving loop where your contributions make the tool that makes contributions better.

**Bug Reports** — Found a bug? [Open an issue](https://github.com/maxritter/pilot-shell/issues) on GitHub.

---

<div align="center">

**Claude Code is powerful. Pilot Shell makes it reliable.**

</div>
