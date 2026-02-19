## Pilot MCP Servers

All MCP tools are invoked via `mcp-cli`. **Always check schema before calling.**

```bash
mcp-cli info <server>/<tool>                    # MANDATORY first — check schema
mcp-cli call <server>/<tool> '{"param": "val"}' # Then call with correct params
```

All internal Pilot servers use the `plugin_pilot_` prefix. Pre-approved permissions are configured in `settings.json`.

---

### mem-search — Persistent Memory

**Purpose:** Search past work, decisions, and context across sessions.

**3-step workflow (token-efficient — never skip to step 3):**

| Step | Tool | Purpose |
|------|------|---------|
| 1 | `search` | Find observations → returns index with IDs |
| 2 | `timeline` | Get chronological context around an anchor ID |
| 3 | `get_observations` | Fetch full details for specific IDs only |

| Tool | Key Params |
|------|------------|
| `search` | `query`, `limit`, `type`, `project`, `dateStart`, `dateEnd` |
| `timeline` | `anchor` (ID) or `query`, `depth_before`, `depth_after` |
| `get_observations` | `ids` (array, required) |
| `save_memory` | `text` (required), `title`, `project` |

**Types:** `bugfix`, `feature`, `refactor`, `discovery`, `decision`, `change`

```bash
mcp-cli call plugin_pilot_mem-search/search '{"query": "authentication flow", "limit": 5}'
mcp-cli call plugin_pilot_mem-search/timeline '{"anchor": 22865, "depth_before": 3, "depth_after": 3}'
mcp-cli call plugin_pilot_mem-search/get_observations '{"ids": [22865, 22866]}'
mcp-cli call plugin_pilot_mem-search/save_memory '{"text": "Important finding", "title": "Short title"}'
```

---

### context7 — Library Documentation

**Purpose:** Fetch up-to-date docs and code examples for any library/framework.

**2-step workflow:**

| Step | Tool | Purpose |
|------|------|---------|
| 1 | `resolve-library-id` | Find library ID from name |
| 2 | `query-docs` | Query docs using the resolved ID |

```bash
mcp-cli call plugin_pilot_context7/resolve-library-id '{"query": "how to use fixtures", "libraryName": "pytest"}'
# → returns libraryId like "/pypi/pytest"
mcp-cli call plugin_pilot_context7/query-docs '{"libraryId": "/pypi/pytest", "query": "how to create and use fixtures"}'
```

Use descriptive queries. Max 3 calls per question per tool.

---

### web-search — Web Search

**Purpose:** Search the web via DuckDuckGo, Bing, or Exa (no API keys needed).

| Tool | Purpose | Key Params |
|------|---------|------------|
| `search` | Web search | `query` (required), `limit` (1-50), `engines` (duckduckgo/bing/exa) |
| `fetchGithubReadme` | Fetch GitHub repo README | `url` |
| `fetchLinuxDoArticle` | Fetch linux.do article | `url` |
| `fetchCsdnArticle` | Fetch CSDN article | `url` |
| `fetchJuejinArticle` | Fetch Juejin article | `url` |

```bash
mcp-cli call plugin_pilot_web-search/search '{"query": "Python asyncio best practices 2026", "limit": 5}'
mcp-cli call plugin_pilot_web-search/fetchGithubReadme '{"url": "https://github.com/astral-sh/ruff"}'
```

---

### grep-mcp — GitHub Code Search

**Purpose:** Find real-world code examples from 1M+ public repositories.

**Single tool:** `searchGitHub`

| Param | Type | Description |
|-------|------|-------------|
| `query` | string (required) | Literal code pattern (not keywords) |
| `language` | string[] | Filter by language: `["Python"]`, `["TypeScript", "TSX"]` |
| `repo` | string | Filter by repo: `"vercel/next-auth"` |
| `path` | string | Filter by file path: `"src/components/"` |
| `useRegexp` | boolean | Regex mode. Prefix with `(?s)` for multiline |
| `matchCase` | boolean | Case-sensitive search |

```bash
mcp-cli call plugin_pilot_grep-mcp/searchGitHub '{"query": "FastMCP", "language": ["Python"]}'
mcp-cli call plugin_pilot_grep-mcp/searchGitHub '{"query": "(?s)useEffect\\(.*cleanup", "useRegexp": true, "language": ["TypeScript"]}'
```

---

### web-fetch — Web Page Fetching

**Purpose:** Fetch full web pages via Playwright (no truncation, handles JS-rendered pages).

| Tool | Purpose | Key Params |
|------|---------|------------|
| `fetch_url` | Fetch single page | `url` (required), `timeout`, `extractContent`, `maxLength` |
| `fetch_urls` | Fetch multiple pages | `urls` (array, required), same options as above |
| `browser_install` | Install Chromium | `withDeps`, `force` |

```bash
mcp-cli call plugin_pilot_web-fetch/fetch_url '{"url": "https://docs.example.com/api"}'
mcp-cli call plugin_pilot_web-fetch/fetch_urls '{"urls": ["https://a.com", "https://b.com"]}'
```

Options: `waitUntil` (load/domcontentloaded/networkidle), `returnHtml`, `waitForNavigation` (for anti-bot pages).

---

### Tool Selection Quick Reference

| Need | Server | Tool |
|------|--------|------|
| Past work / decisions | mem-search | `search` → `timeline` → `get_observations` |
| Library/framework docs | context7 | `resolve-library-id` → `query-docs` |
| Web search | web-search | `search` |
| GitHub README | web-search | `fetchGithubReadme` |
| Production code examples | grep-mcp | `searchGitHub` |
| Full web page content | web-fetch | `fetch_url` / `fetch_urls` |
