<div align="center">

<img src="docs/img/logo.png" alt="Claude CodePro" width="400">

### 🛠️ Professional Development Environment for Claude Code (CC)

Start shipping systematically with Cross-Session Context Management, Spec-Driven Development, Skills, TDD, LSP, Semantic Search, Persistent Memory, Quality Hooks, Modular Rules System, and much more 🚀

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
![Opus 4.5](https://img.shields.io/badge/Opus_4.5-Compatible-purple.svg)
[![Modular Rules](https://img.shields.io/badge/Modular_Rules-Integrated-brightgreen.svg)](https://code.claude.com/docs/en/memory#modular-rules-with-claude/rules/)
![Spec-Driven](https://img.shields.io/badge/Spec-Driven-orange.svg)
![TDD](https://img.shields.io/badge/TDD-Test--Driven--Development-green.svg)

#### [⭐ Star this repository ](https://github.com/maxritter/claude-codepro) - [🌐 Visit the website](https://claude-code.pro)

</div>

---

## 🚀 Getting Started

### Prerequisites

- **Container Runtime** - [Docker Desktop](https://www.docker.com/products/docker-desktop) or [OrbStack](https://orbstack.dev/) (macOS)
- **IDE** - [VS Code](https://code.visualstudio.com/), [Cursor](https://cursor.sh/), [Windsurf](https://windsurf.com/editor), or [Antigravity](https://antigravity.google/)
- **Dev Containers extension** - [Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

> **Note:** Claude CodePro automatically runs inside a Dev Container for complete isolation, consistent tooling, and cross-platform compatibility on Windows, Mac and Linux. You can bring your own Dev Container configuration if you prefer.

### Installation

Claude CodePro can be installed into any existing project:

1. Open your project folder in your IDE
2. Run this command in the terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/maxritter/claude-codepro/v4.0.0/install.sh | bash
```

3. Reopen in Container: `Cmd+Shift+P` → "Dev Containers: Reopen in Container"
4. Installation completes automatically inside the container

> **Cursor, Windsurf, Antigravity users:** These IDEs don't auto-execute `postCreateCommand`. After the container starts, run the install command from step 2 again in the container terminal IDE.

---

## 📦 What's Inside

### 🚀 One-Command Workflow

- **Context** - Intelligently handles context accross multiple session in `/ccp` mode via wrapper
- **Setup** - Automated first-time initialization (creates project context and semantic search index)
- **Planning** - Creates a detailed implementation plan for your review as markdown in `docs/plans/`
- **Implementation** - Executes the plan with TDD enforcement and context management
- **Verification** - Runs tests, quality checks, and validates completion based on the plan

### 🏗️ One-Command Installer

- **Automated Container Setup** - Isolated Linux environment with pre-configured tools and extensions
- **Extended Language Support** - Optionally install extended support for Python & TypeScript
- **Automated Setup Script** - Installs and configures everything in one installation command
- **Shell Integration** - Auto-configures bash, fish and zsh with `ccp` alias
- **IDE Compatible** - Works with VS Code, Cursor, Windsurf or Antigravity

### 💡 Modular Rules System

- **Auto Loading** - Claude Code automatically loads all `.claude/rules/*.md` files as project memory
- **Standard Rules** - Best-Practices for TDD, Context Management, etc. in `.claude/rules/standard/`
- **Custom Rules** - Project-specific rules in `.claude/rules/custom/` (never touched by updates)
- **Command Skills** - Workflow-specific modes that are launched by `/ccp`: plan, implement, verify, setup
- **Standards Skills** - Best-Practices for Frontend, Backend, Testing, etc. automatically injected

### 🔌 Enhanced Context Capabilities

- **Claude Mem** - Cross-session persistent memory system that automatically ingest context
- **Vexor** - Local vector store based semantic code search for token-efficient retrieval
- **Context7** - AI-powered code context retrieval installed as a plugin with wide support
- **Firecrawl** - Various tools for searching and scraping the web and direct code fetching
- **LSP Servers** - Python and TypeScript CC Language Servers for extended code intelligence

### 🛠️ Intelligent Hook Automation

- **Python Quality** - Post-edit hook for ruff, mypy, basedpyright linting and type checking (optional)
- **TypeScript Quality** - Post-edit hook for eslint, tsc, prettier checks (optional)
- **General Quality** - Post-edit hook for all languages for automated formatting and checking using qlty
- **TDD Enforcer** - Pre-edit hook that warns when modifying code without failing tests first
- **Context Monitor** - Post-tool hook that warns CC automatically at 85%/95% context usage

---

## 📒 How-to-Use

### 👣 Quick Start

```bash
ccp                         # Launch Claude CodePro inside your Dev Container with wrapper
> /ccp "<YOUR TASK HERE>"   # Prove your detailed task description to the unified command
```

**The `/ccp` workflow:**
1. **First run** - Automatically sets up project context and semantic search
2. **Creates plan** - Explores codebase, asks clarifying questions, generates detailed spec
3. **Waits for approval** - You review and approve (or edit) the markdown plan
4. **Implements** - Executes tasks with TDD enforcement and quality hooks
5. **Verifies** - Runs tests, quality checks and validates plan completion


### 📖 Context Management

**Never use `/compact`** - Claude CodePro uses the full 200k context window and manages context automatically.

- **Context is managed automatically** - `/ccp` handles session clears and continuity over a wrapper
- **Auto-compact is automatically disabled** during installation and saves 20% of your total context window
- **Ignore compact warnings** - they appear too early, look at the status bar for real context usage up to 95%
- **Claude Mem preserves context** - relevant information is automatically ingested and flows across sessions

### 🎯 Customizing Rules

Claude CodePro uses [Claude Code's modular rules](https://code.claude.com/docs/en/memory#modular-rules-with-claude/rules/):

- **Standard Rules** in `.claude/rules/standard/` - Updated on install, don't modify
- **Custom Rules** in `.claude/rules/custom/` - Your project-specific rules, never touched by updates
- **Path-Specific Rules** - Use YAML frontmatter with `paths:` to scope rules to specific files

Add custom rules by creating `.md` files in `.claude/rules/custom/`. You can also use path-specific rules:

```yaml
---
paths: src/**/*.py
---
# Python-specific rules for this project
```

---

## 🙏 Acknowledgments

- **[thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)** - CC Persistent Memory system
- **[sirmalloc/ccstatusline](https://github.com/sirmalloc/ccstatusline)** - CC Status line integration
- **[scarletkc/vexor](https://github.com/scarletkc/vexor)** - CC Semantic code search
- **[ManuelKugelmann/BitBot](https://github.com/ManuelKugelmann/BitBot)** - CC Wrapper control inspirations
- **[upstash/context7](https://github.com/upstash/context7)** - Library code context retrieval
- **[firecrawl/firecrawl](https://github.com/firecrawl/firecrawl)** - Web search and scraping tool
- **[astral-sh/uv](https://github.com/astral-sh/uv)** - Fast Python package manager
- **[astral-sh/ruff](https://github.com/astral-sh/ruff)** - Fast Python linter and formatter
- **[qltysh/qlty](https://github.com/qltysh/qlty)** - Code quality automation
- **[DetachHead/basedpyright](https://github.com/DetachHead/basedpyright)** - Enhanced Python type checker
- **[dotenvx/dotenvx](https://github.com/dotenvx/dotenvx)** - Automatic .env loading for Claude Code
