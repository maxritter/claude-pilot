# Changelog

All notable changes to Claude Pilot will be documented in this file.

## [6.0.13] - 2026-02-04

### Bug Fixes

- Prevent blocking on worker restart and shutdown

## [6.0.12] - 2026-02-04

### Bug Fixes

- Show combined changelog for all versions during update
- Remove aggressive process cleanup on startup

## [6.0.11] - 2026-02-04

### Bug Fixes

- Improve hook performance and memory viewer facts display

### Documentation

- Updated Demo Gif

### Miscellaneous

- Fix CHANGELOG 6.0.0, prevent git-cliff historical commits, improve install.sh

## [6.0.10] - 2026-02-04

### Bug Fixes

- Remove Settings tab from UI, update messaging, improve installer description

## [6.0.9] - 2026-02-03

### Bug Fixes

- Release pipeline now updates files for manual triggers
- Parallel downloads, box alignment, TypeScript errors, remove analytics

## [6.0.8] - 2026-02-03

### Bug Fixes

- Add memory system source from other repo
- Added grep-mcp server

## [6.0.7] - 2026-02-03

### Bug Fixes

- Move worker lifecycle to hooks, simplify launcher cleanup

## [6.0.6] - 2026-02-02

### Bug Fixes

- Improved Plan and Spec Verifier Flow

## [6.0.5] - 2026-02-02

### Bug Fixes

- Add demo gif to README
- Make sx vault setup mandatory when sx installed but not configured

## [6.0.4] - 2026-02-02

### Bug Fixes

- Reduce GitHub API calls and simplify installer cleanup

## [6.0.3] - 2026-02-02

### Bug Fixes

- Shorten banner tagline to fit within box width
- Update claude-mem config tests to expect chroma enabled
- Remove claude alias and update branding to Production-Grade Development

## [6.0.2] - 2026-02-02

### Bug Fixes

- Preserve user's .claude/skills folder and clean up empty rules/custom

## [6.0.1] - 2026-02-02

### Bug Fixes

- Remove duplicate sync step in release workflow
- Resolve release pipeline failure and remove codepro fallbacks
- Resolve release pipeline failure and remove codepro fallbacks
- Emphasize running installer in project folder and remove git setup step
- Add backwards compatibility for --restart-ccp argument

### Documentation

- Simplify install command for easier copying

## [6.0.0] - 2026-02-02

### Bug Fixes

