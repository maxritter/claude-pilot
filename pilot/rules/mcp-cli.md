## MCP-CLI

Access custom MCP servers through the command line. MCP enables interaction with external systems like GitHub, filesystems, databases, and APIs.

### MCP Server Sources

| Source | Location | How It Works |
|--------|----------|--------------|
| Pilot Core | `.claude/pilot/.mcp.json` | Built-in servers (context7, mem-search, web-search, web-fetch) |
| Claude Code | `.mcp.json` (project root) | Lazy-loaded; **instructions enter context** when triggered |
| mcp-cli | `mcp_servers.json` (project root) | Called via CLI; **instructions never enter context** |

### Which Config File to Use?

| Server Type | Config File | Why |
|-------------|-------------|-----|
| **Lightweight** (few tools, short instructions) | `.mcp.json` | Direct Claude Code integration, tool calls in conversation |
| **Heavy** (many tools, long instructions) | `mcp_servers.json` | Zero context cost - only CLI output enters context |

**Key difference:**
- `.mcp.json` → When server is triggered, all tool definitions load into context (costs tokens)
- `mcp_servers.json` → Called via `mcp-cli` command, tool definitions **never** enter context

**Rule of thumb:** If a server has >10 tools or verbose descriptions, put it in `mcp_servers.json` to keep context clean.

**Pilot Core Servers** (already documented in standard rules - don't re-document):
- `context7` - Library docs (see `context7-docs.md`)
- `mem-search` - Persistent memory (see `memory.md`)
- `web-search` - Web search (see `web-search.md`)
- `web-fetch` - Page fetching (see `web-search.md`)

**User Servers** from `.mcp.json` or `mcp_servers.json` should be documented via `/sync`.

### Configuration

MCP servers are configured in `mcp_servers.json` at the project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "my-api": {
      "url": "https://my-mcp-server.com/mcp"
    }
  }
}
```

**Server Types:**
- **Command-based:** Runs a local command (e.g., npx, node, python)
- **URL-based:** Connects to a remote HTTP MCP server

### Commands

| Command | Output |
|---------|--------|
| `mcp-cli` | List all servers and tool names |
| `mcp-cli <server>` | Show tools with parameters |
| `mcp-cli <server>/<tool>` | Get tool JSON schema |
| `mcp-cli <server>/<tool> '<json>'` | Call tool with arguments |
| `mcp-cli grep "<glob>"` | Search tools by name |

**Add `-d` to include descriptions** (e.g., `mcp-cli filesystem -d`)

### Workflow

1. **Discover**: `mcp-cli` → see available servers and tools
2. **Explore**: `mcp-cli <server>` → see tools with parameters
3. **Inspect**: `mcp-cli <server>/<tool>` → get full JSON input schema
4. **Execute**: `mcp-cli <server>/<tool> '<json>'` → run with arguments

### Examples

```bash
# List all servers and tool names
mcp-cli

# See all tools with parameters
mcp-cli filesystem

# With descriptions (more verbose)
mcp-cli filesystem -d

# Get JSON schema for specific tool
mcp-cli filesystem/read_file

# Call the tool
mcp-cli filesystem/read_file '{"path": "./README.md"}'

# Search for tools
mcp-cli grep "*file*"

# JSON output for parsing
mcp-cli filesystem/read_file '{"path": "./README.md"}' --json

# Complex JSON with quotes (use '-' for stdin input)
mcp-cli server/tool - <<EOF
{"content": "Text with 'quotes' inside"}
EOF

# Or pipe from a file/command
cat args.json | mcp-cli server/tool -

# Complex Command chaining with xargs and jq
mcp-cli filesystem/search_files '{"path": "src/", "pattern": "*.ts"}' --json | jq -r '.content[0].text' | head -1 | xargs -I {} sh -c 'mcp-cli filesystem/read_file "{\"path\": \"{}\"}"'
```


### Options

| Flag | Purpose |
|------|---------|
| `-j, --json` | JSON output for scripting |
| `-r, --raw` | Raw text content |
| `-d` | Include descriptions |

### Exit Codes

- `0`: Success
- `1`: Client error (bad args, missing config)
- `2`: Server error (tool failed)
- `3`: Network error

### When to Use mcp-cli

| Situation | Use |
|-----------|-----|
| Pilot core servers (context7, mem-search, web-search, web-fetch) | Direct tool calls via ToolSearch |
| User servers in `.mcp.json` or `mcp_servers.json` | `mcp-cli` commands |
| Discovering available tools | `mcp-cli` or `mcp-cli <server> -d` |
| Complex JSON arguments with quotes | Use stdin: `mcp-cli server/tool -` |

### Sync

Run `/sync` after adding servers to `.mcp.json` or `mcp_servers.json` to generate custom rules with tool documentation. Pilot core servers are already documented in standard rules.
