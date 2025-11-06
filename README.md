<div align="center">

<img src="https://www.claude-code.pro/assets/logo-CZm5tDhJ.png" alt="Claude CodePro" width="400">

### Claude CodePro is a Professional System for Building Quality Code ⚙️💻

**A structured approach to software development with Specs, Tests, and Professional Workflows.**

**Stop vibe coding, start shipping systematically with Spec-Driven Development, TDD, and much more!**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Optimized-blue)](https://claude.ai)
![Spec-Driven](https://img.shields.io/badge/Spec-Driven-orange.svg)
![TDD](https://img.shields.io/badge/TDD-Test--Driven--Development-green.svg)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](http://makeapullrequest.com)

#### 🎬 Join the Upcoming Masterclass to Learn More ➡️ [www.claude-code.pro](https://www.claude-code.pro)

---

## ⚡ What's Inside

**Claude CodePro is token-optimized and built using latest techniques such as the new skills feature:**

### 📋 Token-Optimized Spec-Driven Workflow via Slash Commands
- `/plan` - Based on your input asks the right questions → Detailed spec with exact code (Opus 4.1)
- `/implement` - Execute spec with mandatory TDD → Auto-manages context when full (Sonnet 4.5)
- `/remember` - Stores learnings in cross-session memory → Continue after /clear (Sonnet 4.5)
- `/verify` - E2E spec verification → All tests, data integrity, quality checks (Sonnet 4.5)

### 🎨 Auto-Enforce Best Practices and Standards via Skills
- **Testing Skills** - TDD, test writing, anti-patterns, debugging, verification, code review
- **Global Skills** - Coding style, commenting, conventions, error handling, validation
- **Backend Skills** - API design, models, queries, migrations
- **Frontend Skills** - Components, CSS, accessibility, responsive design

### 🔌 Enhanced Context and Capabilities via MCP Servers
- **Cipher** - Cross-session memory so context is never lost between /clear commands
- **Claude Context** - Semantic codebase search for optimal context retrieval
- **Context7 & Ref** - Up-to-date library documentation with limited context blur
- **DBHub & FireCrawl** - Database access and web scraping for dynamic data retrieval
- **MCP Funnel** - Allows to plug-in more MCP servers as needed without wasting context

### 🛠️ Testing and Quality via Automated Tool Installation
- **uv/pytest** - Unit and integration testing with uv
- **Newman** - API end-to-end testing with Postman collections
- **Qlty** - Automated code quality hooks
- **Basedpyright** - Type checking with enhanced features
- **Ruff** - Fast Python linter and formatter

### 🐳 Automated Dev Container Setup (VS Code / Cursor / Windsurf)
- **Integrated Features** - Zsh, Node.js, Docker-in-Docker, uv, ruff, basedpyright, git, fzf
- **IDE Extensions** - Python, Docker, SQL, testing, formatting, and development tools
- **CLI Tools** - qlty, Claude Code, Statusline, dotenvx, Cipher, Newman
- **Local Database** - Local PostgreSQL instance on port 5433 for development and testing

---

## 🎯 What Makes This Different

### Compared to Other Spec-Driven Frameworks (OpenSpec, SpecKit, AgentOS):

- 💾 **Persistent Memory** - Cross-session memory maintains knowledge between resets
- ⚡ **Token-Optimized** - No tokens wasted during too complex planning, just works
- ✅ **Production-Grade** - Actively used in client and enterprise projects
- 📝 **Enforced TDD** - Code written before tests gets deleted automatically
- 💯 **Real Verification** - Must show actual outputs based on tests, not assumptions
- 🛠️ **Complete Ecosystem** - Skills, MCP servers, testing tools are integrated and configured
- 📦 **Works Immediately** - Pre-configured automated setup with everything you need

---

## 👥 Who This Is For

- **Professional Developers** - Shipping to production with quality standards
- **Solo Builders** - Managing complex features without losing context
- **Engineering Teams** - Ensuring consistent TDD and code quality
- **Frustrated Coders** - Tired of half-tested, "should work" implementations

---

## 🚀 Getting Started

### 📋 Prerequisites

- Supports **all operating systems** (Windows / macOS / Linux) and **ARM/x86 architectures**
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** or **[OrbStack](https://orbstack.dev/download)**
- **[VS Code](https://code.visualstudio.com/)** or **[Cursor](https://cursor.com/)** or **[Windsurf](https://windsurf.dev/)**
- **[Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)**
- **Optional**: **[Warp](https://www.warp.dev/)** for the best terminal experience

### 📥 Installation

- Clone this repository and install the prerequisites from above
- Open folder in VS Code, click on the button on the bottom-left: `Reopen in Container`
- Wait for automatic build to finish, this can take a couple of minutes
- Copy `.env.example` to `.env` and add your credentials and API keys
- Restart the container via Command Palette: `Developer: Reload Window`

### ⚙️ Configuration

- In the launched terminal, run `cc` and finish the Claude Code Container setup
- Run `/config` to set auto-connect to IDE to true and disable auto-compaction, enable verbose output
- Run `/ide` to connect to VS Code diagnostics and make sure all MCP servers for `/mcp` are online
- You can click `USAGE` in the lower bar to start a split terminal and monitor usage with `/usage`
- Open Claude Code in the IDE Terminal, Extension or an external Terminal like Warp with the `cc` command

### 👣 First Steps

- Start with `/plan` - Provide your input and it will ask clarifying questions to create a spec
- Use `/implement` to execute the spec with automatic TDD, best practices and context management
- When context fills, `/remember` automatically updates your plan and stores learnings
- After spec completion, run `/verify` to ensure all changes are working and tests pass
- Watch as CC automatically applies best practices, testing, and quality control with every step

---

## 🎬 Masterclass Coming Soon!

**If you want to dive deeper into the setup and advanced usage of this framework, check out the upcoming video masterclass with 12 comprehensive modules and 50+ detailed lessons:**

### ➡️ [www.claude-code.pro](https://www.claude-code.pro)

### 💡 What you'll learn:
- 🐳 Details about the automated dev container setup
- 🎨 Professional IDE configuration techniques
- ⌨️ Optimal terminal experience with voice input
- 🔍 Semantic code search with vector databases
- 🔌 MCP integration with context-optimization techniques
- 🧠 Cross-session memory layer that scales with your codebase
- ✅ Built-in quality control with hooks and CLI tools
- 📋 Context-optimized workflow (/plan → /implement → /remember → /verify)
- 🧪 Test-driven development methodology and enforcement
- 🚀 Applying all techniques to a real-world project

---

## 🤝 Contributing

Contributions welcome: custom skills, MCP integrations, workflow improvements, bug reports.

---

## 🙏 Acknowledgments

**Development Tools:**
- **[astral-sh/uv](https://github.com/astral-sh/uv)** - Fast Python package manager
- **[astral-sh/ruff](https://github.com/astral-sh/ruff)** - Fast Python linter and formatter
- **[DetachHead/basedpyright](https://github.com/DetachHead/basedpyright)** - Enhanced Python type checker
- **[python/mypy](https://github.com/python/mypy)** - Static type checker for Python
- **[dotenvx/dotenvx](https://github.com/dotenvx/dotenvx)** - Environment variable management
- **[postmanlabs/newman](https://github.com/postmanlabs/newman)** - End-to-End API testing
- **[pytest-dev/pytest](https://github.com/pytest-dev/pytest)** - Python testing framework
- **[qltysh/qlty](https://github.com/qltysh/qlty)** - Code quality automation

**Claude Code Tools:**
- **[campfirein/cipher](https://github.com/campfirein/cipher)** - CC Cross-session memory
- **[zilliztech/claude-context](https://github.com/zilliztech/claude-context)** - CC Semantic code search
- **[hagan/claudia-statusline](https://github.com/hagan/claudia-statusline)** - CC Status line integration
- **[upstash/context7](https://github.com/upstash/context7)** - MCP Library documentation
- **[ref-tools/ref-tools-mcp](https://github.com/ref-tools/ref-tools-mcp)** - MCP Documentation search
- **[mendableai/firecrawl-mcp](https://github.com/mendableai/firecrawl)** - MCP Web scraping
- **[bytebase/dbhub](https://github.com/bytebase/dbhub)** - MCP PostgreSQL connectivity
- **[chris-schra/mcp-funnel](https://github.com/chris-schra/mcp-funnel)** - MCP Tool filtering

---

**⭐ Star this repo if it helps you ship better code!**

Made with ❤️ by [Max Ritter](https://www.maxritter.net)

[🌐 claude-code.pro](https://www.claude-code.pro)

</div>
