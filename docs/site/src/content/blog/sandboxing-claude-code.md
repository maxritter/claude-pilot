---
slug: "sandboxing-claude-code"
title: "Running Claude Code in a Dev Container"
description: "Run Claude Code safely inside a dev container. Full isolation, reproducible environments, and IDE support for VS Code, Cursor, and Windsurf."
date: "2026-01-22"
author: "Max Ritter"
tags: [Guide, Security]
readingTime: 4
keywords: "Claude Code dev container, devcontainer, Claude Code Docker, Claude Code isolation, dev container setup, VS Code dev container, Claude Code sandbox"
---

# Running Claude Code in a Dev Container

Claude Code runs shell commands on your machine. For full isolation, run it inside a dev container. Your host stays clean, your project gets a reproducible environment, and Claude operates in a safe sandbox.

## Why Dev Containers?

Dev containers solve multiple problems at once:

- **Isolation** — Claude can only access the container filesystem, not your host machine
- **Reproducibility** — Same tools, same versions, every time, on every machine
- **Safety** — Destructive commands stay contained — worst case, rebuild the container
- **Team consistency** — Everyone works in the same environment regardless of their OS

## How It Works

A dev container is a Docker container configured for development. Your IDE connects to it over SSH or a remote protocol, and all commands (including Claude Code) run inside it.

```
┌─────────────────────────────────────────┐
│ Host Machine                            │
│  ┌───────────────────────────────────┐  │
│  │ Dev Container                     │  │
│  │  ├── Project files (mounted)      │  │
│  │  ├── Claude Code                  │  │
│  │  ├── Node/Python/Go toolchain     │  │
│  │  └── All commands run here        │  │
│  └───────────────────────────────────┘  │
│  IDE connects via remote protocol       │
└─────────────────────────────────────────┘
```

## Setting Up a Dev Container

Create `.devcontainer/devcontainer.json` in your project:

```json
{
  "name": "My Project",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {}
  },
  "postCreateCommand": "npm install && npm install -g @anthropic-ai/claude-code",
  "forwardPorts": [3000, 8080],
  "remoteEnv": {
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}"
  }
}
```

This gives you:
- A Node.js 20 environment with TypeScript support
- Claude Code installed globally
- Your API key forwarded from the host
- Port forwarding for development servers

## IDE Support

Dev containers work with all major editors:

| Editor | How to Open |
|--------|------------|
| **VS Code** | Install "Dev Containers" extension, then `Ctrl+Shift+P` → "Reopen in Container" |
| **Cursor** | Same as VS Code — uses the same extension |
| **Windsurf** | Same as VS Code — uses the same extension |
| **JetBrains** | Built-in dev container support via Gateway |
| **Terminal only** | `devcontainer up --workspace-folder .` via the CLI |

## Running Claude Code Inside

Once inside the dev container, Claude Code works exactly as it does locally:

```bash
# Start Claude Code
claude

# Or use Pilot for the full experience
pilot
```

Everything Claude does — file edits, shell commands, test runs — happens inside the container. Your host filesystem is untouched.

## Pilot Shell + Dev Containers

Pilot's installer detects dev containers automatically. Run the installer inside the container and it sets up everything:

```bash
# Inside the dev container
curl -fsSL https://pilot-shell.com/install | bash
```

Pilot installs its hooks, rules, and tools into the container environment. When you rebuild the container, run the installer again (add it to `postCreateCommand` for automation).

## Custom Dockerfile for Full Control

For projects needing specific tools, use a Dockerfile:

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install project dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip nodejs npm git \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Install Pilot
RUN curl -fsSL https://pilot-shell.com/install | bash
```

Reference it in `devcontainer.json`:

```json
{
  "build": {
    "dockerfile": "Dockerfile"
  },
  "remoteEnv": {
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}"
  }
}
```

## Best Practices

1. **Pin versions** — Use specific image tags, not `latest`
2. **Forward your API key** — Use `remoteEnv` with `localEnv` so keys stay on your host
3. **Add `postCreateCommand`** — Automate dependency installation and tool setup
4. **Mount only what's needed** — The default mounts your project folder only
5. **Use features** — Dev container features add tools without bloating your Dockerfile

## Key Takeaway

Dev containers give you isolation without complexity. No custom sandbox profiles, no OS-specific tooling — just a standardized container that works everywhere. Claude Code runs safely inside, and your host machine stays clean.
