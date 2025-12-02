# Git Commit Standards

**When user explicitly instructs you to commit, execute the commit directly.** Only ask for confirmation when the user hasn't given clear instructions. Never push without user approval.

## Commit Message Format

**Always use `fix:` prefix by default** unless the user explicitly requests a different type.

This project uses **semantic-release** which automatically determines version bumps based on commit prefixes:
- `fix:` → Patch release (0.0.X)
- `feat:` → Minor release (0.X.0)
- `feat:` with `BREAKING CHANGE:` in body → Major release (X.0.0)

## Commit Message Rules

1. **No AI attribution footers** - Do not include "Generated with Claude Code", "Co-Authored-By: Claude", or similar footers
2. **Keep messages concise** - One line summary, optional body for details
3. **Use imperative mood** - "fix bug" not "fixed bug" or "fixes bug"

## Examples

```bash
# Default - use fix:
git commit -m "fix: resolve npm package installation check"

# Only use feat: when user explicitly requests new feature
git commit -m "feat: add premium license key prompt"

# Breaking changes (rare, only when user confirms)
git commit -m "feat: refactor installer architecture

BREAKING CHANGE: Old scripts/install.py removed"
```

## When to Use Different Types

| Type | Use When | Release |
|------|----------|---------|
| `fix:` | Default for all changes, bug fixes, improvements | Patch |
| `feat:` | User explicitly says "new feature" or "add feature" | Minor |
| `docs:` | Documentation-only changes (no code) | None |
| `chore:` | Maintenance tasks that shouldn't trigger release | None |
| `refactor:` | Code restructuring without behavior change | None |
| `test:` | Adding or updating tests only | None |
| `perf:` | Performance improvements | Patch |
| `style:` | Formatting, whitespace (no logic change) | None |
| `build:` | Build system or dependency changes | None |
| `ci:` | CI/CD configuration changes | None |

**When in doubt, use `fix:`**
