---
description: Sync project rules and skills with codebase - reads existing rules/skills, explores code, updates documentation, creates new skills
model: opus
---
# /sync - Sync Project Rules & Skills

**Sync custom rules and skills with the current state of the codebase.** Reads existing rules/skills, explores code patterns, identifies gaps, updates documentation, and creates new skills when workflows are discovered. Run anytime to keep rules and skills current.

## What It Does

1. **Read existing rules & skills** - Load all `.claude/rules/*.md` and `.claude/skills/` to understand current state
2. **Build search index** - Initialize/update Vexor for semantic code search
3. **Explore codebase** - Use Vexor, Grep, and file analysis to discover patterns
4. **Compare & sync** - Update outdated rules and skills, add missing patterns
5. **Discover new rules** - Find and document undocumented patterns
6. **Create new skills** - When reusable workflows are discovered, use `/learn` command
7. **Team vault** - Pull team assets and share your discoveries via sx

All files in `.claude/rules/` are project-specific rules loaded into every session.
Custom skills in `.claude/skills/` (non-standard names) are preserved during updates.

---

## Important Guidelines

- **Always use AskUserQuestion tool** when asking the user anything
- **Read before writing** — Always check existing rules before creating new ones
- **Write concise rules** — Every word costs tokens in the context window
- **Offer suggestions** — Present options the user can confirm or correct
- **Idempotent** — Running multiple times produces consistent results

---

## Execution Sequence

### Phase 1: Read Existing Rules & Skills

**MANDATORY FIRST STEP: Understand what's already documented.**

#### Step 1.1: Read Custom Rules

1. **List all custom rules:**
   ```bash
   ls -la .claude/rules/*.md 2>/dev/null
   ```

2. **Read each existing rule file** to understand:
   - What patterns are already documented
   - What areas are covered (project, MCP, API, search, CDK, etc.)
   - What conventions are established
   - Last updated timestamps

#### Step 1.2: Read Custom Skills

1. **List all custom skills:**
   ```bash
   ls -la .claude/skills/*/SKILL.md 2>/dev/null
   ```

2. **Read each SKILL.md** to understand:
   - What workflows/tools are documented
   - Trigger conditions and use cases
   - Referenced scripts or assets
   - Whether the skill is still relevant

3. **Build mental inventory:**
   ```
   Documented rules: [list from reading files]
   Documented skills: [list skill names and purposes]
   Potential gaps to investigate: [areas not covered]
   Possibly outdated: [rules/skills with old content or changed workflows]
   ```

### Phase 2: Initialize Vexor Index

**Build/update the semantic search index before exploration.**

> **Note:** First-time indexing can take several minutes as embeddings are generated locally using CPU (or GPU if available). Subsequent syncs are much faster due to caching.

1. **Check Vexor availability:**
   ```bash
   vexor --version
   ```

2. **If Vexor not installed:** Inform user, will use Grep/Glob for exploration instead.

3. **Build or update the index (use extended timeout for first run):**
   ```bash
   vexor index --path /absolute/path/to/project
   ```
   Use Bash with `timeout: 300000` (5 minutes) for first-time indexing.

4. **Verify index is working:**
   ```bash
   vexor search "main entry point" --top 3
   ```

### Phase 3: Explore Codebase

**Discover current patterns using Vexor, Grep, and file analysis.**

1. **Scan directory structure:**
   ```bash
   tree -L 3 -I 'node_modules|.git|__pycache__|*.pyc|dist|build|.venv|.next|coverage|.cache|cdk.out|.pytest_cache|.ruff_cache'
   ```

2. **Identify technologies:**
   - Check `package.json`, `pyproject.toml`, `tsconfig.json`, `go.mod`, etc.
   - Note frameworks, build tools, test frameworks

3. **Search for patterns with Vexor:**
   ```bash
   # Find API patterns
   vexor search "API response format error handling" --top 5

   # Find test patterns
   vexor search "test fixtures mocking patterns" --top 5

   # Find configuration patterns
   vexor search "configuration settings environment" --top 5

   # Search based on gaps identified in Phase 1
   vexor search "[undocumented area]" --top 5
   ```

4. **Use Grep for specific conventions:**
   - Response structures, error formats
   - Naming conventions, prefixes/suffixes
   - Import patterns, module organization

5. **Read representative files** (5-10) in key areas to understand actual patterns

### Phase 4: Compare & Identify Gaps

**Compare discovered patterns against existing documentation.**

1. **For each existing rule, check:**
   - Is the documented pattern still accurate?
   - Are there new patterns not yet documented?
   - Has the technology stack changed?
   - Are commands/paths still correct?

