# Changelog

All notable changes to Pilot Shell will be documented in this file.

## [6.11.0] - 2026-02-24

### Features

- Add bugfix spec workflow and viewer enhancements 

## [6.10.3] - 2026-02-23

### Bug Fixes

- Enhance rules, agents, and workflow prompts for better review handling and debugging

## [6.10.1] - 2026-02-22

### Bug Fixes

- Minimize external data to license key and fingerprint only
- Simplify Vercel rewrite rule to fix SPA routing 404s

### Miscellaneous

- Improve mobile responsiveness for hero buttons, pricing cards, and workflow diagram
- Add Vercel ignored build step to skip redundant deployments
- Replace hero Get Started button with View on GitHub and Read Documentation

## [6.10.0] - 2026-02-22

### Features

- Add goal verification sub-agent, documentation pages, and installer fixes

## [6.9.4] - 2026-02-21

### Bug Fixes

- Trigger release for AlmaLinux git prerequisite fix
- Install git via system package manager before Homebrew on RHEL-based distros
- Add uninstall script for clean Pilot removal

### Miscellaneous

- Updated Demo Video Link
- Updated Readme
- Added Demo to Readme and Website

## [6.9.3] - 2026-02-20

### Bug Fixes

- Detect native Windows in install.sh and guide users to WSL2 or Dev Container

## [6.9.2] - 2026-02-20

### Bug Fixes

- Improve vault command with correct client IDs and disable non-Claude clients
- Migrate from deprecated mcp-cli to ToolSearch for MCP tool access

## [6.9.1] - 2026-02-20

### Bug Fixes

- Make vexor model pre-download best-effort during installation
- Use sys.executable instead of uv in spec_validators tests
- Consolidate test infrastructure, harden parallel spec workflows 

## [6.9.0] - 2026-02-19

### Bug Fixes

- Grant prepare-release job write permission for semantic-release dry-run
- Remove Dependabot configuration
- Resolve Trivy security scan findings and add pre-commit hook
- Improved MCP-CLI system as CC default

### Features

- Implement spec/release-security-hardening

## [6.8.3] - 2026-02-19

### Bug Fixes

- Create ~/.pilot/bin directory before writing mcp-cli script
- Remove mcp-cli dependency, refactor console infrastructure, and add real-time notifications
- Real-time notification system with SSE and auto-notify on plan transitions

## [6.8.2] - 2026-02-18

### Bug Fixes

- Global extended context toggle, compact settings UI, and hook improvements 

## [6.8.1] - 2026-02-18

### Bug Fixes

- Go/gopls auto-install, npx zod peer dep fix, and update prompt TTY handling

## [6.8.0] - 2026-02-18

### Features

- Model selection settings, Apple Silicon Vexor acceleration, and worktree sync fixes 

## [6.7.7] - 2026-02-17

### Bug Fixes

- Improve network connectivity for corporate proxy and firewall environments

## [6.7.6] - 2026-02-17

### Bug Fixes

- Improve ChromaDB reliability and harden worktree lifecycle

### Miscellaneous

- Update bug report section in README

## [6.7.5] - 2026-02-17

### Bug Fixes

- Harden worktree lifecycle against data loss and improve project config

## [6.7.4] - 2026-02-17

### Bug Fixes

- Use --autostash on rebase during worktree sync
- Prevent stash data loss during worktree sync

## [6.7.3] - 2026-02-17

### Bug Fixes

- Improve worktree isolation and multi-session reliability

### Miscellaneous

- Updated Installer Instructions for Local Mode

## [6.7.2] - 2026-02-17

### Bug Fixes

- Add retry logic to installer network operations

### Miscellaneous

- Updated Demo Gif

## [6.7.1] - 2026-02-17

### Bug Fixes

- Move settings to global ~/.claude/settings.json with SSL and platform fixes

## [6.7.0] - 2026-02-16

### Features

- Effective context display, non-destructive installer, and npm sudo handling

## [6.6.0] - 2026-02-16

### Features

- Compaction-based context preservation, branding overhaul, and bugfixes 

## [6.5.9] - 2026-02-15

