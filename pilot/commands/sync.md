---
description: Sync project rules and skills with codebase - reads existing rules/skills, explores code, updates documentation, creates new skills
user-invocable: true
model: sonnet
---

# /sync - Sync Project Rules & Skills

**Sync custom rules and skills with the current state of the codebase.** Reads existing rules/skills, explores code patterns, identifies gaps, updates documentation, and creates new skills when workflows are discovered.

---

## 📋 TABLE OF CONTENTS

| Phase                                                    | What Happens                                 |
| -------------------------------------------------------- | -------------------------------------------- |
| [0. Reference](#phase-0-reference)                       | Guidelines, output locations, error handling |
| [1. Read Existing](#phase-1-read-existing-rules--skills) | Load rules & skills, build inventory         |
| [2. Build Index](#phase-2-initialize-vexor-index)        | Initialize Vexor for semantic search         |
| [3. Explore](#phase-3-explore-codebase)                  | Discover patterns with Vexor/Grep            |
| [4. Compare](#phase-4-compare--identify-gaps)            | Find outdated/missing documentation          |
| [5. Sync Project](#phase-5-sync-project-rule)            | Update project.md                            |
| [6. Sync MCP](#phase-6-sync-mcp-rules)                   | Document user MCP servers                    |
| [7. Sync Skills](#phase-7-sync-existing-skills)          | Update existing skills                       |
| [8. New Rules](#phase-8-discover-new-rules)              | Document undocumented patterns               |
| [9. New Skills](#phase-9-discover--create-skills)        | Create skills via /learn                     |
| [10. Summary](#phase-10-summary)                         | Report changes                               |

### Quick Reference

- **Phase 0:** Guidelines, output locations, error handling
- **Phases 1-4:** Discovery (read, index, explore, compare)
- **Phases 5-7:** Sync existing (project, MCP, skills)
- **Phases 8-9:** Create new (rules, skills)
- **Phase 10:** Report

**Team sharing:** Use `/vault` to push/pull assets via sx after sync completes.

---

# PHASE 0: REFERENCE

## 0.1 Guidelines

- **Always use AskUserQuestion tool** when asking the user anything
- **Read before writing** — Always check existing rules before creating new ones
- **Write concise rules** — Every word costs tokens in the context window
- **Idempotent** — Running multiple times produces consistent results

## 0.2 Output Locations

**Custom rules** in `.claude/rules/`:

| Rule Type            | File                | Purpose                         |
| -------------------- | ------------------- | ------------------------------- |
| Project context      | `project.md`        | Tech stack, structure, commands |
| MCP servers          | `mcp-servers.md`    | Custom MCP server documentation |
| Discovered standards | `[pattern-name].md` | Tribal knowledge, conventions   |

**Custom skills** in `.claude/skills/`:

| Skill Type        | Directory          | Purpose                               |
| ----------------- | ------------------ | ------------------------------------- |
| Workflows         | `[workflow-name]/` | Multi-step procedures                 |
| Tool integrations | `[tool-name]/`     | File format or API handling           |
| Domain expertise  | `[domain-name]/`   | Specialized knowledge with references |

**Note:** Use unique names (not `plan`, `implement`, `verify`, `standards-*`) for custom skills.

## 0.3 Error Handling

| Issue                          | Action                                       |
| ------------------------------ | -------------------------------------------- |
| Vexor not installed            | Use Grep/Glob for exploration, skip indexing |
| mcp-cli not available          | Skip MCP documentation                       |
| No README.md                   | Ask user for project description             |
| No package.json/pyproject.toml | Infer tech stack from file extensions        |

## 0.4 Writing Concise Rules

Rules are loaded into every session. Every word costs tokens.

- **Lead with the rule** — What to do first, why second
- **Use code examples** — Show, don't tell
- **Skip the obvious** — Don't document standard framework behavior
- **One concept per rule** — Don't combine unrelated patterns
- **Bullet points > paragraphs** — Scannable beats readable
- **Max ~100 lines per file** — Split large topics

<details>
<summary>Good vs Bad Example</summary>

**Good:**

```markdown
## API Response Envelope

All responses use `{ success, data, error }`.

- Always include `code` and `message` in errors
- Never return raw data without envelope
```

**Bad:**

```markdown
## Error Handling Guidelines

When an error occurs in our application, we have established a consistent pattern...
[3 more paragraphs]
```

</details>

---

# EXECUTION SEQUENCE

## Phase 1: Read Existing Rules & Skills

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

## Phase 2: Initialize Vexor Index

**Build/update the semantic search index before exploration.**

> **Note:** First-time indexing can take 5-15 minutes as embeddings are generated locally. Processing time depends on hardware: GPU-accelerated systems are faster, CPU-only systems take longer. Subsequent syncs are much faster due to caching.

1. **Check Vexor availability:**

   ```bash
   vexor --version
   ```

2. **If Vexor not installed:** Inform user, will use Grep/Glob for exploration instead.

3. **Build or update the index (use extended timeout for first run):**

   ```bash
   vexor index --path /absolute/path/to/project
   ```

   Use Bash with `timeout: 900000` (15 minutes) for first-time indexing.

4. **Verify index is working:**
   ```bash
   vexor search "main entry point" --top 3
   ```

## Phase 3: Explore Codebase

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

## Phase 4: Compare & Identify Gaps

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

## Phase 5: Sync Project Rule

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

## Phase 6: Sync MCP Rules

**Update MCP server documentation for user-configured servers.**

MCP servers can be configured in two locations:

| Config File            | How It Works                                             | Best For                        |
| ---------------------- | -------------------------------------------------------- | ------------------------------- |
| **`.mcp.json`**        | Lazy-loaded; instructions enter context when triggered   | Lightweight servers (few tools) |
| **`mcp_servers.json`** | Called via mcp-cli; instructions **never** enter context | Heavy servers (many tools)      |

**Key difference:** With `.mcp.json`, tool definitions load into context when used. With `mcp_servers.json`, only the CLI output enters context - zero token cost for instructions.

**Pilot Core Servers (skip these - already documented in standard rules):**

- `context7` - Library documentation
- `mem-search` - Persistent memory
- `web-search` - Web search via open-websearch
- `web-fetch` - Web page fetching via fetcher-mcp
- `grep-mcp` - GitHub code search via grep.app

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
   - Exclude Pilot core servers: `context7`, `mem-search`, `web-search`, `web-fetch`, `grep-mcp`
   - Note which config file each server comes from

#### Step 6.2: Smoke-Test MCP Servers

**Test every tool on each user server to surface auth, permission, and connectivity issues.**

For each user server discovered in Step 6.1:

1. **Load the server's tools:**
   - For `.mcp.json` servers: use `ToolSearch` with `+<server-name>` to load tools
   - For `mcp_servers.json` servers: use `mcp-cli <server-name> -d` to list tools

2. **Probe each tool with a minimal read-only call:**
   - For `.mcp.json` servers: call each tool directly with minimal/empty arguments (prefer list/get operations over create/delete)
   - For `mcp_servers.json` servers:
     ```bash
     mcp-cli <server-name>/<tool-name> '{}' 2>&1 | head -20
     ```
   - **Safety:** Only call read-only tools (list, get, search, describe). Skip tools that create, update, delete, or modify state. When unsure, check the tool schema first.

3. **Record results per tool:**

   | Result                  | Meaning                             | Action                       |
   | ----------------------- | ----------------------------------- | ---------------------------- |
   | Success (data returned) | Tool works, auth valid              | Document as working          |
   | Auth/permission error   | Missing or expired credentials      | Flag in report, note in docs |
   | Connection error        | Server unreachable or misconfigured | Flag in report               |
   | Schema/param error      | Tool works but needs specific args  | Document required params     |
   | Timeout                 | Server slow or hanging              | Flag in report               |

4. **Report findings to user:**

   ```
   MCP Server Health Check:

   ✅ polar — 3/3 tools working
   ⚠️ typefully — 4/5 tools working, 1 permission error
     └ typefully_create_draft: requires WRITE permission (read-only tools work)

   ❌ my-api — 0/2 tools working (connection refused)
   ```

5. **If issues found, use AskUserQuestion:**
   ```
   Question: "Found MCP server issues. How to proceed?"
   Header: "MCP Issues"
   Options:
   - "Document working tools only" - Skip broken tools/servers
   - "Document all with status notes" - Include broken tools with error notes
   - "Skip MCP sync" - Don't document any MCP servers
   ```

#### Step 6.3: Document User MCP Servers

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

#### Step 6.4: Write MCP Documentation

If user approves, create/update `.claude/rules/mcp-servers.md`.

Include smoke-test results from Step 6.2 — mark tools with their tested status:

````markdown
## User MCP Servers

Custom MCP servers configured for this project.

### [server-name]

**Source:** `.mcp.json` or `mcp_servers.json`
**Purpose:** [Brief description]
**Status:** ✅ All tools working | ⚠️ Partial | ❌ Broken

**Available Tools:**

| Tool          | Status                    | Description        |
| ------------- | ------------------------- | ------------------ |
| `list_items`  | ✅                        | Lists all items    |
| `create_item` | ⚠️ Needs WRITE permission | Creates a new item |

**Example Usage:**

```bash
mcp-cli server-name/tool-name '{"param": "value"}'
```
````

```

#### Step 6.5: Skip Conditions

Skip MCP documentation if:
- No `.mcp.json` AND no `mcp_servers.json` exists
- Only Pilot core servers are configured (no user servers)
- User declines documentation update

## Phase 7: Sync Existing Skills

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

## Phase 8: Discover New Rules

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

````

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
````

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

## Phase 9: Discover & Create Skills

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

## Phase 10: Summary

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

- "Share via Team Vault" - Push new assets to your team with /vault
- "Discover more standards" - Look for more patterns to document
- "Create more skills" - Look for more workflow patterns
- "Done" - Finish sync

```

**If user selects "Share via Team Vault":** Invoke `Skill(skill='vault')` to handle team sharing.

```
