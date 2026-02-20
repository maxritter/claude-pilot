"""Tests for tool_redirect hook — blocks broken tools, hints at alternatives."""

from __future__ import annotations

import json
from io import StringIO
from unittest.mock import patch

import pytest

from tool_redirect import block, hint, is_semantic_pattern, run_tool_redirect


class TestBlock:
    """Tests for block() output format."""

    def test_returns_2_and_outputs_deny_json(self, capsys):
        info = {"message": "Tool blocked", "alternative": "Use X instead", "example": "X foo"}
        result = block(info)
        assert result == 2
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["permissionDecision"] == "deny"
        assert "Tool blocked" in data["reason"]
        assert "Use X instead" in data["reason"]
        assert "Tool blocked" in captured.err


class TestHint:
    """Tests for hint() output format."""

    def test_returns_0_and_outputs_additional_context(self, capsys):
        info = {"message": "Better alternative exists", "alternative": "Use Y", "example": "Y bar"}
        result = hint(info)
        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "hookSpecificOutput" in data
        assert data["hookSpecificOutput"]["hookEventName"] == "PreToolUse"
        assert "Better alternative exists" in data["hookSpecificOutput"]["additionalContext"]
        assert captured.err == ""


class TestIsSemanticPattern:
    """Tests for semantic vs code pattern detection."""

    @pytest.mark.parametrize(
        "pattern",
        [
            "where is config loaded",
            "how does authentication work",
            "find the database connection",
            "what are the API endpoints",
            "looking for error handling",
            "locate all test fixtures",
        ],
    )
    def test_detects_semantic_patterns(self, pattern: str):
        assert is_semantic_pattern(pattern) is True

    @pytest.mark.parametrize(
        "pattern",
        [
            "def save_config",
            "class Handler",
            "import os",
            "from pathlib import Path",
            "const API_URL =",
            "function handleClick(",
            "interface UserProps",
            "x == y",
            "result != None",
        ],
    )
    def test_rejects_code_patterns(self, pattern: str):
        assert is_semantic_pattern(pattern) is False

    def test_empty_string_not_semantic(self):
        assert is_semantic_pattern("") is False

    def test_plain_word_not_semantic(self):
        assert is_semantic_pattern("config") is False


def _run_with_input(tool_name: str, tool_input: dict | None = None) -> int:
    """Simulate hook invocation with the given tool name and optional input."""
    hook_data = {"tool_name": tool_name}
    if tool_input is not None:
        hook_data["tool_input"] = tool_input
    stdin = StringIO(json.dumps(hook_data))
    with patch("sys.stdin", stdin):
        return run_tool_redirect()


class TestBlockedTools:
    """Tests for tools that should be blocked (exit code 2)."""

    def test_blocks_web_search(self):
        result = _run_with_input("WebSearch", {"query": "python tutorial"})
        assert result == 2

    def test_blocks_web_fetch(self):
        result = _run_with_input("WebFetch", {"url": "https://example.com"})
        assert result == 2

    def test_blocks_enter_plan_mode(self):
        result = _run_with_input("EnterPlanMode")
        assert result == 2

    def test_blocks_exit_plan_mode(self):
        result = _run_with_input("ExitPlanMode")
        assert result == 2


class TestHintedTools:
    """Tests for tools that get hints but are allowed (exit code 0)."""

    def test_hints_grep_with_semantic_pattern(self):
        result = _run_with_input("Grep", {"pattern": "where is config loaded"})
        assert result == 0

    def test_no_hint_grep_with_code_pattern(self):
        result = _run_with_input("Grep", {"pattern": "def save_config"})
        assert result == 0

    def test_hints_task_explore(self):
        result = _run_with_input("Task", {"subagent_type": "Explore"})
        assert result == 0

    def test_hints_task_generic_subagent(self):
        """Non-allowed subagent types get a hint."""
        result = _run_with_input("Task", {"subagent_type": "general-purpose"})
        assert result == 0

    def test_no_hint_task_spec_reviewer(self):
        """Spec reviewer sub-agents should be allowed without hints."""
        result = _run_with_input("Task", {"subagent_type": "pilot:spec-reviewer-compliance"})
        assert result == 0

    def test_no_hint_task_plan_verifier(self):
        result = _run_with_input("Task", {"subagent_type": "pilot:plan-verifier"})
        assert result == 0

    def test_no_hint_task_plan_challenger(self):
        result = _run_with_input("Task", {"subagent_type": "pilot:plan-challenger"})
        assert result == 0


class TestAllowedTools:
    """Tests for tools that should pass through without blocks or hints."""

    def test_allows_read(self):
        assert _run_with_input("Read", {"file_path": "/foo.py"}) == 0

    def test_allows_write(self):
        assert _run_with_input("Write", {"file_path": "/foo.py"}) == 0

    def test_allows_edit(self):
        assert _run_with_input("Edit", {"file_path": "/foo.py"}) == 0

    def test_allows_bash(self):
        assert _run_with_input("Bash", {"command": "ls"}) == 0

    def test_allows_task_create(self):
        assert _run_with_input("TaskCreate", {"subject": "test"}) == 0


class TestEdgeCases:
    """Tests for malformed input and edge cases."""

    def test_handles_invalid_json(self):
        stdin = StringIO("not json")
        with patch("sys.stdin", stdin):
            result = run_tool_redirect()
        assert result == 0

    def test_handles_empty_stdin(self):
        stdin = StringIO("")
        with patch("sys.stdin", stdin):
            result = run_tool_redirect()
        assert result == 0

    def test_handles_missing_tool_name(self):
        stdin = StringIO(json.dumps({"tool_input": {}}))
        with patch("sys.stdin", stdin):
            result = run_tool_redirect()
        assert result == 0

    def test_handles_non_dict_tool_input(self):
        stdin = StringIO(json.dumps({"tool_name": "Grep", "tool_input": "not a dict"}))
        with patch("sys.stdin", stdin):
            result = run_tool_redirect()
        assert result == 0