### Bug Fixes

- Prevent installer hang on Homebrew installation and improve UX

### Miscellaneous

- Re-stage worktree files with correct filters

## [6.5.8] - 2026-02-15

### Bug Fixes

- Remove unreliable session ID cross-check in context monitor
- Use runtime container detection in installer, improve UX and polling

## [6.5.7] - 2026-02-14

### Bug Fixes

- Use uv tool install for vexor to work on macOS and dev containers

## [6.5.6] - 2026-02-14

### Bug Fixes

- Clarify existing project support, streamline installer UX

## [6.5.5] - 2026-02-14

### Bug Fixes

- Consolidate Search into Memories, add Vault view, remove custom modes, improve hooks

## [6.5.4] - 2026-02-14

### Bug Fixes

- Stop deleting native Claude Code binary, fix spec UI staleness, improve TDD enforcer

## [6.5.3] - 2026-02-13

### Bug Fixes

- Add pre-commit hook for console build artifacts and rebuild bundles

## [6.5.2] - 2026-02-13

### Bug Fixes

- Add .cursor/ to .gitignore and update vault docs
- Improve vault workflow and usage tab performance

## [6.5.1] - 2026-02-13

### Bug Fixes

- Clean up orphaned pending messages to prevent unbounded queue growth

## [6.5.0] - 2026-02-13

### Features

- Add Usage tab with cost/token tracking

## [6.4.5] - 2026-02-12

### Bug Fixes

- Allow background Bash tasks for long-running processes like dev servers
- Install Playwright system dependencies after browser download
- Optimize subagent models and reduce token waste in review agents
- Run plan verification agents in parallel with run_in_background
- Fix npx MCP server pre-caching leaving incomplete installations

### Miscellaneous

- Update website and README messaging and FAQ transparency

## [6.4.4] - 2026-02-12

### Bug Fixes

- Fix npx package cache detection for versioned packages like open-websearch@latest
- Pre-cache npx MCP servers during install and reorder post-install steps

## [6.4.3] - 2026-02-12

### Bug Fixes

- Improve installer reliability, console UX, and vault auth flow

## [6.4.2] - 2026-02-12

### Bug Fixes

- Add cryptography dependency to pilot wrapper for trial activation

## [6.4.1] - 2026-02-12

### Bug Fixes

- Improve License Activation during Trial

### Miscellaneous

- Restore STANDARDS in agent roster, remove from hero, add sessions command to docs
- Remove STANDARDS from hero section, consolidate footer links, restore lightweight website deploy

## [6.4.0] - 2026-02-12

### Bug Fixes

- Consolidate website deployment into release pipelines and fix changelog duplication
- Prevent changelog duplication from squash merge commits

### Features

- Parallel multi-agent verification, standards migration, blog & dashboard

### Miscellaneous

- Updated Readme header

## [6.3.3] - 2026-02-11

### Bug Fixes

- Auto-start trial when no license found instead of prompting for key

### Miscellaneous

- Updated changelog for 6.3.2

## [6.3.2] - 2026-02-11

### Bug Fixes

- Various improvements to quality in spec workflow, rules and hooks
- Fix for trial endpoint so users can reactivate if license file gots corrupted
- Correct seat display for solo/team licenses and enrich activation output
- Replace seats with activations, refactor hooks and spec workflow
- Prevent incremental review from overwriting initial PR analysis

### Miscellaneous

- Add model routing docs and Pilot CLI reference to README and website

## [6.3.1] - 2026-02-11

### Bug Fixes

- Fixing Stale Context Monitor on session restart and statusline
- Update spec implementation agent to produce better quality
- Replace raw Python worktree calls with pilot CLI commands in spec instructions

### Miscellaneous

- Fix team checkout seat selection and update changelog

## [6.3.0] - 2026-02-11

### Bug Fixes

