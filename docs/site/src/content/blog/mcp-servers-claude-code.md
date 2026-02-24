---
slug: "mcp-servers-claude-code"
title: "Getting Started with MCP Servers in Claude Code"
description: "Set up MCP servers to give Claude Code access to documentation, databases, browsers, and APIs. Includes configuration examples and essential servers."
date: "2026-02-11"
author: "Max Ritter"
tags: [Guide, MCP]
readingTime: 5
keywords: "Claude Code MCP, Model Context Protocol, MCP servers, Claude Code tools, Context7 MCP, Claude Code browser automation"
---

# Getting Started with MCP Servers in Claude Code

The Model Context Protocol (MCP) connects Claude Code to external tools and data sources. Instead of being limited to file operations and shell commands, MCP lets Claude interact with databases, APIs, browsers, and specialized services directly.

## What MCP Does

MCP servers expose "tools" that Claude can call. Each tool has a name, description, and input schema. When Claude decides it needs external data or functionality, it calls the appropriate MCP tool — just like it calls built-in tools like Read or Bash.

Examples of what MCP servers enable:

- **Search the web** without leaving the terminal
- **Query databases** directly from conversations
- **Fetch documentation** for any library on-demand
- **Interact with project management tools** (Jira, Linear, GitHub)
- **Control a browser** for testing and automation

## Configuration

MCP servers are configured in `.mcp.json` at your project root:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstreamapi/context7-mcp@latest"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  }
}
```

Two server types are supported:

| Type | Config | Use Case |
|------|--------|----------|
| **Command** | `command` + `args` | Local processes (npx, node, python) |
| **Remote** | `url` | HTTP-based MCP servers |

## Essential MCP Servers

### Context7 — Library Documentation

Provides up-to-date documentation for thousands of libraries. Claude can look up API references, code examples, and best practices without searching the web.

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstreamapi/context7-mcp@latest"]
    }
  }
}
```

### Filesystem — Enhanced File Operations

Gives Claude additional file operations like directory tree listing, file search, and move/copy operations.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

### Browser Automation

Control a browser for E2E testing, scraping, or visual verification.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright"]
    }
  }
}
```

## Reducing Context Usage with Tool Search

By default, every MCP tool definition loads into Claude's context when the server starts. For servers with many tools, this wastes tokens.

Enable `enable_tool_search` in your project settings to defer tool loading:

```json
{
  "enableToolSearch": true
}
```

With tool search enabled, Claude discovers MCP tools on-demand rather than loading all definitions upfront. This can reduce context usage from MCP by over 90%.

## Building Custom MCP Servers

You can build MCP servers for your team's specific needs. A minimal server in TypeScript:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

server.tool("get_status", "Check system status", {}, async () => ({
  content: [{ type: "text", text: "All systems operational" }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

Register it in `.mcp.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["scripts/my-server.js"]
    }
  }
}
```

## How Pilot Extends MCP

Pilot Shell ships with pre-configured MCP servers that integrate into its workflow:

- **Persistent Memory** — Stores observations across sessions so Claude remembers past work, decisions, and learnings
- **Web Search & Fetch** — Search the web and fetch full page content without API keys
- **GitHub Code Search** — Find production code examples from millions of repositories
- **Context7** — Access library documentation directly during implementation

These servers are configured automatically during installation — no manual setup needed. They power Pilot's intelligent context management through auto-compaction and persistent memory.
