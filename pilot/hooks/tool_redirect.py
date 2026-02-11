#!/usr/bin/env python3
"""Hook to redirect built-in tools to better MCP/CLI alternatives.

Blocks or redirects tools to better alternatives:
- Bash (background) → Synchronous execution (no run_in_background)
- WebSearch/WebFetch → MCP web tools (full content, no truncation)
- Grep (semantic) → vexor (intent-based search)
- Task/Explore → vexor (semantic search with better results)
- Task (other sub-agents) → Direct tool calls (sub-agents lose context)
- EnterPlanMode/ExitPlanMode → /spec workflow (project-specific planning)

Pilot Core MCP servers available:
- web-search: Web search via DuckDuckGo/Bing
- web-fetch: Full page fetching via Playwright
- grep-mcp: GitHub code search via grep.app (1M+ repos)
- context7: Library documentation
- mem-search: Persistent memory across sessions

Note: Task management tools (TaskCreate, TaskList, etc.) are ALLOWED.

This is a PreToolUse hook that prevents the tool from executing.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import CYAN, NC, RED, YELLOW

SEMANTIC_PHRASES = [
    "where is",
    "where are",
    "how does",
    "how do",
    "how to",
    "find the",
    "find all",
    "locate the",
    "locate all",
    "what is",
    "what are",
    "search for",
    "looking for",
]

CODE_PATTERNS = [
    "def ",
    "class ",
    "import ",
    "from ",
    "= ",
    "==",
    "!=",
    "->",
    "::",
    "\\(",
    "\\{",
    "function ",
    "const ",
    "let ",
    "var ",
    "type ",
    "interface ",
]


def is_semantic_pattern(pattern: str) -> bool:
    """Check if a pattern appears to be a semantic/intent-based search.

    Returns True for natural language queries like "where is config loaded"
    Returns False for code patterns like "def save_config" or "class Handler"
    """
    pattern_lower = pattern.lower()

    for code_pattern in CODE_PATTERNS:
        if code_pattern in pattern_lower:
            return False

    return any(phrase in pattern_lower for phrase in SEMANTIC_PHRASES)


EXPLORE_REDIRECT = {
    "message": "Task/Explore agent is BANNED (low-quality results)",
    "alternative": "Use `vexor search` for semantic codebase search, or Grep/Glob for exact patterns",
    "example": 'vexor search "where is config loaded" --mode code --top 5',
}

REDIRECTS: dict[str, dict] = {
    "Bash": {
        "message": "Background Bash tasks are BANNED",
        "alternative": "Run commands synchronously (remove run_in_background). Use timeout parameter if needed (up to 600000ms)",
        "example": "Bash(command='vexor search ...', timeout=60000)",
        "condition": lambda data: (
            data.get("tool_input", {}).get("run_in_background", False) is True
            if isinstance(data.get("tool_input"), dict)
            else False
        ),
    },
    "WebSearch": {
        "message": "WebSearch is blocked",
        "alternative": "Use ToolSearch to load mcp__web-search__search, then call it directly",
        "example": 'ToolSearch(query="web-search") → mcp__web-search__search(query="...")',
    },
    "WebFetch": {
        "message": "WebFetch is blocked (truncates content)",
        "alternative": "Use ToolSearch to load mcp__web-fetch__fetch_url for full page content",
        "example": 'ToolSearch(query="web-fetch") → mcp__web-fetch__fetch_url(url="...")',
    },
    "Grep": {
        "message": "Grep with semantic pattern detected",
        "alternative": "Use `vexor search` for intent-based file discovery",
        "example": 'vexor search "<pattern>" --mode code --top 5',
        "condition": lambda data: is_semantic_pattern(
            data.get("tool_input", {}).get("pattern", "") if isinstance(data.get("tool_input"), dict) else ""
        ),
    },
    "Task": {
        "message": "Task tool (sub-agents) is BANNED",
        "alternative": "Use Read, Grep, Glob, Bash directly. For progress tracking, use TaskCreate/TaskList/TaskUpdate",
        "example": "TaskCreate(subject='...') or Read/Grep/Glob for exploration",
        "condition": lambda data: (
            data.get("tool_input", {}).get("subagent_type", "") not in ("pilot:spec-verifier", "pilot:plan-verifier")
            if isinstance(data.get("tool_input"), dict)
            else True
        ),
    },
    "EnterPlanMode": {
        "message": "EnterPlanMode is BANNED (project uses /spec workflow)",
        "alternative": "Use Skill(skill='spec') for dispatch, or invoke phases directly: spec-plan, spec-implement, spec-verify",
        "example": "Skill(skill='spec', args='task description') or Skill(skill='spec-plan', args='task description')",
    },
    "ExitPlanMode": {
        "message": "ExitPlanMode is BANNED (project uses /spec workflow)",
        "alternative": "Use AskUserQuestion for plan approval, then Skill(skill='spec-implement', args='plan-path')",
        "example": "AskUserQuestion to confirm plan, then Skill(skill='spec-implement', args='plan-path')",
    },
}


def block(redirect_info: dict, pattern: str | None = None) -> int:
    """Output block message and return exit code 2 (tool blocked)."""
    example = redirect_info["example"]
    if pattern and "<pattern>" in example:
        example = example.replace("<pattern>", pattern)
    print(f"{RED}⛔ {redirect_info['message']}{NC}", file=sys.stderr)
    print(f"{YELLOW}   → {redirect_info['alternative']}{NC}", file=sys.stderr)
    print(f"{CYAN}   Example: {example}{NC}", file=sys.stderr)
    return 2


def run_tool_redirect() -> int:
    """Check if tool should be redirected and block if necessary."""
    try:
        hook_data = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError):
        return 0

    tool_name = hook_data.get("tool_name", "")
    tool_input = hook_data.get("tool_input", {}) if isinstance(hook_data.get("tool_input"), dict) else {}

    if tool_name == "Task" and tool_input.get("subagent_type") == "Explore":
        return block(EXPLORE_REDIRECT)

    if tool_name in REDIRECTS:
        redirect = REDIRECTS[tool_name]
        condition = redirect.get("condition")
        if condition is None or condition(hook_data):
            pattern = None
            if tool_name == "Grep":
                tool_input = hook_data.get("tool_input", {})
                pattern = tool_input.get("pattern", "") if isinstance(tool_input, dict) else ""
            return block(redirect, pattern)

    return 0


if __name__ == "__main__":
    sys.exit(run_tool_redirect())
