---
description: Manage Team Vault - share and install rules, commands, skills across your team via sx
user-invocable: true
model: sonnet
---

# /vault - Team Vault Management

**Share and install AI assets (rules, commands, skills, agents, hooks, MCP configs) across your team using sx.**

sx is a team asset manager that uses a private Git repository as a shared vault. Assets are versioned automatically and can be scoped globally or per-repository.

---

## Step 0: Check Prerequisites

1. **Check sx is installed:**

   ```bash
   which sx 2>/dev/null && sx --version
   ```

   If not installed: inform user sx is required for Team Vault. It can be installed via the Pilot installer or from [skills.new](https://skills.new).

2. **Check vault configuration:**

   ```bash
   sx config 2>&1
   ```

   - Look for "Repository URL" in the output — if present, vault is configured
   - If "configuration not found" or no Repository URL, vault needs setup → go to [Setup](#step-1-setup)
   - If configured, go to [Main Menu](#step-2-main-menu)

---

## Step 1: Setup

If sx is installed but no vault is configured:

1. **Ask user for vault type:**

   ```
   Question: "How would you like to configure your team vault?"
   Header: "Vault Setup"
   Options:
   - "Git repository (Recommended)" - Private repo on GitHub, GitLab, or Bitbucket. Best for teams.
   - "Local directory" - Store assets in a local folder. Good for solo use or testing.
   - "Skills.new" - Managed vault service at skills.new
   ```

2. **Collect connection details via AskUserQuestion:**

   For Git repo:

   ```
   Question: "What's the Git repository URL for your team vault?"
   Header: "Repo URL"
   Options:
   - "HTTPS" - Use HTTPS URL (e.g., https://github.com/org/vault.git)
   - "SSH" - Use SSH URL (e.g., git@github.com:org/vault.git)
   ```

   Then ask user to type the URL via "Other" option.

   For local path: ask user to provide directory path.

3. **Initialize:**

   ```bash
   # Git repo
   sx init --type git --repo-url <user-provided-url>

   # Local path
   sx init --type path --repo-url <user-provided-path>

   # Skills.new
   sx init --type sleuth --server-url <user-provided-url>
   ```

4. **Verify setup:**

   ```bash
   sx config
   sx vault list
   ```

5. **If initialization fails:** Show the error and suggest:
   - Check repository URL and access permissions
   - For SSH: ensure SSH key is configured (`--ssh-key` flag available)
   - Try `sx init` manually in terminal for interactive setup

---

## Step 2: Main Menu

**Use AskUserQuestion to determine intent:**

```
Question: "What would you like to do with the Team Vault?"
Header: "Vault"
Options:
- "Pull" - Install or update team assets from the vault
- "Push" - Share your local rules, skills, or commands with the team
- "Browse" - See what's in the vault and check versions
- "Manage" - Remove assets, switch profiles, update sx
```

Execute the selected operation below, then return to this menu when done:

```
Question: "Done. What else?"
Header: "Continue?"
Options:
- "Back to menu" - Do another vault operation
- "Done" - Exit vault management
```

---

## Pull: Install Team Assets

Assets are installed **per-project** by default — they go to the project's `.claude/` directory, not `~/.claude/`. Always use `--target` to ensure assets install to the current project:

```bash
sx install --repair --target .
```

The `--target .` flag ensures assets are installed to the current project's `.claude/` directory. The `--repair` flag verifies assets are actually installed and fixes any discrepancies.

**For CI/automation** where you're not inside the project directory:

```bash
sx install --repair --target /path/to/project
```

**After install, show what was installed:**

```bash
sx config 2>&1 | grep -A 100 "^Assets"
```

Report which assets were installed/updated.

---

## Push: Share Assets with Team

### Step P.1: Discover Shareable Assets

```bash
# List custom rules
ls .claude/rules/*.md 2>/dev/null

# List custom skills
ls .claude/skills/*/SKILL.md 2>/dev/null

# List custom commands
ls .claude/commands/*.md 2>/dev/null

# List custom agents
ls .claude/agents/*.md 2>/dev/null
```

Filter out standard Pilot assets (those installed by the installer, not created by the user).

### Step P.2: Ask What to Share

```
Question: "Which assets should I share with your team?"
Header: "Share"
multiSelect: true
Options:
- "[skill] <name>" - <brief description from SKILL.md>
- "[rule] <name>" - <first line of rule file>
- "[command] <name>" - <description from frontmatter>
```

### Step P.3: Detect Git Remote

Auto-detect the project's git remote URL for project-scoped installation:

```bash
git remote get-url origin 2>/dev/null
```

Store this as `<repo-url>` for use in the push commands below.

### Step P.4: Ask About Scope

For each selected asset:

```
Question: "Where should <asset-name> be installed for team members?"
Header: "Scope"
Options:
- "This project (Recommended)" - Installed to .claude/ when teammates work in this repo
- "Global" - Installed to ~/.claude/ for all repositories
- "Custom repos" - Install for specific repositories (I'll provide URLs)
```

### Step P.5: Push Each Asset

```bash
# Project-scoped (recommended) — installs to .claude/ in the project
sx add .claude/skills/<name> --yes --type skill --name "<name>" --scope-repo <repo-url>
sx add .claude/rules/<name>.md --yes --type rule --name "<name>" --scope-repo <repo-url>
sx add .claude/commands/<name>.md --yes --type command --name "<name>" --scope-repo <repo-url>

# Global — installs to ~/.claude/ everywhere
sx add .claude/skills/<name> --yes --type skill --name "<name>" --scope-global
```

**Warning:** Do NOT use `--no-install` — it skips updating the vault lockfile, making assets invisible to `sx install` for teammates.

**Note:** sx installs to all detected clients (Claude Code + Cursor). If `.cursor/` is not in `.gitignore`, add it:

```bash
echo '.cursor/' >> .gitignore 2>/dev/null
```

### Step P.6: Verify Push

```bash
sx vault list
```

Confirm the asset appears with incremented version number.

---

## Browse: Explore Vault Contents

### List All Assets

```bash
sx vault list
```

Show the output and explain the format:

- Asset names, types, and latest version numbers
- Version count (e.g., "v2 (2 versions)" means v1 and v2 exist)

### Show Asset Details

Ask which asset to inspect:

```
Question: "Which asset would you like to inspect?"
Header: "Inspect"
Options:
- "<asset-1>" - <type and version>
- "<asset-2>" - <type and version>
- "<asset-3>" - <type and version>
```

Then run:

```bash
sx vault show <asset-name>
```

### Check Installation Status

```bash
sx config 2>&1 | grep -A 100 "^Assets"
```

Compare vault assets vs installed assets. Report any that are available but not installed.

---

## Manage: Administration

**Use AskUserQuestion:**

```
Question: "What would you like to manage?"
Header: "Manage"
Options:
- "Remove an asset" - Unlink an asset from your lock file
- "Switch profile" - Change vault configuration profile
- "Update sx" - Check for and install sx updates
- "Uninstall all" - Remove all installed vault assets
```

### Remove an Asset

```bash
# List installed assets first
sx config 2>&1 | grep -A 100 "^Assets"
```

Ask which to remove, then:

```bash
sx remove <asset-name> --yes
```

The asset stays in the vault for other team members — only your local installation is affected.

### Switch Profile

sx supports multiple vault configurations (e.g., different teams, different projects):

```bash
# List profiles
sx profile list

# Switch to a profile
sx profile use <profile-name>

# Add a new profile
sx profile add <profile-name>
```

Ask user what profile operation they need.

### Update sx

```bash
# Check for updates
sx update --check

# Install update if available
sx update
```

### Uninstall All Assets

**Confirm before proceeding:**

```
Question: "This will remove all vault assets from your machine. Are you sure?"
Header: "Confirm"
Options:
- "Yes, uninstall from current scope" - Remove assets for current profile
- "Yes, uninstall from ALL scopes" - Remove everything
- "Preview only" - Show what would be removed without removing
- "Cancel" - Don't uninstall anything
```

```bash
# Preview
sx uninstall --dry-run

# Current scope only
sx uninstall --yes

# All scopes
sx uninstall --all --yes
```

---

## Asset Types

| Type      | Flag             | Source Path                  | Example                                         |
| --------- | ---------------- | ---------------------------- | ----------------------------------------------- |
| `skill`   | `--type skill`   | `.claude/skills/<name>/`     | Coding standards, workflows, domain knowledge   |
| `rule`    | `--type rule`    | `.claude/rules/<name>.md`    | Project conventions, API patterns, style guides |
| `command` | `--type command` | `.claude/commands/<name>.md` | Custom slash commands                           |
| `agent`   | `--type agent`   | `.claude/agents/<name>.md`   | Sub-agent definitions                           |
| `hook`    | `--type hook`    | Hook scripts                 | Quality automation, CI integration              |
| `mcp`     | `--type mcp`     | MCP server configs           | External tool integrations                      |

## Scoping

Assets can be installed at different levels:

| Scope                            | Installs to             | Use When                                   |
| -------------------------------- | ----------------------- | ------------------------------------------ |
| Project (`--scope-repo`)         | `project/.claude/`      | **Default.** Assets stay with the project. |
| Global (`--scope-global`)        | `~/.claude/`            | Personal tools needed everywhere.          |
| Path (`--scope-repo "url#path"`) | `project/path/.claude/` | Monorepo — different assets per service.   |

**Project-scoped is recommended** because:

- Each project explicitly tracks which vault assets it uses
- No global pollution from multiple projects
- New team members get exactly the right assets when they clone the repo

To change an existing asset's scope, run `sx add <name>` again (without a path) to reconfigure it interactively.

## Versioning

- sx auto-increments vault versions on each `sx add` (v1 -> v2 -> v3)
- Multiple versions coexist in the vault — nothing is overwritten
- `sx vault show <name>` shows all available versions with dates
- Teams can pin specific versions in their lock files
- Use `sx remove <name> -v <version>` to remove a specific version from your lock file

## Error Handling

| Error                                               | Action                                            |
| --------------------------------------------------- | ------------------------------------------------- |
| "configuration not found"                           | Run setup flow                                    |
| "authentication failed" / "could not read Username" | Run the **Git Authentication Fix** below          |
| "repository not found"                              | Verify URL is correct and user has access         |
| "asset already exists"                              | sx will auto-increment version — this is expected |
| "failed to install"                                 | Run `sx install --repair` to fix discrepancies    |
| Network errors                                      | Check internet connection, retry                  |

### Git Authentication Fix

When HTTPS git operations fail (common in dev containers and fresh environments), determine the git host from the vault repo URL and guide accordingly:

**GitHub** (recommended — uses `gh` CLI):

1. Check if `gh` is installed and authenticated:
   ```bash
   gh auth status 2>&1
   ```
2. If not authenticated, run the interactive login:
   ```bash
   gh auth login
   ```
3. Configure git to use `gh` as credential helper. **IMPORTANT: Only use this exact command — do NOT manually set `credential.helper` via `git config`:**
   ```bash
   gh auth setup-git
   ```
4. Retry the vault operation.

**GitLab / Bitbucket / other hosts:**

1. Suggest switching to SSH — ask user to re-initialize the vault with an SSH URL:
   ```bash
   sx init --type git --repo-url git@gitlab.com:org/vault.git
   ```
2. Or configure a personal access token for HTTPS:
   ```bash
   git config --global credential.helper store
   # Then retry — git will prompt for username/token and save it
   ```
3. Retry the vault operation.