2. **Identify gaps:**
   - Undocumented tribal knowledge
   - New conventions that emerged
   - Changed patterns not reflected in rules
   - Missing areas entirely

3. **Use AskUserQuestion to confirm findings:**
   ```
   Question: "I compared existing rules with the codebase. Here's what I found:"
   Header: "Sync Results"
   Options:
   - "Update all" - Apply all suggested changes
   - "Review each" - Walk through changes one by one
   - "Show details" - Explain what changed before updating
   - "Skip updates" - Keep existing rules as-is
   ```

### Phase 5: Sync Project Rule

**Update `project.md` with current project state.**

1. **If project.md exists:**
   - Compare documented tech stack with actual
   - Verify directory structure is current
   - Check if commands still work
   - Update "Last Updated" timestamp
   - Preserve custom "Additional Context" sections

2. **If project.md doesn't exist, create it:**

```markdown
# Project: [Name from package.json/pyproject.toml or directory]

**Last Updated:** [Current date]

## Overview

[Brief description from README.md or ask user]

## Technology Stack

- **Language:** [Primary language]
- **Framework:** [Main framework]
- **Build Tool:** [Vite, Webpack, etc.]
- **Testing:** [Jest, Pytest, etc.]
- **Package Manager:** [npm, yarn, pnpm, uv, etc.]

## Directory Structure

```
[Simplified tree - key directories only]
```

## Key Files

- **Configuration:** [Main config files]
- **Entry Points:** [src/index.ts, main.py, etc.]
- **Tests:** [Test directory location]

## Development Commands

- **Install:** `[command]`
- **Dev:** `[command]`
- **Build:** `[command]`
- **Test:** `[command]`
- **Lint:** `[command]`

## Architecture Notes

[Brief description of patterns]
```

### Phase 6: Sync MCP Rules

**Update MCP server documentation for user-configured servers.**

MCP servers can be configured in two locations:

| Config File | How It Works | Best For |
|-------------|--------------|----------|
| **`.mcp.json`** | Lazy-loaded; instructions enter context when triggered | Lightweight servers (few tools) |
| **`mcp_servers.json`** | Called via mcp-cli; instructions **never** enter context | Heavy servers (many tools) |

**Key difference:** With `.mcp.json`, tool definitions load into context when used. With `mcp_servers.json`, only the CLI output enters context - zero token cost for instructions.

**Pilot Core Servers (skip these - already documented in standard rules):**
- `context7` - Library documentation
- `mem-search` - Persistent memory
- `web-search` - Web search via open-websearch
- `web-fetch` - Web page fetching via fetcher-mcp

#### Step 6.1: Discover All MCP Servers

1. **Check `.mcp.json` (Claude Code native config):**
   ```bash
   cat .mcp.json 2>/dev/null | head -50
   ```

2. **Check `mcp_servers.json` (mcp-cli config):**
   ```bash
   cat mcp_servers.json 2>/dev/null | head -50
   ```

3. **List available servers via mcp-cli:**
   ```bash
   mcp-cli 2>/dev/null
   ```

4. **Build inventory of user servers:**
   - Parse both config files
   - Exclude Pilot core servers: `context7`, `mem-search`, `web-search`, `web-fetch`
   - Note which config file each server comes from

#### Step 6.2: Document User MCP Servers

For each user-configured server (not Pilot core):

1. **Get server tools and descriptions:**
   ```bash
   mcp-cli <server-name> -d
   ```

2. **Compare against existing `mcp-servers.md`:**
   - Check if server is already documented
   - Check if tools have changed
   - Check if server was removed

3. **If changes detected, use AskUserQuestion:**
   ```
   Question: "Found MCP server changes. Update documentation?"
   Header: "MCP Sync"
   Options:
   - "Update all" - Document all user MCP servers
   - "Review each" - Walk through changes one by one
   - "Skip" - Keep existing documentation
   ```

#### Step 6.3: Write MCP Documentation

If user approves, create/update `.claude/rules/mcp-servers.md`:

```markdown
## User MCP Servers

Custom MCP servers configured for this project.

### [server-name]

**Source:** `.mcp.json` or `mcp_servers.json`
**Purpose:** [Brief description]

**Available Tools:**

| Tool | Description |
|------|-------------|
| `tool-name` | What it does |

**Example Usage:**
```bash
mcp-cli server-name/tool-name '{"param": "value"}'
```
```

#### Step 6.4: Skip Conditions

