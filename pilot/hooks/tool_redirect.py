#!/usr/bin/env python3
"""Hook to redirect built-in tools to better MCP/CLI alternatives.

Two severity levels via JSON stdout:
- BLOCK: permissionDecision=deny — tool is broken or conflicts with workflow.
- HINT: additionalContext — better alternative exists but tool still works.

Note: Task management tools (TaskCreate, TaskList, etc.) are ALLOWED.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import pre_tool_use_context, pre_tool_use_deny

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


EXPLORE_HINT = {
    "message": "Consider using `vexor search` instead (better semantic ranking)",
    "alternative": "vexor search for semantic codebase search, or Grep/Glob for exact patterns",
    "example": 'vexor search "where is config loaded" --mode code --top 5',
}

HINTS: dict[str, dict] = {
    "Grep": {
        "message": "Semantic pattern detected — `vexor search` may give better results",
        "alternative": "vexor search for intent-based file discovery",
        "example": 'vexor search "<pattern>" --mode code --top 5',
        "condition": lambda data: is_semantic_pattern(
            data.get("tool_input", {}).get("pattern", "") if isinstance(data.get("tool_input"), dict) else ""
        ),
    },
    "Task": {
        "message": "Consider using Read, Grep, Glob, Bash directly (less context overhead)",
        "alternative": "Direct tool calls avoid sub-agent context cost",
        "example": "Read/Grep/Glob for exploration, TaskCreate for tracking",
        "condition": lambda data: (
            data.get("tool_input", {}).get("subagent_type", "")
            not in (
                "Explore",
                "pilot:spec-reviewer-compliance",
                "pilot:spec-reviewer-quality",
                "pilot:plan-verifier",
                "pilot:plan-challenger",
                "claude-code-guide",
            )
            if isinstance(data.get("tool_input"), dict)
            else True
        ),
    },
}

BLOCKS: dict[str, dict] = {
    "WebSearch": {
        "message": "WebSearch is blocked (use MCP alternative)",
        "alternative": "Use ToolSearch to load mcp__web-search__search, then call it directly",
        "example": 'ToolSearch(query="web-search") → mcp__web-search__search(query="...")',
    },
    "WebFetch": {
        "message": "WebFetch is blocked (truncates at ~8KB)",
        "alternative": "Use ToolSearch to load mcp__web-fetch__fetch_url for full page content",
        "example": 'ToolSearch(query="web-fetch") → mcp__web-fetch__fetch_url(url="...")',
    },
    "EnterPlanMode": {
        "message": "EnterPlanMode is blocked (project uses /spec workflow)",
        "alternative": "Use Skill(skill='spec') for dispatch, or invoke phases directly: spec-plan, spec-implement, spec-verify",
        "example": "Skill(skill='spec', args='task description') or Skill(skill='spec-plan', args='task description')",
    },
    "ExitPlanMode": {
        "message": "ExitPlanMode is blocked (project uses /spec workflow)",
        "alternative": "Use AskUserQuestion for plan approval, then Skill(skill='spec-implement', args='plan-path')",
        "example": "AskUserQuestion to confirm plan, then Skill(skill='spec-implement', args='plan-path')",
    },
    "Task": {
        "message": "Task(subagent_type='Plan') is blocked (project uses /spec workflow)",
        "alternative": "Do planning work directly with Read, Grep, Glob tools. Use /spec for structured planning.",
        "example": "Read files directly, use AskUserQuestion for decisions, write plan to file",
        "condition": lambda data: (
            isinstance(data.get("tool_input"), dict) and data["tool_input"].get("subagent_type") == "Plan"
        ),
    },
}


def _format_example(redirect_info: dict, pattern: str | None = None) -> str:
    example = redirect_info["example"]
    if pattern and "<pattern>" in example:
        example = example.replace("<pattern>", pattern)
    return example


def block(redirect_info: dict, pattern: str | None = None) -> int:
    """Output deny JSON to stdout and return 0."""
    example = _format_example(redirect_info, pattern)
    reason = f"{redirect_info['message']}\n-> {redirect_info['alternative']}\nExample: {example}"
    print(pre_tool_use_deny(reason))
    return 0


def hint(redirect_info: dict, pattern: str | None = None) -> int:
    """Output additionalContext JSON to stdout and return 0."""
    example = _format_example(redirect_info, pattern)
    context = f"{redirect_info['message']}\nExample: {example}"
    print(pre_tool_use_context(context))
    return 0


def run_tool_redirect() -> int:
    """Check if tool should be redirected (block) or hinted (allow)."""
    try:
        hook_data = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError):
        return 0

    tool_name = hook_data.get("tool_name", "")
    tool_input = hook_data.get("tool_input", {}) if isinstance(hook_data.get("tool_input"), dict) else {}

    if tool_name == "Task" and tool_input.get("subagent_type") == "Explore":
        return hint(EXPLORE_HINT)

    if tool_name in BLOCKS:
        redirect = BLOCKS[tool_name]
        condition = redirect.get("condition")
        if condition is None or condition(hook_data):
            return block(redirect)

    if tool_name in HINTS:
        redirect = HINTS[tool_name]
        condition = redirect.get("condition")
        if condition is None or condition(hook_data):
            pattern = None
            if tool_name == "Grep":
                pattern = tool_input.get("pattern", "") if isinstance(tool_input, dict) else ""
            return hint(redirect, pattern)

    return 0


if __name__ == "__main__":
    sys.exit(run_tool_redirect())
