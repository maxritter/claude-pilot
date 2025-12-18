## MCP Tools - Core Workflow Integration

### Claude Context - Semantic Code Search

**Tools:**
- `mcp_claude-context_index_codebase` - Index repository for search
- `mcp_claude-context_search_code` - Find code patterns semantically
- `mcp_claude-context_get_indexing_status` - Check if index is ready

**Search patterns:**
```
"authentication middleware implementation"
"error handling in API routes"
"database connection pooling"
"test fixtures for user model"
```

**When to use:**
- Finding existing implementations to follow patterns
- Locating where specific functionality lives
- Understanding how features are structured
- Before writing new code: Search for similar existing code

**Workflow:**
1. Check indexing status first
2. If not indexed, index the codebase
3. Search for relevant patterns
4. Review results to understand existing approaches

### Tavily - Web Search & Site Mapping ONLY

**IMPORTANT:** Use Tavily ONLY for web searches and site mapping. **NEVER use Tavily to fetch/extract content from specific URLs.**

| Tool | Args | Use Case |
|------|------|----------|
| `mcp__tavily__tavily-search` | `query`, `max_results?`, `search_depth?`, `topic?` | General web search |
| `mcp__tavily__tavily-map` | `url`, `max_depth?`, `limit?` | Map website structure |

**⚠️ DO NOT USE:** `tavily-extract` or `tavily-crawl` for fetching URL content. Use Ref or WebFetch instead.

**Search options:**
- `search_depth`: `basic` (default) or `advanced`
- `topic`: `general` (default) or `news`
- `time_range`: `day`, `week`, `month`, `year`
- `include_domains` / `exclude_domains`: Filter by domain

**Examples:**
```python
# Web search
mcp__tavily__tavily-search(query="Python async best practices 2025", max_results=5)
mcp__tavily__tavily-search(query="AWS CDK updates", topic="news", time_range="month")

# Map website structure (discover URLs, don't fetch content)
mcp__tavily__tavily-map(url="https://docs.example.com", max_depth=2, limit=20)
```

**When to use Tavily:**
- General web searches
- News and current events searches
- Discovering site structure (mapping)

**When NOT to use Tavily:**
- Fetching content from a specific URL → Use `mcp__Ref__ref_read_url` or `WebFetch`
- Reading documentation pages → Use `mcp__Ref__ref_read_url`
- Extracting article content → Use `WebFetch`

---

### Ref - Library Documentation & URL Reading

**Use Ref for library/framework documentation and reading specific URLs.** Context-efficient - processes content before returning.

| Tool | Args | Use Case |
|------|------|----------|
| `mcp__Ref__ref_search_documentation` | `query` | Search docs for libraries, frameworks, APIs |
| `mcp__Ref__ref_read_url` | `url` | Read/crawl specific URL content |

**Query tips:**
- Include language and framework: `"Python pytest fixtures"`, `"TypeScript AWS CDK S3"`
- Be specific: `"SQLAlchemy async session management"` not just `"SQLAlchemy"`

**Examples:**
```python
# Search for library documentation
mcp__Ref__ref_search_documentation(query="Python pydantic v2 model validation")
mcp__Ref__ref_search_documentation(query="TypeScript zod schema inference")
mcp__Ref__ref_search_documentation(query="pytest parametrize fixtures")

# Read/crawl a specific URL
mcp__Ref__ref_read_url(url="https://docs.pydantic.dev/latest/concepts/models/")
mcp__Ref__ref_read_url(url="https://blog.example.com/article")
```

**When to use Ref:**
- Library API documentation
- Framework guides and tutorials
- Code examples for specific libraries
- Reading/crawling specific URL content

### IDE - Diagnostics and Execution

**Tools:**
- `mcp_ide_getDiagnostics` - Get errors, warnings, and type issues
- `mcp_ide_executeCode` - Run code in Jupyter kernel (notebooks only)

**Mandatory usage:**
- **Before starting work:** Check existing diagnostics to understand current state
- **After every file change:** Verify no new errors introduced
- **Before marking complete:** Confirm clean diagnostics

**Never skip diagnostics.** Passing tests don't guarantee no type errors or linting issues.

### MCP Funnel - Tool Discovery

**Tools:**
- `mcp_mcp-funnel_discover_tools_by_words` - Find tools by keywords
- `mcp_mcp-funnel_get_tool_schema` - Get tool parameters
- `mcp_mcp-funnel_bridge_tool_request` - Execute discovered tools

**When to use:**
- Need specialized functionality not in core tools
- Exploring available MCP servers
- Extending capabilities for specific tasks

**Pattern:**
1. Discover tools: `discover_tools_by_words("database migration")`
2. Get schema: `get_tool_schema("discovered_tool_name")`
3. Execute: `bridge_tool_request("tool_name", {args})`