Skip MCP documentation if:
- No `.mcp.json` AND no `mcp_servers.json` exists
- Only Pilot core servers are configured (no user servers)
- User declines documentation update

### Phase 7: Sync Existing Skills

**Update custom skills in `.claude/skills/` to reflect current codebase.**

#### Step 7.1: Review Each Custom Skill

For each skill found in Phase 1.2:

1. **Check if skill is still relevant:**
   - Does the workflow/tool still exist in codebase?
   - Has the process changed?
   - Are referenced files/scripts still valid?

2. **Check if skill content is current:**
   - Are the steps still accurate?
   - Have APIs or commands changed?
   - Are examples still working?

3. **Check trigger conditions:**
   - Is the description still accurate for discovery?
   - Should trigger conditions be expanded/narrowed?

#### Step 7.2: Update Outdated Skills

For skills needing updates:

1. **Use AskUserQuestion:**
   ```
   Question: "These skills need updates. Which should I update?"
   Header: "Skill Updates"
   multiSelect: true
   Options:
   - "[skill-name]" - [What changed and why]
   - "[skill-name]" - [What changed and why]
   - "None" - Skip skill updates
   ```

2. **For each selected skill:**
   - Read the current SKILL.md
   - Update content to reflect current state
   - Bump version in frontmatter (e.g., `version: 1.0.0` → `version: 1.0.1`)
   - Update any referenced scripts/assets

   **Version format:** `MAJOR.MINOR.PATCH` (e.g., 1.0.0 → 1.0.1 for fixes, 1.1.0 for features)
   **sx vault versions:** sx auto-increments vault versions (v1 → v2 → v3) on each `sx add`

3. **Confirm before writing:**
   ```
   Question: "Here's the updated [skill-name]. Apply changes?"
   Header: "Confirm Update"
   Options:
   - "Yes, update it"
   - "Edit first"
   - "Skip this one"
   ```

#### Step 7.3: Remove Obsolete Skills

If a skill is no longer relevant:

1. **Use AskUserQuestion:**
   ```
   Question: "[skill-name] appears obsolete. Remove it?"
   Header: "Remove Skill"
   Options:
   - "Yes, remove it"
   - "Keep it" - Still useful
   - "Update instead" - Workflow changed but still needed
   ```

2. **If removing:** Delete the skill directory

### Phase 8: Discover New Rules

**Find and document undocumented tribal knowledge.**

#### Step 8.1: Identify Undocumented Areas

Based on Phase 1 (existing rules) and Phase 3 (codebase exploration):

1. **List areas NOT yet covered by existing rules**

2. **Prioritize by:**
   - Frequency of pattern usage in codebase
   - Uniqueness (not standard framework behavior)
   - Likelihood of mistakes without documentation

3. **Use AskUserQuestion:**
   ```
   Question: "I found these undocumented areas. Which should we add rules for?"
   Header: "New Standards"
   multiSelect: true
   Options:
   - "[Area 1]" - [Pattern found, why it matters]
   - "[Area 2]" - [Pattern found, why it matters]
   - "[Area 3]" - [Pattern found, why it matters]
   - "None" - Skip adding new standards
   ```

#### Step 8.2: Document Selected Patterns

For each selected pattern:

1. **Ask clarifying questions:**
   - "What problem does this pattern solve?"
   - "Are there exceptions to this pattern?"
   - "What mistakes do people commonly make?"

2. **Draft the rule** based on codebase examples + user input

3. **Confirm before creating:**
   ```
   Question: "Here's the draft for [filename]. Create this rule?"
   Header: "Confirm Rule"
   Options:
   - "Yes, create it"
   - "Edit first" - I want to modify it
   - "Skip this one"
   ```

4. **Write to `.claude/rules/[pattern-name].md`**

#### Step 8.3: Rule Format

```markdown
## [Standard Name]

[One-line summary]

### When to Apply

- [Trigger 1]
- [Trigger 2]

### The Pattern

```[language]
[Code example]
```

### Why

[1-2 sentences if not obvious]

### Common Mistakes

- [Mistake to avoid]

### Examples

**Good:**
```[language]
[Correct usage]
```

**Bad:**
```[language]
[Incorrect usage]
```
```

### Phase 9: Discover & Create Skills

**Identify patterns that would be better as skills than rules.**

Skills are appropriate when you find:
- **Multi-step workflows** - Procedures with sequential steps
- **Tool integrations** - Working with specific file formats, APIs, or external tools
- **Reusable scripts** - Code that gets rewritten repeatedly
- **Domain expertise** - Complex knowledge that benefits from bundled references

