---
description: Initialize project context and indexing with Claude CodePro
model: opus
---
# SETUP MODE: Project Initialization and Context Building

**Purpose:** Scan project structure, create project documentation, initialize semantic search, configure MCP tools documentation, and store project knowledge in persistent memory.

---

## ⚠️ IMPORTANT: MCP Funnel Configuration (Read First!)

**Before running /setup, ensure your MCP servers are configured in `mcp-funnel.json`.**

MCP Funnel acts as a proxy that dynamically loads tools from multiple MCP servers without consuming context tokens until needed. This setup command will:
1. Discover all tools available through MCP Funnel
2. Generate `.claude/rules/custom/funnel-tools.md` documenting those tools
3. This documentation becomes part of your project context for future sessions

**To add MCP servers to MCP Funnel:**
1. Edit your `mcp-funnel.json` configuration file
2. Add servers that are token-consuming (large tool lists) to the funnel
3. Servers added to MCP Funnel are loaded on-demand, saving context tokens

**Example mcp-funnel.json structure:**
```json
{
  "servers": {
    "pypi-query": { "command": "uvx", "args": ["pypi-query-mcp"] },
    "aws-pricing": { "command": "uvx", "args": ["awslabs.aws-pricing-mcp-server"] }
  }
}
```

---

## Execution Sequence

### Phase 0: MCP Funnel Check (MANDATORY FIRST STEP)

**Ask the user:**

> **Have you configured your MCP servers in `mcp-funnel.json`?**
>
> MCP Funnel allows you to add token-consuming MCP servers that will be loaded on-demand.
> During this setup, I'll discover all tools from MCP Funnel and generate documentation
> at `.claude/rules/custom/funnel-tools.md` that will be included in future sessions.
>
> Options:
> 1. **Yes, continue** - Proceed with setup
> 2. **Wait** - I'll configure mcp-funnel.json first, then re-run /setup
> 3. **Skip funnel tools** - Continue without generating funnel-tools.md

**If user chooses "Wait":** Stop execution and inform them to re-run `/setup` after configuration.

**If user chooses "Skip":** Skip Phase 4 (Funnel Tools Generation) but continue with other phases.

### Phase 1: Project Discovery

1. **Scan Directory Structure:**
   ```bash
   tree -L 3 -I 'node_modules|.git|__pycache__|*.pyc|dist|build|.venv|.next|coverage|.cache|cdk.out|.mypy_cache|.pytest_cache|.ruff_cache'
   ```

2. **Identify Technologies by checking for:**
   - `package.json` → Node.js/JavaScript/TypeScript
   - `tsconfig.json` → TypeScript
   - `pyproject.toml`, `requirements.txt`, `setup.py` → Python
   - `Cargo.toml` → Rust
   - `go.mod` → Go
   - `pom.xml`, `build.gradle` → Java
   - `Gemfile` → Ruby
   - `composer.json` → PHP

3. **Identify Frameworks by checking for:**
   - React, Vue, Angular, Svelte (frontend)
   - Next.js, Nuxt, Remix (fullstack)
   - Express, Fastify, NestJS (Node backend)
   - Django, FastAPI, Flask (Python backend)
   - Check `package.json` dependencies or `pyproject.toml` for framework indicators

4. **Analyze Configuration:**
   - Read README.md if exists for project description
   - Check for .env.example to understand required environment variables
   - Identify build tools (webpack, vite, rollup, esbuild)
   - Check testing frameworks (jest, pytest, vitest, mocha)

### Phase 2: Create Project Documentation

1. **Check if project.md already exists:**
   - If exists, ask user: "project.md already exists. Overwrite? (y/N)"
   - If user says no, skip to Phase 3

2. **Generate `.claude/rules/custom/project.md` with this structure:**

```markdown
# Project: [Project Name from package.json/pyproject.toml or directory name]

**Last Updated:** [Current date/time]

## Overview

[Brief description from README.md or ask user]

## Technology Stack

- **Language:** [Primary language]
- **Framework:** [Main framework if any]
- **Build Tool:** [Vite, Webpack, etc.]
- **Testing:** [Jest, Pytest, etc.]
- **Package Manager:** [npm, yarn, pnpm, uv, cargo, etc.]

## Directory Structure

```
[Simplified tree output - key directories only]
```

## Key Files

- **Configuration:** [List main config files]
- **Entry Points:** [Main entry files like src/index.ts, main.py]
- **Tests:** [Test directory location]

## Development Commands

- **Install:** [e.g., `npm install` or `uv sync`]
- **Dev:** [e.g., `npm run dev` or `uv run python main.py`]
- **Build:** [e.g., `npm run build`]
- **Test:** [e.g., `npm test` or `uv run pytest`]
- **Lint:** [e.g., `npm run lint` or `uv run ruff check`]

## Architecture Notes

[Brief description of architecture patterns used, e.g., "Monorepo with shared packages", "Microservices", "MVC pattern"]

## Additional Context

[Any other relevant information discovered or provided by user]
```

3. **Write the file:**
   ```python
   Write(file_path=".claude/rules/custom/project.md", content=generated_content)
   ```

### Phase 3: Initialize Semantic Search

