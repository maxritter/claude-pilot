## Web Search and Scraping with Firecrawl

**IMPORTANT: Prefer Firecrawl and Context7 over Claude Code built-in tools (WebSearch, WebFetch) for external context.**

| Need | Use This | NOT This |
|------|----------|----------|
| Web search | `firecrawl_search` | WebSearch |
| Fetch web page | `firecrawl_scrape` | WebFetch |
| Library docs | Context7 (`query-docs`) | WebSearch/WebFetch |

Use Firecrawl MCP when you need to:
- Extract content from web pages and convert to markdown
- Crawl multiple pages from a website
- Search the web and retrieve scraped results
- Discover all URLs on a website (sitemap generation)
- Get summaries, screenshots, or links from web pages

### Available Tools

#### firecrawl_scrape
Scrape a single URL and return clean content.
- Best for: Single page extraction, documentation pages, articles
- Formats: markdown, html, rawHtml, screenshot, links, summary

#### firecrawl_batch_scrape
Scrape multiple URLs in a single request.
- Best for: Known list of specific pages
- Returns: Array of content from each URL

#### firecrawl_crawl
Crawl an entire website starting from a URL.
- Best for: Comprehensive site extraction, documentation sites
- Returns: Content from multiple discovered pages
- Note: Async operation - use `firecrawl_check_crawl_status` to poll until complete

#### firecrawl_check_crawl_status
Check the status of an ongoing crawl operation.
- Use after starting a crawl to monitor progress
- Poll until status is "completed" or "failed"

#### firecrawl_map
Discover all URLs on a website.
- Best for: Site structure analysis, pre-crawl planning
- Returns: Array of discovered URLs

#### firecrawl_search
Search the web and return scraped results.
- Best for: Research, finding current information
- Returns: Search results with scraped content

#### firecrawl_agent (DO NOT USE)
**WARNING: This tool is unreliable and frequently times out. Do not use it.**
- Use `firecrawl_search` + `firecrawl_scrape` workflow instead for research tasks
- If you need multi-source data, run multiple search/scrape operations manually

#### firecrawl_agent_status (DO NOT USE)
Not needed since firecrawl_agent should not be used.

### Available Formats

When scraping, you can request different output formats:
- `markdown` - Clean markdown content (default)
- `html` - Raw HTML content
- `rawHtml` - Unprocessed HTML
- `screenshot` - Screenshot of the page
- `links` - Extract all links from the page
- `summary` - AI-generated summary of the content

### Best Practices

1. **Start with map**: For large sites, use `firecrawl_map` first to understand the site structure

2. **Use appropriate tool**:
   - Known single URL → `scrape`
   - Known multiple URLs → `batch_scrape`
   - Unknown pages on a site → `crawl`
   - Need to find pages → `search`
   - Complex multi-source research → `search` + `scrape` (NOT agent)

3. **Handle crawls automatically**: When crawling, always poll `firecrawl_check_crawl_status` until complete - don't ask users to check manually

4. **Choose the right format**: Use `summary` for quick overviews, `markdown` for full content, `links` for navigation analysis

5. **Handle rate limits**: Be mindful of API credits and rate limits on large operations

6. **JavaScript-rendered content**: Firecrawl automatically handles dynamic content - no special configuration needed

### Example Workflows

#### Research Task
1. Use `search` to find relevant pages
2. Use `scrape` on promising results for full content

#### Documentation Extraction
1. Use `map` to discover all documentation pages
2. Use `crawl` or `batch_scrape` to extract content
3. Poll `check_crawl_status` until complete

#### Quick Page Summary
1. Use `scrape` with `summary` format for a quick overview
2. Follow up with full `markdown` scrape if more detail needed
