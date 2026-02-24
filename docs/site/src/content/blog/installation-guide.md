---
slug: "installation-guide"
title: "Claude Code Installation: Windows, Mac & Linux Setup"
description: "Platform-specific Claude Code install guide with troubleshooting and community-tested fixes for Windows, macOS, and Linux environments."
date: "2025-08-23"
author: "Max Ritter"
tags: [Guide]
readingTime: 4
keywords: "claude, code, guide, installation, linux, mac, setup, windows"
---

# Claude Code Installation: Windows, Mac & Linux Setup

Platform-specific Claude Code install guide with troubleshooting and community-tested fixes for Windows, macOS, and Linux environments.

**Problem**: You want to install Claude Code but don't know where to start. Here's the fastest path from zero to working AI terminal. See our [complete guide](/blog/guide) for an overview of all Claude Code capabilities.

## [How to Install Claude Code: Quick Start](#how-to-install-claude-code-quick-start)

Anthropic now offers **native installers** as the recommended method. No Node.js required:

**Windows PowerShell (Recommended):**

```p-4
irm https://claude.ai/install.ps1 | iex
```

**macOS / Linux:**

```p-4
curl -fsSL https://claude.ai/install.sh | bash
```

**Homebrew (macOS/Linux):**

```p-4
brew install --cask claude-code
```

Run `claude --version` to verify. **Success looks like**: A version number displays without errors.

For details on what the native installer does and troubleshooting, see our [Native Installer Guide](/blog/guide/native-installer).

If that worked, skip to [Configure Your API Key](#configure-your-api-key). If not, follow your platform-specific steps below.

## [Step-by-Step: Install Claude Code on Any Platform](#step-by-step-install-claude-code-on-any-platform)

**Before you install Claude Code**, verify you have:

1. Terminal access (Command Prompt, PowerShell, or Bash)
2. An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
3. Node.js 18+ (only required for npm installation method)

### [Install Claude Code on Windows](#install-claude-code-on-windows)

Windows now supports multiple installation options. Choose the one that fits your workflow:

**Option 1: Native Windows (Recommended)**

```p-4
# PowerShell (Run as Administrator)
irm https://claude.ai/install.ps1 | iex
claude --version
```

**Option 2: Git Bash**

Install [Git for Windows](https://git-scm.com/downloads/win), then:

```p-4
curl -fsSL https://claude.ai/install.sh | bash
claude --version
```

**Option 3: WSL (Ubuntu)**

```p-4
# Install WSL if needed (PowerShell as Administrator)
wsl --install -d Ubuntu

# Inside Ubuntu terminal
curl -fsSL https://claude.ai/install.sh | bash
claude --version
```

**Windows users**: The native installer no longer requires Node.js. WSL users should run Claude Code from their Linux terminal.

> **Pilot Shell users on Windows**: Pilot requires a Unix environment. If you're on Windows without WSL2, use the **Dev Container** option in the Pilot installer — it gives you a fully configured Linux environment via Docker Desktop. With WSL2, you can install Pilot locally inside your Ubuntu terminal.

### [Install Claude Code on macOS](#install-claude-code-on-macos)

**Option 1: Homebrew (Recommended)**

```p-4
brew install --cask claude-code
claude --version
```

**Option 2: Native Installer**

```p-4
curl -fsSL https://claude.ai/install.sh | bash
claude --version
```

**Option 3: npm (if you prefer Node.js)**

```p-4
npm install -g @anthropic-ai/claude-code
 
# If you see "command not found", fix PATH:
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
claude --version
```

### [Install Claude Code on Linux](#install-claude-code-on-linux)

**Option 1: Native Installer (Recommended)**

```p-4
curl -fsSL https://claude.ai/install.sh | bash
claude --version
```

**Option 2: Homebrew**

```p-4
brew install --cask claude-code
claude --version
```

**Option 3: npm (requires Node.js 18+)**

```p-4
# Create user npm directory (prevents sudo requirements)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
 
# Install Claude Code
npm install -g @anthropic-ai/claude-code
claude --version
```

## [Configure Your API Key](#configure-your-api-key)

After you install Claude Code successfully, configure authentication:

```p-4
claude
# Paste your API key when prompted
```

**Get your API key**: Visit [console.anthropic.com](https://console.anthropic.com), create an account, navigate to API Keys, and generate a new key starting with `sk-`.

## [Verify Your Installation](#verify-your-installation)

Test your Claude Code installation:

```p-4
claude --version    # Shows version number
claude doctor       # Runs diagnostics
```

**Quick functionality test**:

```p-4
mkdir test-project && cd test-project
echo "console.log('Hello!');" > test.js
claude
```

In the Claude prompt: "Read test.js and explain it"

**Success**: Claude reads the file and explains the JavaScript code.

## [Common Errors When You Install Claude Code](#common-errors-when-you-install-claude-code)

### [Error: "Command Not Found"](#error-command-not-found)

**Cause**: PATH configuration missing after install

**Fix**:

```p-4
which claude    # Check if installed
npm list -g @anthropic-ai/claude-code
 
# Add to PATH manually
echo 'export PATH="$PATH:/usr/local/lib/node_modules/@anthropic-ai/claude-code/bin"' >> ~/.bashrc
source ~/.bashrc
```

### [Error: "EBADPLATFORM"](#error-ebadplatform)

**Cause**: npm installation attempted on unsupported platform configuration

**Fix**: Use the native installer instead of npm:

```p-4
# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

### [Error: "EACCES Permission Denied"](#error-eacces-permission-denied)

**Cause**: npm requires sudo (insecure practice)

**Fix**: Configure user-level npm directory (see Linux section above). This works on all platforms.

### [Nuclear Reset (Fixes 95% of Issues)](#nuclear-reset-fixes-95-of-issues)

When everything fails, reset completely:

```p-4
npm uninstall -g @anthropic-ai/claude-code
rm -rf ~/.claude ~/.npm/_cacache
npm cache clean --force
npm install -g @anthropic-ai/claude-code
claude --version
```

## [What to Do After You Install Claude Code](#what-to-do-after-you-install-claude-code)

Once `claude --version` works without errors:

1. **Build your first project**: [First Project Guide](/blog/guide/first-project)
2. **Learn the interface**: [What is Claude Code](/blog/guide/what-is-claude-code)
3. **Configure settings**: [Configuration Basics](/blog/guide/configuration-basics)
4. **Fix common problems**: [Troubleshooting Guide](/blog/guide/troubleshooting)
5. **See real examples**: [Examples & Templates](/blog/guide/examples-templates)

**Pro tip**: Run `claude doctor` anytime something feels broken. It auto-detects most configuration issues and suggests fixes.

Last updated on

[Previous

What is Claude Code](/blog/guide/what-is-claude-code)[Next

Native Installer](/blog/guide/native-installer)