1. **Get current working directory as absolute path:**
   ```bash
   pwd
   ```

2. **Check Claude Context indexing status:**
   ```python
   mcp__claude-context__get_indexing_status(path="/absolute/path/to/project")
   ```

3. **If not indexed or index is stale, start indexing:**
   ```python
   mcp__claude-context__index_codebase(
       path="/absolute/path/to/project",
       splitter="ast",
       force=False
   )
   ```

   Note: Ignore patterns are configured directly in the MCP server, no need to pass them here.

4. **Monitor indexing progress (check every 10 seconds until complete):**
   ```python
   # Keep checking until status shows "indexed" or error
   mcp__claude-context__get_indexing_status(path="/absolute/path/to/project")
   ```

5. **Verify indexing with a test search:**
   ```python
   mcp__claude-context__search_code(
       path="/absolute/path/to/project",
       query="main entry point function",
       limit=3
   )
   ```

### Phase 4: Generate Funnel Tools Documentation

**Skip this phase if user chose "Skip funnel tools" in Phase 0.**

1. **Discover all available tools from MCP Funnel:**
   ```python
   # Discover tools without enabling (just to see what's available)
   mcp__mcp-funnel__discover_tools_by_words(words="", enable=false)
   ```

2. **For each MCP server discovered, get tool schemas:**
   ```python
   # Get schema for each tool to understand required/optional parameters
   mcp__mcp-funnel__get_tool_schema(tool="server__tool_name")
   ```

3. **Generate `.claude/rules/custom/funnel-tools.md` with this structure:**

```markdown
## Funnel Tools

**Discover tools if not loaded:**
```
mcp__mcp-funnel__discover_tools_by_words(words="keyword", enable=true)
```

### [Server Name] (`server-prefix__*`)

[Brief description of what this server provides]

| Tool | Required | Optional | Description |
|------|----------|----------|-------------|
| `tool_name` | `param1`, `param2` | `optional_param` | What it does |

**Use case:** [When to use this server]

**Workflow:** [If applicable, show typical tool call sequence]

---

## Usage Examples

```python
# Example calls via bridge
mcp__mcp-funnel__bridge_tool_request(
    tool="server__tool_name",
    arguments={"param": "value"}
)
```
```

4. **Write the funnel-tools.md file:**
   ```python
   Write(file_path=".claude/rules/custom/funnel-tools.md", content=generated_content)
   ```

### Phase 5: Completion Summary

Display a summary like:

```
┌─────────────────────────────────────────────────────────────┐
│                     Setup Complete!                         │
├─────────────────────────────────────────────────────────────┤
│ Created:                                                    │
│   ✓ .claude/rules/custom/project.md                        │
│   ✓ .claude/rules/custom/funnel-tools.md (if generated)    │
│                                                             │
│ Semantic Search:                                            │
│   ✓ Claude Context index initialized                       │
│   ✓ Excluded: node_modules, __pycache__, .venv, cdk.out... │
│   ✓ Indexed X files                                        │
│                                                             │
│ MCP Funnel:                                                 │
│   ✓ Discovered X servers with Y tools                      │
│   ✓ Documentation generated for future sessions            │
├─────────────────────────────────────────────────────────────┤
│ Next Steps:                                                 │
│   1. Run 'ccp' to reload with new rules in context         │
│   2. Use /plan to create a feature plan                    │
│   3. Use /implement to execute the plan                    │
│   4. Use /verify to verify implementation                  │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

- **If tree command not available:** Use `ls -la` recursively with depth limit
- **If indexing fails:** Log error, continue with other steps, suggest manual indexing
- **If README.md missing:** Ask user for brief project description
- **If package.json/pyproject.toml missing:** Infer from file extensions and directory structure
- **If MCP Funnel unavailable:** Skip Phase 4, inform user they can add it later
- **If indexing gets stuck:** Clear index and retry with `force=true`

## Important Notes

- Always use absolute paths for MCP tools
- Don't overwrite existing project.md without confirmation
- Keep project.md concise - it will be included in every Claude Code session
- Focus on information that helps Claude understand how to work with this codebase
- The funnel-tools.md file documents MCP servers for on-demand tool loading
- Users can update mcp-funnel.json anytime and re-run /setup to regenerate docs

## Indexing Exclusion Patterns

The following patterns are excluded from semantic indexing to keep the index fast and relevant:

| Pattern | Reason |
|---------|--------|
| `node_modules/**` | NPM dependencies |
| `__pycache__/**`, `*.pyc`, `*.pyo` | Python bytecode |
| `.venv/**`, `venv/**`, `.uv/**` | Python virtual environments |
| `.git/**` | Git internals |
| `dist/**`, `build/**`, `target/**` | Build outputs |
| `cdk.out/**` | CDK synthesized CloudFormation |
| `.mypy_cache/**`, `.pytest_cache/**`, `.ruff_cache/**` | Tool caches |
| `coverage/**`, `.coverage/**` | Test coverage data |
| `*.egg-info/**` | Python packaging |
| `.next/**` | Next.js build output |
| `.tox/**` | Tox testing environments |
| `.cache/**` | Generic cache directories |
| `.terraform/**` | Terraform state/modules |
| `vendor/**` | Vendored dependencies |
