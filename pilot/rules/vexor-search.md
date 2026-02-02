## Semantic Code Search using Vexor CLI (IMPORTANT)

Semantic file discovery via `vexor`. Use whenever locating where something is implemented/loaded/defined in a medium or large repo, or when the file location is unclear. Prefer this over manual browsing. Find files by intent (what they do), not exact text.

### When to Use Vexor

- Use `vexor` first for intent-based file discovery
- Prefer over Grep/Glob when searching by meaning, not exact text
- Great for: "where is X implemented?", "how does Y work?", "find config loading"

### Command

```bash
vexor "<QUERY>" [--path <ROOT>] [--mode <MODE>] [--ext .py,.md] [--exclude-pattern <PATTERN>] [--top 5] [--format rich|porcelain|porcelain-z]
```

### Common Flags

| Flag | Description |
|------|-------------|
| `--path/-p` | Root directory (default: current dir) |
| `--mode/-m` | Indexing/search strategy |
| `--ext/-e` | Limit file extensions (e.g., `.py,.md`) |
| `--exclude-pattern` | Exclude paths by gitignore-style pattern (repeatable) |
| `--top/-k` | Number of results |
| `--include-hidden` | Include dotfiles |
| `--no-respect-gitignore` | Include ignored files |
| `--no-recursive` | Only the top directory |
| `--format` | `rich` (default) or `porcelain`/`porcelain-z` for scripts |
| `--no-cache` | In-memory only, do not read/write index cache |

### Modes (pick the cheapest that works)

| Mode | Speed | Best For |
|------|-------|----------|
| `auto` | varies | Routes by file type (default) |
| `name` | fastest | Filename-only search |
| `head` | fast | First lines only |
| `brief` | fast | Keyword summary (good for PRDs) |
| `code` | medium | Code-aware chunking for `.py/.js/.ts` (best for codebases) |
| `outline` | medium | Markdown headings/sections (best for docs) |
| `full` | slowest | Chunk full file contents (highest recall) |

### Indexing

- **First-time indexing:** First search builds the index automatically (may take a minute). Use longer timeouts if needed.
- **Subsequent searches:** Fast - uses cached index.
- **Pre-build index:** `vexor index` to build ahead of time
- **Check index:** `vexor index --show` to check metadata
- **Rebuild index:** `vexor index --clear` to rebuild
- **Mode-specific:** Each mode (auto, code, etc.) has its own index. Use consistent modes for cache hits.

### Troubleshooting

- **Need ignored or hidden files:** Add `--include-hidden` and/or `--no-respect-gitignore`
- **Scriptable output:** Use `--format porcelain` (TSV) or `--format porcelain-z` (NUL-delimited)
- **Get detailed help:** `vexor search --help`
- **Config issues:** `vexor doctor` or `vexor config --show` diagnoses API, cache, and connectivity

### Examples

```bash
# Find CLI entrypoints / commands
vexor search "typer app commands" --top 5
```

```bash
# Search docs by headings/sections
vexor search "user authentication flow" --path docs --mode outline --ext .md --format porcelain
```

```bash
# Locate config loading/validation logic
vexor search "config loader" --path . --mode code --ext .py
```

```bash
# Exclude tests and JavaScript files
vexor search "config loader" --path . --exclude-pattern tests/** --exclude-pattern .js
```

### Tips

- First time search will index files (may take a minute). Subsequent searches are fast. Use longer timeouts if needed.
- Results return similarity ranking, exact file location, line numbers, and matching snippet preview.
- Combine `--ext` with `--exclude-pattern` to focus on a subset (exclude rules apply on top).
- Exclude patterns don't persist in the index - they're applied at search time. Rely on `.gitignore` for common exclusions.
