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

### Vexor — Semantic Code Search

**⛔ First choice for codebase search — always try before Grep, Glob, or Explore sub-agents.** Finds by intent, not exact text. Zero context cost until you read results.

Set `timeout: 60000` — indexing can happen on first run. Never run in background.

```bash
vexor "<QUERY>" [--path <ROOT>] [--mode <MODE>] [--ext .py,.md] [--exclude-pattern <PATTERN>] [--top 5]
```

| Mode | Best For |
|------|----------|
| `auto` | Default — routes by file type |
| `code` | Code-aware chunking (best for codebases) |
| `outline` | Markdown headings (best for docs) |
| `full` | Full file contents (highest recall) |

`vexor index` to pre-build, `vexor index --clear` to rebuild.