#### Step 9.1: Identify Skill Candidates

Based on codebase exploration, look for:

1. **Repeated workflows** - Same sequence of steps in multiple places
2. **Complex tool usage** - Specific patterns for working with tools/formats
3. **Scripts that could be bundled** - Utility code that's reused

**Use AskUserQuestion:**
```
Question: "I found patterns that might work better as skills. Create any?"
Header: "New Skills"
multiSelect: true
Options:
- "[Workflow 1]" - [Description of multi-step process]
- "[Tool integration]" - [Description of tool/format handling]
- "[Domain area]" - [Description of specialized knowledge]
- "None" - Skip skill creation
```

#### Step 9.2: Create Selected Skills

For each selected skill, **invoke the `/learn` command**:

```
Skill(skill="learn")
```

The `/learn` command will:
1. Evaluate if the pattern is worth extracting
2. Check for existing related skills
3. Create the skill directory in `.claude/skills/`
4. Write the SKILL.md with proper frontmatter and trigger conditions

See `.claude/commands/learn.md` for the full skill creation process.

**Important:** Use a unique skill name (not `plan`, `implement`, `verify`, or `standards-*`) so it's preserved during updates.

#### Step 9.3: Verify Skill Creation

After `/learn` completes:
1. Verify skill directory exists in `.claude/skills/`
2. Confirm SKILL.md has proper frontmatter (name, description with triggers)
3. Test skill is recognized: mention it in conversation to trigger

### Phase 10: Team Vault (sx)

**Setup vault if needed, pull team assets, and share your discoveries.**

#### Step 10.1: Check/Setup Vault

1. **Check sx availability and vault status:**
   ```bash
   sx --version && sx update
   sx vault list --json 2>/dev/null
   ```

   - If `sx vault list` succeeds → vault is configured, proceed to Step 10.2
   - If `sx vault list` fails with "no vault configured" → ask user to set up

2. **If vault not configured, ask user:**
   ```
   Question: "sx vault not configured. Set up team skill/rule sharing? (repo can be empty or existing)"
   Header: "Team Vault"
   Options:
   - "Yes, I'll provide my git repo URL" - Share skills/rules with my team (Recommended)
   - "Skip" - Continue without team vault
   ```

3. **If user chooses to set up:**

   The user will type their repo URL via the "Other" option. Ask:
   ```
   Question: "Enter your git repository URL (select Other and paste your URL):"
   Header: "Git Repo URL"
   Options:
   - "https://github.com/..." - HTTPS format (recommended)
   - "git@github.com:..." - SSH format
   ```

   **Note:** User MUST select "Other" and type their actual repo URL. The options above are format hints only.

   Then run:
   ```bash
   echo "y" | sx init --type git --repo-url <user-provided-repo>
   ```

   The repo can be empty (will be initialized) or already contain assets (will be synced).

4. **If authentication fails (HTTPS repos):**

   After `sx init`, try `sx vault list`. If it fails with authentication error:
   ```
   Question: "Git authentication failed. How would you like to fix this?"
   Header: "Auth Fix"
   Options:
   - "Use gh auth login" - Authenticate via GitHub CLI (recommended)
   - "Switch to SSH" - Reinitialize with SSH URL
   - "Skip for now" - Continue without vault
   ```

   **If user chooses gh auth:**
   ```bash
   gh auth status  # Check if already logged in
   gh auth login --web --git-protocol https  # Interactive login
   gh auth setup-git  # Configure git credential helper
   sx vault list  # Retry vault access
   ```

   This sets up the GitHub credential helper so HTTPS repos work seamlessly.

#### Step 10.2: Sync Team Assets

1. **Compare vault assets with local assets:**
   ```bash
   # List vault assets
   sx vault list --json

   # List local skills and rules
   ls .claude/skills/*/SKILL.md 2>/dev/null
   ls .claude/rules/*.md 2>/dev/null
   ```

