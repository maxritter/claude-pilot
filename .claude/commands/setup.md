---
description: Initialize project context and indexing
---
# SETUP MODE: Project Initialization and Context Building

**Purpose:** Scan project structure, create project documentation, initialize semantic search, and store project knowledge in persistent memory.

## Execution Sequence

### Phase 1: Project Discovery

1. **Scan Directory Structure:**
   ```bash
   tree -L 3 -I 'node_modules|.git|__pycache__|*.pyc|dist|build|.venv|.next|coverage|.cache'
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

4. **Verify indexing with a test search:**
   ```python
   mcp__claude-context__search_code(
       path="/absolute/path/to/project",
       query="main entry point function",
       limit=3
   )
   ```

### Phase 4: Store in Persistent Memory

1. **Store project context in Cipher:**
   ```python
   mcp__cipher__ask_cipher(f"""
   Store: Project setup completed for '{project_name}'.

   Project Type: {language} / {framework}
   Key Technologies: {tech_list}
   Directory Structure: {key_dirs}
   Entry Points: {entry_files}

   Development Commands:
   - Install: {install_cmd}
   - Dev: {dev_cmd}
   - Test: {test_cmd}
   - Build: {build_cmd}

   Architecture: {architecture_notes}

   This context should be recalled when working on this project.
   """)
   ```

### Phase 5: Completion Summary

Display a summary like:

```
Setup Complete!

Created:
  .claude/rules/custom/project.md

Semantic Search:
  Claude Context index initialized (or "already indexed")
  Indexed X files

Persistent Memory:
  Project context stored in Cipher

Next Steps:
  1. Run 'ccp' to reload with rules auto-generated into context
  2. Use /plan to start building features
  3. Reference project context with: "check project.md" or ask Cipher
```

## Error Handling

- **If tree command not available:** Use `ls -la` recursively with depth limit
- **If indexing fails:** Log error, continue with other steps, suggest manual indexing
- **If Cipher unavailable:** Log warning, continue - project.md still provides value
- **If README.md missing:** Ask user for brief project description
- **If package.json/pyproject.toml missing:** Infer from file extensions and directory structure

## Important Notes

- Always use absolute paths for MCP tools
- Don't overwrite existing project.md without confirmation
- Keep project.md concise - it will be included in every Claude Code session
- Focus on information that helps Claude understand how to work with this codebase
