---
slug: "cross-platform-hooks"
title: "Claude Code Hooks on Windows, Linux, and macOS (2026)"
description: "Claude Code hooks that work on Windows, Linux, and macOS. One Node.js file, zero platform wrappers. Cross-platform patterns, permissions, and full working examples."
date: "2026-02-14"
author: "Max Ritter"
tags: [Guide, Hooks]
readingTime: 10
keywords: "claude, code, hooks, windows, linux, macos, cross, platform, node, universal"
---

Hooks

# Claude Code Hooks on Windows, Linux, and macOS (2026)

Claude Code hooks that work on Windows, Linux, and macOS. One Node.js file, zero platform wrappers. Cross-platform patterns, permissions, and full working examples.

**Problem**: You built a [Claude Code hook](/blog/tools/hooks/hooks-guide) on Windows using `cmd /c` or PowerShell. A teammate on Linux opens the project and every hook throws errors. Now you're maintaining three wrapper scripts per hook -- `.cmd` for Windows, `.sh` for Linux, `.ps1` for PowerShell -- and they all do the same thing: call the actual `.mjs` file.

**Quick Win**: Delete every wrapper. Invoke Node.js directly in your Claude Code hooks config:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "command": "node .claude/hooks/post-write.mjs" }]
      }
    ]
  }
}
```

This works on Windows, Linux, and macOS. Claude Code requires Node.js, so `node` is always available.

## Why Cross-Platform Hooks Matter

If you're the only person using your Claude Code setup, platform compatibility isn't a concern. But the moment you share [`.claude/settings.json`](/blog/guide/configuration-basics) with a teammate, open-source a project, or switch between a Windows workstation and a macOS laptop, platform-specific hooks become a maintenance burden. Every hook that uses `bash` or `powershell` in the command field is a hook that breaks on half your team's machines.

Most tutorials show platform-specific invocations. Each wrapper is a 2-line file that just calls `node`. Three files maintained across three platforms, all doing the same thing. When the wrapper is the only platform-dependent layer, eliminate it.

## The Universal Pattern

Every hook in [`settings.json`](/blog/guide/configuration-basics) follows this universal pattern:

```json
{
  "command": "node .claude/hooks/your-hook.mjs"
}
```

No `cmd /c`. No `bash`. No `powershell`. Just `node`. This pattern works for every [Claude Code hook type](/blog/tools/hooks/hooks-guide) -- PostToolUse, [SessionStart/SessionEnd](/blog/tools/hooks/session-lifecycle-hooks), Stop, and all 12 lifecycle events.

## Three Rules for Cross-Platform .mjs Files

Inside your `.mjs` files, three rules keep Claude Code hooks universal across Windows, Linux, and macOS:

### Use `os.homedir()` Instead of Platform Variables

Never hardcode `$HOME`, `$env:USERPROFILE`, or `%USERPROFILE%`.

```javascript
import os from 'node:os';
const home = os.homedir(); // Works everywhere
```

### Use `os.tmpdir()` for Temporary File Paths

Never hardcode `/tmp` or `$env:TEMP`.

```javascript
import os from 'node:os';
const tmp = os.tmpdir(); // Works everywhere
```

### Use `path.join()` for All File Path Construction

Never concatenate paths with `/` or `\\`. Node.js handles the separator for each OS automatically.

```javascript
import path from 'node:path';
const logFile = path.join(os.homedir(), '.claude', 'hooks.log');
```

## Cross-Platform Permissions

Your [`settings.json` permissions](/blog/guide/development/permission-management) should include equivalents for both platforms:

Commands that don't exist on a platform simply won't be used. Including both costs nothing, and your Claude Code hooks can reference whichever command is available without hitting permission prompts. For more advanced permission automation, see the [Permission Hook guide](/blog/tools/hooks/permission-hook-guide).

## Complete Working Example

Here's a complete Claude Code hook that works everywhere -- a file logger that records every Write/Edit operation:

```javascript
// .claude/hooks/log-writes.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const logDir = path.join(os.homedir(), '.claude', 'logs');
fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, 'file-writes.log');
const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));

const entry = `${new Date().toISOString()} ${input.tool_input?.file_path || 'unknown'}\n`;
fs.appendFileSync(logFile, entry);
```

Register it in your `settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "command": "node .claude/hooks/log-writes.mjs" }]
      }
    ]
  }
}
```

Works identically on Windows 11, Arch Linux, and macOS Sequoia. No wrappers needed.

## Debugging Cross-Platform Failures

When a Claude Code hook works on one OS but fails on another, check these three things in order:

1. **Hardcoded path separators.** Search your `.mjs` files for `/` or `\\` used in file paths. Replace with `path.join()`.
2. **Environment variable references.** Look for `process.env.HOME`, `process.env.USERPROFILE`, or `process.env.TEMP`. Replace with `os.homedir()` and `os.tmpdir()`.
3. **Shell-specific commands in settings.json.** Any `command` field containing `bash`, `cmd`, `powershell`, or `sh` breaks on other platforms. Replace with `node`.

Run hooks manually to isolate the failure. If it exits 0 on one OS and fails on another, the issue is in the `.mjs` file's path handling, not the hook configuration.

## Pre-Ship Checklist

Before shipping Claude Code hooks to a team or open-source project, verify:

- All `settings.json` commands use `node` (not `cmd`, `powershell`, `bash`)
- All `.mjs` files use `os.homedir()` (not `$HOME` or `%USERPROFILE%`)
- All `.mjs` files use `os.tmpdir()` (not `/tmp` or `$env:TEMP`)
- All `.mjs` files use `path.join()` (not hardcoded separators)
- Permissions include both Windows and Unix equivalents
- StatusLine command uses `node` (not `powershell`)

One implementation. Three platforms. Zero maintenance overhead.

## FAQ

### Do Claude Code hooks work on Windows?

Yes. Claude Code hooks work on Windows, Linux, and macOS when you invoke them with `node` instead of platform-specific shells. Since Claude Code requires Node.js on every platform, the `node` command is always available. Use `node .claude/hooks/your-hook.mjs` in `settings.json` and your hooks run identically on all three operating systems.

### Can I use Python instead of Node.js for hooks?

Python works for cross-platform hooks if your team has Python installed everywhere. Use `python3` (not `python`, which may not exist on some Linux distributions) in the `command` field. However, Node.js is the safer default since Claude Code guarantees its availability on every platform.

### How do I handle line endings across platforms?

Node.js handles line endings automatically when using `readFileSync` and `writeFileSync`. If you're reading stdin (which all hooks do), the JSON parsing is line-ending agnostic. The only place line endings matter is if you're generating shell scripts from a hook -- in that case, use `\n` and let Git's `autocrlf` setting handle conversion.

## Related

- Read the [complete hooks guide](/blog/tools/hooks/hooks-guide) for all 12 lifecycle events and exit code patterns
- Set up [Context Recovery](/blog/tools/hooks/context-recovery-hook) with cross-platform backup triggers
- Configure [Skill Activation](/blog/tools/hooks/skill-activation-hook) for automatic skill loading
- Explore [Setup Hooks](/blog/tools/hooks/claude-code-setup-hooks) for cross-platform onboarding
- Master [permission rules](/blog/guide/development/permission-management) alongside cross-platform hook permissions