2. **Determine install strategy:**

   | Situation | Action |
   |-----------|--------|
   | Asset in vault AND in local `.claude/` | Skip (we're the source) |
   | Asset in vault but NOT local | Install globally via `sx install` |
   | Asset local but NOT in vault | Candidate for sharing (Step 10.3) |

3. **For consumer repos (no local assets):**
   ```bash
   sx install --repair
   ```

4. **For source repos (assets exist locally):**
   Skip `sx install` - local `.claude/` is the source of truth.
   Only install vault assets that don't exist locally.

5. **Show vault state:**
   ```bash
   sx vault list
   ```

#### Step 10.3: Share Your Assets

1. **Collect shareable assets from this session:**
   - New rules created (except `project.md` - project-specific)
   - New skills created
   - Updated rules/skills

   **Never suggest for sharing:**
   - `project.md` - Always project-specific
   - Rules with project-specific paths or configs

2. **Ask which to share:**
   ```
   Question: "Which assets would you like to share with your team?"
   Header: "Share to Vault"
   multiSelect: true
   Options:
   - "[skill] my-skill" - Custom skill (shows version: v1, v2, etc.)
   - "[rule] my-rule" - Reusable rule (not project-specific)
   - "None" - Skip sharing
   ```

3. **For each selected asset:**
   ```bash
   # Use --no-install to avoid duplicating assets that already exist locally
   # For rules
   sx add .claude/rules/my-rule.md --yes --type rule --name "my-rule" --no-install

   # For skills
   sx add .claude/skills/my-skill --yes --type skill --name "my-skill" --no-install
   ```

4. **Verify vault state:**
   ```bash
   sx vault list
   ```

**Note:** Using `--no-install` prevents sx from copying assets to `~/.claude/` when they already exist in the project's `.claude/` directory. Other projects will get these assets via `sx install`.

---

### Phase 11: Summary

**Report what was synced:**

```
## Sync Complete

**Vexor Index:** Updated (X files indexed)

**Rules Updated:**
- project.md - Updated tech stack, commands
- mcp-servers.md - Added 2 new servers

**New Rules Created:**
- api-responses.md - Response envelope pattern

**Skills Updated:**
- my-workflow - Updated steps for new API
- lsp-cleaner - Added new detection pattern

**New Skills Created:**
- deploy-process - Multi-step deployment workflow

**Skills Removed:**
- old-workflow - No longer relevant

**No Changes Needed:**
- cdk-rules.md - Still current
- opensearch-mcp-server.md - Still current
```

**Offer to continue:**
```
Question: "Sync complete. What next?"
Header: "Continue?"
Options:
- "Discover more standards" - Look for more patterns to document
- "Create more skills" - Look for more workflow patterns
- "Done" - Finish sync
```

---

## Writing Concise Rules

Rules are loaded into every session. Every word costs tokens.

- **Lead with the rule** — What to do first, why second
- **Use code examples** — Show, don't tell
- **Skip the obvious** — Don't document standard framework behavior
- **One concept per rule** — Don't combine unrelated patterns
- **Bullet points > paragraphs** — Scannable beats readable
- **Max ~100 lines per file** — Split large topics

**Good:**
```markdown
## API Response Envelope

All responses use `{ success, data, error }`.

```python
{"success": True, "data": {"id": 1}}
{"success": False, "error": {"code": "AUTH_001", "message": "..."}}
```

- Always include `code` and `message` in errors
- Never return raw data without envelope
```

**Bad:**
```markdown
## Error Handling Guidelines

When an error occurs in our application, we have established a consistent pattern...
[3 more paragraphs]
```

---

## Error Handling

| Issue | Action |
|-------|--------|
| Vexor not installed | Use Grep/Glob for exploration, skip indexing |
| mcp-cli not available | Skip MCP documentation |
| No README.md | Ask user for project description |
| No package.json/pyproject.toml | Infer tech stack from file extensions |

---

## Output Locations

**Custom rules** in `.claude/rules/`:

| Rule Type | File | Purpose |
|-----------|------|---------|
| Project context | `project.md` | Tech stack, structure, commands |
| MCP servers | `mcp-servers.md` | Custom MCP server documentation |
| Discovered standards | `[pattern-name].md` | Tribal knowledge, conventions |

**Custom skills** in `.claude/skills/`:

| Skill Type | Directory | Purpose |
|------------|-----------|---------|
| Workflows | `[workflow-name]/` | Multi-step procedures |
| Tool integrations | `[tool-name]/` | File format or API handling |
| Domain expertise | `[domain-name]/` | Specialized knowledge with references |

**Note:** Use unique names (not `plan`, `implement`, `verify`, `standards-*`) for custom skills.

Vexor index: `.vexor/` (auto-managed)

---

## Important Notes

- **Read existing rules first** — Never create duplicates or conflicts
- **All custom rules load every session** — Keep them concise
- **Standard rules in `~/.claude/rules/`** — Global framework/tooling rules
- **Custom rules in `.claude/rules/`** — Project-specific rules
- **Run `/sync` anytime** — After major changes, new patterns emerge, or periodically
- **Use sx for team sharing** — Share rules/skills across projects and teams
