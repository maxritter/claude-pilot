## Web Search and Scraping (No API Key Required)

**Use MCP tools for web access. Built-in WebSearch/WebFetch are blocked by hook.**

| Need | Tool | MCP Server |
|------|------|------------|
| Web search | `web-search/search` | open-websearch |
| GitHub README | `web-search/fetchGithubReadme` | open-websearch |
| Fetch full page | `web-fetch/fetch_url` | fetcher-mcp |
| Fetch multiple | `web-fetch/fetch_urls` | fetcher-mcp |
| Library docs | Context7 | (see `context7-docs.md`) |

### open-websearch Tools

| Tool | Description |
|------|-------------|
| `search` | DuckDuckGo/Bing search (no API key) |
| `fetchGithubReadme` | Fetch GitHub repo READMEs directly |
| `fetchCsdnArticle` | Fetch CSDN articles |
| `fetchJuejinArticle` | Fetch Juejin articles |
| `fetchLinuxDoArticle` | Fetch linux.do posts |

### fetcher-mcp Tools

| Tool | Description |
|------|-------------|
| `fetch_url` | Full page content via Playwright (no truncation) |
| `fetch_urls` | Batch fetch multiple URLs |
| `browser_install` | Install browser for Playwright |

**Options for fetch_url:**
- `extractContent`: Extract main content only (default: true)
- `waitUntil`: Page load state (`domcontentloaded`, `networkidle`)
- `timeout`: Request timeout in ms
- `returnHtml`: Return raw HTML instead of markdown

### Why MCP Tools Over Built-in?

| Built-in | Problem | MCP Alternative |
|----------|---------|-----------------|
| `WebSearch` | Limited results, no scraping | `web-search/search` |
| `WebFetch` | Truncates at ~8KB | `web-fetch/fetch_url` (full content) |

**MCP advantages:**
- Full page content without truncation
- Playwright renders JavaScript
- No API keys required
- GitHub README fetching built-in

### Examples via mcp-cli

```bash
# Search the web
mcp-cli web-search/search '{"query": "python async patterns", "limit": 5}'

# Fetch a full web page
mcp-cli web-fetch/fetch_url '{"url": "https://example.com/docs"}'

# Fetch GitHub README
mcp-cli web-search/fetchGithubReadme '{"url": "https://github.com/owner/repo"}'

# Batch fetch multiple URLs
mcp-cli web-fetch/fetch_urls '{"urls": ["https://a.com", "https://b.com"]}'
```

### When to Use What

| Situation | Use |
|-----------|-----|
| Find information on a topic | `web-search/search` |
| Read a specific web page | `web-fetch/fetch_url` |
| Get a GitHub repo's README | `web-search/fetchGithubReadme` |
| Library/framework docs | Context7 (faster, more accurate) |
| Multiple pages at once | `web-fetch/fetch_urls` |