- Update documentation to use claude command instead of pilot alias
- Improve installer location and sync workflow
- Make SEO descriptions consistent with new messaging
- Remove Umami analytics
- Update favicon to local file and fix remaining old messaging in index.html
- Rebrand messaging to "Claude Code, Done Right"
- Address PR review findings for installer robustness
- Unquote multi-argument variables in install.sh
- Add multi-pass verification with spec-verifier agent
- Add sx tool and update rules paths
- Improve worker cleanup and installer reliability
- Correct hooks.json filtering and delete disabled hook files
- Default language packs to disabled in non-interactive mode
- Make agent browser mandatory and auto-clean deprecated config keys
- Improve statusline layout and hook comment stripping
- Enforce standard and custom rules check in verify step
- Add persistent license state tracking
- Prevent trial after paid license (partial fix)
- Improve statusline layout and trial time display
- Use CLAUDE_PROJECT_ROOT for statusline path resolution
- Write attribution settings to correct config file
- Enable wraparound in Cython build to prevent segfault
- Return exit code 2 for 80-89% context display
- Show context percentage on every hook invocation between 80-89%
- Improve context monitor warnings and MCP server documentation
- Respect saved language config in non-interactive mode
- Correct step numbering in context monitor warning
- Remove duplicate shebang in worker-wrapper.cjs
- Update learn rule threshold to 90%
- Ccp binary now returns correct exit code for license validation
- Move /learn check from stop hook to context monitor
- Improve online learning system UX
- Improve installer UX and add stop hook cooldown
- Address PR review feedback
- Update /sync command to sync existing skills and reference /learn
- Merge Claude workflows and improve CodeRabbit config
- Exclude git-crypted ccp/ folder from PR reviews
- Add spec stop guard and rename plugin to ccp
- Enforce automatic session continuation without stopping
- Banner alignment and LSP config patching
- Clean up old CCP files during upgrade
- Use 'claude plugin uninstall' CLI for legacy plugin cleanup
- Filter statusline specs to only show plans modified today
- Improve session continuation prompt with explicit Skill tool syntax
- Use CLAUDE_PROJECT_ROOT path in all ccp command examples
- Add CLAUDE_PROJECT_ROOT env var for reliable ccp path resolution
- Use 'ccp' instead of $PWD path in commands and hooks
- Use 'ccp' instead of $PWD path in context-continuation rule
- Set execute permissions on plugin scripts during install
- Add vexor indexing warning and timeout guidance to sync command
- Update plugin paths and improve legacy migration
- Remove verbose file listing from installer output
- Also exclude .install-version from plugin file install
- Exclude node_modules and build artifacts from plugin file count
- Add LSP integration mentions to docs and tips
- Add workflow continuation hook and remove obsolete tests
- Address PR review feedback
- Use positional argument for continuation prompt
- Pass continuation prompt with -p flag to claude
- Remove hooks patching, add plugin path patching
- Add CLAUDE_PLUGIN_ROOT path replacement in installer
- Exclude plugin .install-version from git
- Complete plugin system migration
- Simplify installer to use plugin folder for hooks/skills
- Create own plugin system
- Remove installer external deps (httpx/typer), cleanup extensions
- Replace httpx/typer with stdlib (urllib/argparse)
- Sed parsing order for GitHub API response
- Colorful banner with tagline, clear_terminal delay, test mock fix
- Installer and banner improvements
- Migrate from old thedotmack marketplace to customable
- Update PATH after Homebrew installs and rename marketplace to customable
- Remove LSP support and fix installer license validation
- Pass version to build commands to prevent version mismatch
- Trigger 5.2.1 release with correct binary versions
- Update install.sh DEFAULT_VERSION and releaserc pattern
- Merge main, improve startup screen and hooks
- Improve dev release sorting by created_at timestamp
- Make dev pre-release workflow manual-only
- Sort dev pre-releases by date to get truly latest version
- Sync install.sh with dev branch for --dev flag support
- Create tag manually before release to avoid permission issues
- Add write permissions to claude-code-review workflow for PR comments
- Checkout PR head commit instead of merge commit in dev workflow
- Patch statusLine bin path in installer and add Vercel analytics
- Improve claude-mem updates and TDD enforcer accuracy
- Installer and hook improvements
- Add ccp wrapper to dev release and use faster ARM runner
- Statusbar improvements, session cleanup, dev workflow optimizations
- Improve dev release sorting by created_at timestamp
- Sort releases by date before cleanup
- Use ctx.target_version for CCP binary download
- Make dev pre-release workflow manual-only
- Sort dev pre-releases by date to get truly latest version
- Create tag manually before release to avoid permission issues
- Add write permissions to claude-code-review workflow for PR comments
- Checkout PR head commit instead of merge commit in dev workflow
- Handle dev version tags in installer API URL
- Add manual trigger to claude-code-review workflow
- Remove qlty and update website tagline
- Remove OAuth token prompt from installer
- Migrate plan/implement/verify to commands and improve session cleanup
- Patch statusLine bin path in installer and add Vercel analytics
- Improve claude-mem updates and TDD enforcer accuracy
- Statusline stability, trial security, and installer cleanup
- Rename /setup to /sync and improve value messaging
- Python 3.12 ABI compatibility for CCP binary
- Installer improvements, parallel session support, and memory widget
- Installer download progress, path resolution, and Claude installer improvements
- Rename local SO file to ccp.cpython-* and add macOS Gatekeeper instructions
- Ccp build and wrapper improvements
- Use native installer for Claude Code instead of npm
- Disable auditor by default, enable via CCP_AUDITOR_ENABLED env var
- Remove gopls LSP server installation from installer
- Prevent duplicate auditor starts and restore gopls-lsp plugin installation
- Exclude tests from installer download and simplify gopls installation
- **ci:** Update test paths after reorganization
- **ci:** Unit test only installer
- **ci:** Tests for hombrew mock
- Show discount code when trial expires [skip ci]
- Improve trial reactivation and installer UX
- Remove duplicate tier display from status line and installer
- Auditor only tracks changes from current session
- Store firecrawl API key directly in ~/.claude.json
- Update installer UX and website navigation
- Add ccp trial command and refactor auditor config
- Remove ccp import from installer (runs standalone)
- Add setuptools package discovery for flat layout
- Use pyproject.toml for CI dependencies instead of hardcoding
- Add claude-agent-sdk to CI test dependencies
- Skip confirmation when using saved install preference
- Persist install mode and manage claude-mem worker lifecycle
- Change Claude-Mem model to Sonnet to save tokens
- Add UI feedback for slow CCP binary operations in installer
- Optimize PyInstaller builds with stripping and code signing
- Improved workflow instructions based on Ralph model
- Update Authentication data
- Download update script to /tmp instead of .claude folder
- Move CCP binary download to Python installer for auto-update support
- Move CCP binary download to Python installer for auto-update support
- Mock _is_nvm_installed in prerequisites test
- Add CCP auto-update mechanism and fix nvm detection
- Run installer from project root and use existing .venv
- Hard-code minimal installer dependencies instead of pyproject.toml
- Use uv with venv for installer dependencies and move Homebrew install to Python step
- Install Python dependencies before running installer
- Correct grep pattern for GitHub API JSON format in install.sh
- Refactor installer to run Python directly instead of compiled binary
- Add helpful error message when macOS Gatekeeper blocks installer
- Add brew tap for bun before installation
- Update commercial license features and remove free tier limitations
- Remove macOS quarantine flag from downloaded binaries
- Only show license section when valid tier exists
- Trigger release
- Rebuild release artifacts
- Expired trial license key prompt and input validation
- Retrigger 4.5.0 release
- Update version test to not hardcode version number
- Trigger 4.5.1 release with installer fixes
- Create .claude/bin directory before download and remove deprecated scripts folder
- Add git-crypt unlock to python-tests CI job
- Small fixes to Hooks
- Installer improvements and license management overhaul
- Make OpenAI and Firecrawl API keys optional
- Use macos-15-intel runner for x86_64 builds
- Installer improvements and add macOS builds
- Install.sh curl|bash support and SEO improvements
- Preserve license config and prompt eval users each time
- Trigger Netlify deploy via build hook after release
- Remove [skip ci] from release commits to trigger Netlify rebuild
- Add license acknowledgment step to installer
- Improve hooks to read edited file from stdin and strip inline comments
- Update Context7 documentation for new API parameter requirements
- Install uv unconditionally for vexor and improve post-install guidance
- Enable lazy loading of standard MCP servers
- Add mcp_servers.json template to installer
- Add auto-update and improve wrapper UI
- Add dual licensing notices to installer and wrapper
- Add GitHub Sponsors link for open source users
- Add dual licensing header to LICENSE file for clarity
- Add dual licensing, professional services, and prominent contact info
- Enable beta tool search to reduce MCP token usage
- Endless mode prioritizes quality over rushing and fixes session cache
- Context monitor now tracks write and edit operations
- Remove GitHub issues URL from installer (issues disabled)
- Semantic-release updates website install URLs and show full command
- Backup feature skips pipes and special files in tmp directory
- Add Firecrawl MCP server integration
- Replace MCP server installation with Context7 plugin
- Make TypeScript LSP conditional and update README hooks section
- Remove Milvus references from environment step
- Patch hook paths to absolute paths during installation
- Improve Claude Code installation and config management
- Replace lsp-fix script with npx tweakcc and improve documentation
- Add LSP Servers section to website features
- Ensure npm installation for Claude Code and handle already-installed plugins
- Refactor installer to use npm and claude plugin system for LSP
- Add workflow_dispatch to release workflow for manual binary builds
- Added Rules Compliance Audit to Verify Command
- Changed installation and updated setup script
- Added MCP Lazy Loading and Removed MCP Funnel
- Consolidate release workflow with proper job dependencies
- Run chmod inside Docker container to fix permissions
- Use semantic-release-action for reliable version outputs
- Build binaries after semantic-release version bump
- Simplify installer version handling and remove old version tracking
- Simplify claude-context indexing and restrict Tavily to search/map only
- Prohibit sub-agents during planning phase
- Remove obsolete env keys, set local Milvus address, and update documentation
- Ensure shell alias is always updated on reinstall
- Update shell alias to replace old version on reinstall
- Removed Premium features and added as normal features
- Fix for Premium Installer
- Improved Setup Installer
- Merge remote-tracking branch 'origin/main'
- Improve installer UX and simplify devcontainer setup
- Merge remote-tracking branch 'origin/main'
- Merge remote-tracking branch 'origin/main'
- Dev Container setup
- Unify installer output, move shell config from postCreateCommand
- Require dev container for installation, remove macOS builds
- Handle TTY input internally for macOS curl|bash compatibility
- Update install.sh test after removing exec
- Use httpx in premium CLI for macOS SSL compatibility
- Remove exec from install.sh to prevent SIGKILL on macOS
- MacOS code signing and SSL issues
- Correct GitHub releases URL for latest premium binary
- Enable interactive input when installer is piped via curl
- Install binutils in Docker builds for PyInstaller
- Use python:3.12-slim-bullseye for Linux builds
- Standardize on Python 3.12 across entire project
- Use Python 3.12 in CI/CD (3.13 not available in deadsnakes for focal)
- Remove preflight step and use Python 3.13 in CI/CD
- Consolidate build scripts and remove dead code
- Remove broken InquirerPy style dicts causing AttributeError
- Multiple installer improvements
- Installer improvements and CI speedup
- Add missing dependencies to PR quality workflow
- Resolve git setup check and protocol test failures
- Install.sh must pass 'install' command to binary
- Use versioned URL for install.sh in README
- Added more upcoming premium features
- Platform Compatibility for older images
- Fix premium feature build
- Changes for premium installation
- Move premium check to beginning of installation
- Merge premium build into main release workflow
- Hook in template, removed for non-premium users during install
- Only add premium hook for licensed users (not in template)
- Add context-monitor hook to template, exit silently without license
- Remove Windows from premium build matrix
- Add premium features with license-gated context monitoring
- Improved alias command and make postCreateCommand idempotent
- Improve Plan Command
- Fix for Dev Container Environment Variable Setup
- Further fixes for installation script
- Improved Installation Script
- Added Exa MCP to replace Ref.tools MCP and make ccp alias work in multiple projects
- Updated Commands and improved Plan Mode
- Issue with install libs not getting updated during installation
- Various fixes to make new version work
- Fix Tests and add missing skills
- Add fish shell in config
- Fixes for Installation Script
- Improve Dev Container Build and Install Fixes
- Added possibility to rename dev container
- Improve install script
- Failing tests and pipelines
- Adding unit tests for release pipeline
- Improved Python Setup and Testing
- Fix E2E tests
- Improved Standards for Core, Extended & Workflow
- Add DevContainer setup for isolation
- Replace Context7 and Firecrawl with Ref.tools
- Improved context management
- Fixing hooks path and rules builder location
- Bug with custom rules overwriting standard rule with the same name
- Pipeline fix
- CICD Pipeline
- Changed status bar to ccstatusline
- Issue with rule builder overwriting custom config
- Adjusted rules builder to work with custom folders
- Fixed a bug with environment env detection
- Issue with cached install modules
- Fixed Migration Process coming from older version
- Ensure config.yaml migration produces clean, valid YAML
- Ensure migration.sh is downloaded for existing installations
- Resolve semantic release branch protection and remove duplicate workflows
- Add end-to-end testing for install.sh script
- Improve install script compatibility and error handling
- Refactor install script into modular architecture for maintainability
- Add comprehensive GitHub issue templates and workflow automation
- Complete CI/CD setup with automated releases and quality checks
- Improve installation reliability and add CI/CD pipeline
- Use -E flag for extended regex in sed for both GNU and BSD
- Update release script to use URL pattern instead of line number and skip scripts in qlty hook
- Make zsh the default shell
- Typo in env.template

