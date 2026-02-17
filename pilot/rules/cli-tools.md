## CLI Tools

### Pilot CLI

The `pilot` binary is at `~/.pilot/bin/pilot`. Do NOT call commands not listed here.

**Session & Context:**

| Command | Purpose |
|---------|---------|
| `pilot check-context --json` | Get context usage % (informational only) |
| `pilot register-plan <path> <status>` | Associate plan with session |

**Worktree:** `pilot worktree detect|create|diff|sync|cleanup|status --json <slug>`

Slug = plan filename without date prefix and `.md`. `create` auto-stashes uncommitted changes.

**License:** `pilot activate <key>`, `pilot deactivate`, `pilot status`, `pilot verify`, `pilot trial --check|--start`

**Other:** `pilot greet`, `pilot statusline`

**Do NOT exist:** ~~`pilot pipe`~~, ~~`pilot init`~~, ~~`pilot update`~~

---

### MCP-CLI

Access custom MCP servers through the command line.

| Source | Location | Context Cost |
|--------|----------|-------------|
| Pilot Core | `.claude/pilot/.mcp.json` | Always loaded (context7, mem-search, web-search, web-fetch, grep-mcp) |
| Claude Code | `.mcp.json` | Tool defs enter context when triggered |
| mcp-cli | `mcp_servers.json` | **Zero** — only CLI output enters context |

**Rule of thumb:** Servers with >10 tools → `mcp_servers.json`. Lightweight → `.mcp.json`.

| Command | Output |
|---------|--------|
| `mcp-cli` | List all servers and tools |
| `mcp-cli <server>` | Show tools with parameters |
| `mcp-cli <server>/<tool>` | Get JSON schema |
| `mcp-cli <server>/<tool> '<json>'` | Call tool |

Add `-d` for descriptions, `-j` for JSON, `-r` for raw. Stdin for complex JSON: `mcp-cli server/tool - <<EOF ... EOF`

**Routing:** Pilot core servers → direct tool calls via ToolSearch. User servers → `mcp-cli`. Run `/sync` after adding servers.

---

### Vexor — Semantic Code Search

First choice for codebase exploration. Find files by intent, not exact text. Outperforms Explore sub-agents on large codebases — zero context cost until you read results, no token waste from sub-agent transcripts.

Important: Set `timeout: 60000` on Bash as indexing can happen, never run in background.

```bash
vexor "<QUERY>" [--path <ROOT>] [--mode <MODE>] [--ext .py,.md] [--exclude-pattern <PATTERN>] [--top 5]
```

| Mode | Best For |
|------|----------|
| `auto` | Default — routes by file type |
| `code` | Code-aware chunking (best for codebases) |
| `outline` | Markdown headings (best for docs) |
| `full` | Full file contents (highest recall) |

First search builds index automatically. `vexor index` to pre-build, `vexor index --clear` to rebuild.