- Updated models for commands and agents
- Add MCP server smoke-testing step to sync command
- Resolve console test failures from parallel execution and mock contamination
- Show server-side license dates and seat count in banner
- Promote parallel execution as primary implement strategy and add license display
- Resolve trial activation failures caused by www subdomain redirects
- Sandbox support improvements and UX polish
- Move worktree question to beginning of spec flow
- Add staleness check to context-pct.json cache
- Migrate licensing from Gumroad to Polar.sh
- Simplify dashboard layout and add delta-aware PR reviews
- Make worktree isolation optional and fix worker startup crash
- Remove working-directory from deploy step to prevent doubled path
- Remove dead code and simplify auth module
- Migrate service integrations and enrich system metadata
- Simplify Vercel deploy to single step (fixes spawn sh ENOENT)
- Add npm install to deploy workflow and handle init timeout rejection
- Migrate to playwright-cli, backport console stability fixes, and harden CI/CD

### Features

- Add parallel execution, goal verification, and workflow improvements
- Add git worktree isolation for /spec workflow

## [6.2.2] - 2026-02-08

### Bug Fixes

- Resolve signal handler deadlock and improve session cleanup

### Miscellaneous

- Small changes to Website and Readme

## [6.2.1] - 2026-02-07

### Bug Fixes

- Move project selector to sidebar and add clear scope indicators across all views
- Restore emojis and add missing launcher features to docs

### Documentation

- Transform website and README with comprehensive system documentation

### Miscellaneous

- Add /vault and /learn to install section, remove remaining count, add custom LSP note
- Remove hardcoded counts and improve quality-focused messaging
- Add /vault to installer post-install and statusline tips, remove language servers stat
- Update branding to new slogan across entire codebase
- Restructure README and website to eliminate duplicate content
- Convert favicon from JPG to PNG for browser compatibility
- Reorder README sections
- Simplify license section in README
- Add license and changelog links to README and website footer
- Update license support contact and remove version line

## [6.2.0] - 2026-02-06

### Bug Fixes

- Resolve continuation path bug, clean up console UI, and add Vexor search backend
- Remove remote mode, extract worker daemon, add offline grace period, and refine hooks/UI
- Address PR #45 review findings and refine console UI
- Clean stale npm temp dirs before Claude Code install and block Explore agent
- Split spec command into phases, add design skill, and optimize skill descriptions
- Remove dead code, unused imports, and legacy integrations

### Features

- Add multi-session parallel support with isolated session state

### Miscellaneous

- Update site tagline
- Update site meta tags

## [6.1.1] - 2026-02-05

### Bug Fixes

- Add console branding and update settings defaults

### Miscellaneous

- Add pricing to website

## [6.1.0] - 2026-02-05

### Bug Fixes

- Rebuild console assets with latest changes
- Address code review findings
- Stale session cleanup, context hook, install docs, and CI pipeline
- Continue reworking towards Pilot Shell Console

### Features

- Pilot Console improvements and enhanced development workflow
- Rebrand memory system to Pilot Console

### Miscellaneous

- Fix changelog generation to prepend-only, restore clean v6 changelog

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
- Remove claude alias and update branding to Production-Grade Development

## [6.0.2] - 2026-02-02

### Bug Fixes

- Preserve user's .claude/skills folder and clean up empty rules/custom

## [6.0.1] - 2026-02-02

### Bug Fixes

- Remove duplicate sync step in release workflow
- Resolve release pipeline failure and remove codepro fallbacks
- Emphasize running installer in project folder and remove git setup step
- Add backwards compatibility for --restart-ccp argument

### Documentation

- Simplify install command for easier copying

## [6.0.0] - 2026-02-02

### BREAKING CHANGES

- Major workflow changes for Pilot Shell v6.0
- Project renamed from Claude CodePro to Pilot Shell

### Features

- Add multi-pass plan verification and installer auto-version
- Renamed Project to Pilot Shell

### Bug Fixes

- Update documentation to use claude command instead of pilot alias
- Improve installer location and sync workflow
- Make SEO descriptions consistent with new messaging
- Update favicon to local file and fix remaining old messaging in index.html
- Address PR review findings for installer robustness
- Unquote multi-argument variables in install.sh
- Add multi-pass verification with spec-verifier agent
- Add sx tool and update rules paths
- Improve worker cleanup and installer reliability