### Documentation

- Remove pricing text from pricing section tiers
- Updated tiers
- Update footer with Munich branding and links
- Add Team plan to Claude subscription options [skip ci]
- Update IDE support, platforms, and Enterprise tier benefits [skip ci]
- Expand supported IDEs for Dev Containers [skip ci]
- Add Team plan to Claude subscription options [skip ci]
- Update IDE support, platforms, and Enterprise tier benefits [skip ci]
- Expand supported IDEs for Dev Containers [skip ci]
- Updated website
- Update readme and release pipeline settings
- Change VS Code Settings
- Add ksdiff VS Code extension, and update README usage instructions.
- Simplify and streamline the explanation of development modes in the README.
- Rebrand to production-grade messaging
- Add demo GIF to README
- Add dual-license badge and Claude subscription guidance
- Clarify commercial license rights for modifications and generated artifacts
- Update typescript rules
- Updated FAQ again
- Add context management FAQ to website
- Update install URL to v2.5.16 [skip ci]
- Update install URL to v2.5.15 [skip ci]
- Update install URL to v2.5.14 [skip ci]
- Update install URL to v2.5.13 [skip ci]
- Update install URL to v2.5.12 [skip ci]
- Update install URL to v2.5.11 [skip ci]
- Update install URL to v2.5.10 [skip ci]
- Update install URL to v2.5.9 [skip ci]
- Update install URL to v2.5.8 [skip ci]
- Update install URL to v2.5.7 [skip ci]
- Update install URL to v2.5.6 [skip ci]
- Update install URL to v2.5.5 [skip ci]
- Update install URL to v2.5.4 [skip ci]
- Update install URL to v2.5.3 [skip ci]
- Update install URL to v2.5.2 [skip ci]
- Update install URL to v2.5.1 [skip ci]
- Update install URL to v2.5.0 [skip ci]
- Update install URL to v2.4.8 [skip ci]
- Update install URL to v2.4.7 [skip ci]
- Update install URL to v2.4.6 [skip ci]
- Update install URL to v2.4.5 [skip ci]
- Update install URL to v2.4.4 [skip ci]
- Update install URL to v2.4.3 [skip ci]
- Update install URL to v2.4.2 [skip ci]
- Update install URL to v2.4.1 [skip ci]
- Update install URL to v2.4.0 [skip ci]
- Update install URL to v2.3.12 [skip ci]
- Update install URL to v2.3.11 [skip ci]
- Update install URL to v2.3.10 [skip ci]
- Update install URL to v2.3.9 [skip ci]
- Update install URL to v2.3.8 [skip ci]
- Update install URL to v2.3.7 [skip ci]
- Update install URL to v2.3.6 [skip ci]
- Update install URL to v2.3.5 [skip ci]
- Update install URL to v2.3.4 [skip ci]
- Update install URL to v2.3.3 [skip ci]
- Update install URL to v2.3.2 [skip ci]
- Update install URL to v2.3.1 [skip ci]
- Update install URL to v2.3.0 [skip ci]
- Update install URL to v2.1.10 [skip ci]
- Update install URL to v2.1.9 [skip ci]
- Update install URL to v2.1.8 [skip ci]
- Update install URL to v2.1.7 [skip ci]
- Update install URL to v2.1.6 [skip ci]
- Update install URL to v2.1.5 [skip ci]
- Update install URL to v2.1.4 [skip ci]
- Add fish reload cmd
- Reorder setup with less switching
- Align finish message

