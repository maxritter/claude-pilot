---
slug: "claude-code-hooks-guide"
title: "A Practical Guide to Claude Code Hooks"
description: "Learn how to use Claude Code hooks to auto-lint, block dangerous commands, load context, and verify work. Includes configuration examples."
date: "2026-02-12"
author: "Max Ritter"
tags: [Guide, Hooks]
readingTime: 5
keywords: "Claude Code hooks, PreToolUse, PostToolUse, Stop hook, SessionStart, Claude Code automation, Claude Code settings"
---

# A Practical Guide to Claude Code Hooks

Hooks let you run custom scripts at key moments during a Claude Code session. They're the primary mechanism for enforcing workflows, automating checks, and injecting context — without relying on Claude to remember to do it.

## How Hooks Work

Hooks are shell commands that fire on specific events. You configure them in `settings.json` or `.claude/settings.json`. When the event triggers, Claude Code runs your script and uses the output to inform its behavior.

There are five hook types:

| Hook | Fires When | Common Use |
|------|-----------|------------|
| **PreToolUse** | Before a tool executes | Block dangerous commands, validate inputs |
| **PostToolUse** | After a tool completes | Run linters, check test status |
| **Stop** | Claude is about to respond | Verify work is complete before stopping |
| **SessionStart** | Session begins | Load project context, check dependencies |
| **SessionEnd** | Session ends | Save progress, clean up resources |

## Configuration

Add hooks to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "ruff check $CLAUDE_FILE_PATH --fix"
          }
        ]
      }
    ]
  }
}
```

The `matcher` field filters which tool triggers the hook. Without a matcher, the hook fires on every tool call of that type.

## Practical Examples

### Auto-lint on every file edit

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "ruff check \"$CLAUDE_FILE_PATH\" --fix --quiet"
          }
        ]
      }
    ]
  }
}
```

### Block dangerous git commands

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -qE 'git (push --force|reset --hard|clean -f)' && echo 'BLOCK: Destructive git command blocked' && exit 2 || exit 0"
          }
        ]
      }
    ]
  }
}
```

Exit code 2 blocks the tool. Any other exit code allows it.

### Load context at session start

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat .claude/project-context.md"
          }
        ]
      }
    ]
  }
}
```

The script's stdout becomes part of Claude's context.

### Verify before responding (Stop Hook)

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python scripts/verify-work.py"
          }
        ]
      }
    ]
  }
}
```

If the stop hook exits non-zero, Claude continues working instead of responding. This is powerful for ensuring tests pass or linting is clean before Claude considers its work done.

## Hook Environment Variables

Claude Code passes context to hooks via environment variables:

| Variable | Available In | Description |
|----------|-------------|-------------|
| `CLAUDE_TOOL_NAME` | PreToolUse, PostToolUse | Name of the tool being called |
| `CLAUDE_TOOL_INPUT` | PreToolUse, PostToolUse | JSON input to the tool |
| `CLAUDE_FILE_PATH` | PostToolUse (Edit/Write) | Path of the file modified |
| `CLAUDE_SESSION_ID` | All hooks | Current session identifier |

## Tips

- **Keep hooks fast.** They run synchronously — slow hooks degrade the experience.
- **Use exit codes deliberately.** Exit 0 = allow, exit 2 = block (PreToolUse only).
- **Print sparingly.** Hook stdout goes into Claude's context. Be concise.
- **Test hooks independently.** Run your hook scripts manually first before adding them to settings.

## How Pilot Uses Hooks

Pilot Shell installs several hooks automatically:

- **TDD Enforcer** (PostToolUse): Reminds Claude to write tests before production code
- **Context Monitor** (PostToolUse): Tracks context usage and warns at ~80% and ~90%+ as compaction approaches
- **Tool Redirect** (PreToolUse): Blocks inefficient tools and suggests better alternatives
- **PreCompact** (PreCompact): Captures active plan, task progress, and key context to memory before compaction
- **Session End** (SessionEnd): Stops worker daemon when no other sessions are active and sends completion notifications

These hooks work together to enforce quality workflows without relying on Claude remembering rules. Hooks are deterministic — they always run, unlike rules which Claude might occasionally skip.
