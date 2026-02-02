## Persistent Memory via Claude-Mem MCP

Search past work, decisions, and context across sessions. Follow the 3-layer workflow for token efficiency.

### 3-Layer Workflow (ALWAYS follow)

```
1. search(query) → Get index with IDs (~50-100 tokens/result)
2. timeline(anchor=ID) → Get chronological context around results
3. get_observations([IDs]) → Fetch full details ONLY for filtered IDs
```

**Never fetch full details without filtering first. 10x token savings.**

### Tools

| Tool | Purpose | Key Params |
|------|---------|------------|
| `search` | Find observations | `query`, `limit`, `type`, `project`, `dateStart`, `dateEnd` |
| `timeline` | Context around result | `anchor` (ID) or `query`, `depth_before`, `depth_after` |
| `get_observations` | Full details | `ids` (array, required) |
| `save_memory` | Save manually | `text` (required), `title`, `project` |

### Search Filters

- **type**: `bugfix`, `feature`, `refactor`, `discovery`, `decision`, `change`
- **limit**: Max results (default: 20)
- **project**: Filter by project name
- **dateStart/dateEnd**: Date range filter

### Examples

```python
# Find past work
search(query="authentication flow", limit=10)

# Get context around observation #42
timeline(anchor=42, depth_before=5, depth_after=5)

# Fetch full details for specific IDs
get_observations(ids=[42, 43, 45])

# Save important decision
save_memory(text="Chose PostgreSQL for JSONB support", title="DB Decision")
```

### Privacy

Use `<private>` tags to exclude content from storage:
```
<private>API_KEY=secret</private>
```

### Web Viewer

Access at `http://localhost:37777` for real-time observation stream.
