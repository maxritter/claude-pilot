## Team Vault (sx)

Share AI assets (rules, skills, commands, agents, hooks) across your team using `sx` and a private Git repository.

### When to Use

| Situation | Action |
|-----------|--------|
| User says "share", "push", "vault" | Use `/vault` command |
| After `/sync` creates new rules/skills | Suggest `/vault` to share |
| User wants team consistency | Set up vault + push standards |
| New team member onboarding | `sx install --repair --target .` |

### Quick Reference

```bash
# Check status
sx config                              # Show config, vault URL, installed assets
sx vault list                          # List all vault assets with versions

# Pull team assets (always use --target to install to project .claude/)
sx install --repair --target .         # Fetch and install to current project
sx install --repair --target /path     # Install for a project you're not inside (CI/Docker)

# Push assets to team (project-scoped — recommended)
REPO=$(git remote get-url origin)
sx add .claude/skills/my-skill --yes --type skill --name "my-skill" --no-install --scope-repo $REPO
sx add .claude/rules/my-rule.md --yes --type rule --name "my-rule" --no-install --scope-repo $REPO

# Push assets globally (all repos)
sx add .claude/rules/my-rule.md --yes --type rule --name "my-rule" --no-install --scope-global

# Browse
sx vault show <asset-name>             # Show asset details and versions

# Remove
sx remove <asset-name> --yes           # Remove from lock file (stays in vault)
```

### Asset Types

| Type | Flag | Source Path |
|------|------|-------------|
| `skill` | `--type skill` | `.claude/skills/<name>/` |
| `rule` | `--type rule` | `.claude/rules/<name>.md` |
| `command` | `--type command` | `.claude/commands/<name>.md` |
| `agent` | `--type agent` | `.claude/agents/<name>.md` |
| `hook` | `--type hook` | Hook scripts |
| `mcp` | `--type mcp` | MCP server configs |

### Scoping

| Scope | Installs to | Use When |
|-------|-------------|----------|
| Project (`--scope-repo`) | `project/.claude/` | **Recommended.** Assets stay with the project. |
| Global (`--scope-global`) | `~/.claude/` | Personal tools needed in all repos. |
| Path (`--scope-repo "url#path"`) | `project/path/.claude/` | Monorepo — different assets per service. |

```bash
# Project-scoped (recommended)
sx add ./asset --yes --scope-repo git@github.com:org/repo.git

# Global (all repos)
sx add ./asset --yes --scope-global

# Monorepo path-scoped
sx add ./asset --yes --scope-repo "git@github.com:org/repo.git#backend,frontend"
```

To change an existing asset's scope, run `sx add <name>` again to reconfigure interactively.

### Versioning

- Vault auto-increments versions: v1 -> v2 -> v3 on each `sx add`
- `sx vault list` shows latest version and total version count
- `sx vault show <name>` shows all versions
- `--no-install` flag prevents re-installing locally when you're the author

### Setup (First Time)

```bash
# Git repo (most common)
sx init --type git --repo-url git@github.com:org/team-vault.git

# Local directory
sx init --type path --repo-url /path/to/vault

# Skills.new (managed service)
sx init --type sleuth

# Verify
sx vault list
```

### Tips

- Always use `--no-install` when pushing your own assets (they're already local)
- Use `--name` to control the asset name in the vault
- Always use `sx install --repair --target .` to install assets to the current project
- Use `--target /path` to install for a project from outside it (CI pipelines, Docker)
- Multiple profiles supported via `--profile` flag or `SX_PROFILE` env var