### Features

- Add multi-pass plan verification and installer auto-version
- Renamed Project to Claude Pilot
- Add online learning system with /learn command and auto-restart after updates
- Unify /spec workflow into single command
- Skip unchanged files during install using SHA comparison
- Download CCP binary directly in install.sh
- Add target_version support for dev installations
- Add manual approval gate before production releases
- Download CCP binary directly in install.sh
- Add dev version support for CCP binary and updater
- Add target_version support for dev installations
- Add manual approval gate before production releases
- Add dev pre-release workflow and Claude Code integration
- Add tips widget, installer quiet mode, graceful CTRL+C handling, and OAuth improvements
- Add skills naming convention and skill-creator workflow
- Go language support, claude-mem health monitoring, and process cleanup
- Add golang support
- Introduce Auditor Agent and Status Line
- CCP binary with Endless Mode and multi-project support
- Add local installation via Homebrew and redesign website
- Add VS Code extensions installer, user config persistence, and verbose output
- Add mcp-cli integration for custom MCP servers
- Add Endless Mode, rename /ccp to /spec, and introduce Quick Mode
- Introduce unified /ccp workflow command with automated context management
- Add TypeScript support to installation process
- Replace Claude Context with Vexor for semantic code search
- Add LSP integration with TypeScript and Python language servers 
- Add claude-mem, local Milvus vector store, and replace MCP servers
- Migrate to Claude Code native modular rules system
- Expand installer banner with full feature list and premium link
- Add fancy ASCII art banner with feature highlights
- Refactor installer into step-based architecture with Rich UI
- Simplified Context Management and Upgrade for Opus 4.5
- Switching towards Python-based installer
- Changing to python-based installer to improve compatibility
- Migrate installer from Bash to Python with improved cross-platform support
- Make library module loading robust and prevent missing module bugs
- Add --local flag for testing install script with local files
- Implement standard/custom rules system with automatic migration

### Miscellaneous

- Remove pr-lint workflow
- Add dev pre-release and Claude Code workflows
- Update .gitignore to include TypeScript rules
- Remove Python dependency and CodeQL workflow [skip ci]
- Simplify quality workflow to only use QLTY [skip ci]
- Bump version to v2.1.3
- Add release script
- **docs:** Make cmd clearer
- **docs:** Make clone cmd copyable
- **docs:** Fix rendering due to image
- **docs:** Fix step 5 gh rendering in readme
- **docs:** Clarify setup steps with screenshots

### Refactoring

- Update hook removal logic in process_settings

### Styling

- Standardize build job naming across platforms


