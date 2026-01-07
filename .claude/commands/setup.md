---
description: Initialize project context and indexing with Claude CodePro
model: opus
---
# SETUP MODE: Project Initialization and Context Building

**Purpose:** Scan project structure, create project documentation, initialize semantic search, and store project knowledge in persistent memory.

---

## Execution Sequence

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

### Phase 3: Initialize Semantic Search with Vexor

1. **Check if Vexor is available:**
   ```bash
   vexor --version
   ```

   If not installed, inform user and provide installation link.

2. **Build the index:**
   ```bash
   vexor index --path /absolute/path/to/project
   ```

   Note: Index respects `.gitignore` automatically. Exclude patterns passed to `vexor index` or `vexor search` are applied as filters at search time (not persisted in index).

3. **Verify with a test search:**
   ```bash
   vexor search "main entry point" --top 3
   ```

4. **Check index metadata:**
   ```bash
   vexor index --show
   ```

### Phase 4: Completion Summary

Display a summary like:

```
┌─────────────────────────────────────────────────────────────┐
│                     Setup Complete!                         │
├─────────────────────────────────────────────────────────────┤
│ Created:                                                    │
│   ✓ .claude/rules/custom/project.md                        │
│                                                             │
│ Semantic Search (Vexor):                                    │
│   ✓ Vexor CLI available                                    │
│   ✓ Initial index built (respects .gitignore)              │
│   ✓ Test search successful                                 │
│                                                             │
│ Plugins Available:                                          │
│   ✓ Context7 - Library documentation lookup                │
│   ✓ Firecrawl - Web scraping, search, and content extraction│
│   ✓ Claude Mem - Persistent memory                         │
│   ✓ LSP Servers - Python (Pyright) & TypeScript            │
├─────────────────────────────────────────────────────────────┤
│ Next Steps:                                                 │
│   1. Run 'ccp' to reload with new rules in context         │
│   2. Use /plan to create a feature plan                    │
│   3. Use /implement to execute the plan                    │
│   4. Use /verify to verify implementation                  │
│                                                             │
│ Semantic Search Usage:                                      │
│   vexor search "your query" --mode code --top 5            │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

- **If tree command not available:** Use `ls -la` recursively with depth limit
- **If Vexor not installed:** Inform user and provide installation link, continue with other steps
- **If Vexor indexing is slow:** Run `vexor search` with `--no-cache` to rebuild the index fresh
- **If README.md missing:** Ask user for brief project description
- **If package.json/pyproject.toml missing:** Infer from file extensions and directory structure
- **If Vexor search returns no results:** Check path is correct, try broader query, or use `--no-respect-gitignore` if files are ignored

## Important Notes

- Use absolute paths when specifying `--path` for Vexor
- Don't overwrite existing project.md without confirmation
- Keep project.md concise - it will be included in every Claude Code session
- Focus on information that helps Claude understand how to work with this codebase
- Vexor respects `.gitignore` by default - use `--no-respect-gitignore` to include ignored files

## Indexing Notes

- Vexor respects `.gitignore` by default - no need for manual exclusions
- `--exclude-pattern` flags filter results at search time (not persisted in index)
- Use `--no-respect-gitignore` to include ignored files, `--include-hidden` for dotfiles
