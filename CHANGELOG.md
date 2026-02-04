# Changelog

All notable changes to Claude Pilot will be documented in this file.

## [6.0.9] - 2026-02-03

### Bug Fixes

- Release pipeline now updates files for manual triggers
- Parallel downloads, box alignment, TypeScript errors, remove analytics

## [6.0.8] - 2026-02-03

### Bug Fixes

- Add memory system source from other repo
- Added grep-mcp server for GitHub code search

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
- Emphasize running installer in project folder and remove git setup step
- Add backwards compatibility for --restart-ccp argument

### Documentation

- Simplify install command for easier copying

## [6.0.0] - 2026-02-02

### BREAKING CHANGES

- Major workflow changes for Claude Pilot v6.0
- Project renamed from Claude CodePro to Claude Pilot

### Features

- Add multi-pass plan verification and installer auto-version
- Renamed Project to Claude Pilot

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
