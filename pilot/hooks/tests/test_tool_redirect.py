"""Tests for tool_redirect hook."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from tool_redirect import block, hint, is_semantic_pattern, run_tool_redirect


class TestBlock:
    def test_returns_0_and_outputs_deny_json(self, capsys):
        info = {"message": "Tool blocked", "alternative": "Use X instead", "example": "X foo"}
        result = block(info)
        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["permissionDecision"] == "deny"
        assert "Tool blocked" in data["reason"]
        assert "Use X instead" in data["reason"]
        assert captured.err == ""


class TestHint:
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


class TestRunToolRedirect:
    @patch("sys.stdin")
    def test_websearch_blocked(self, mock_stdin, capsys):
        mock_stdin.__enter__ = lambda s: s
        mock_stdin.__exit__ = lambda s, *a: None
        mock_stdin.read = lambda: json.dumps({"tool_name": "WebSearch", "tool_input": {"query": "test"}})

        with patch("tool_redirect.json.load", return_value={"tool_name": "WebSearch", "tool_input": {"query": "test"}}):
            result = run_tool_redirect()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["permissionDecision"] == "deny"

    @patch("sys.stdin")
    def test_webfetch_blocked(self, mock_stdin, capsys):
        with patch(
            "tool_redirect.json.load", return_value={"tool_name": "WebFetch", "tool_input": {"url": "http://x"}}
        ):
            result = run_tool_redirect()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["permissionDecision"] == "deny"

    @patch("sys.stdin")
    def test_enter_plan_mode_blocked(self, mock_stdin, capsys):
        with patch("tool_redirect.json.load", return_value={"tool_name": "EnterPlanMode", "tool_input": {}}):
            result = run_tool_redirect()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["permissionDecision"] == "deny"

    @patch("sys.stdin")
    def test_explore_hinted(self, mock_stdin, capsys):
        with patch(
            "tool_redirect.json.load", return_value={"tool_name": "Task", "tool_input": {"subagent_type": "Explore"}}
        ):
            result = run_tool_redirect()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "hookSpecificOutput" in data
        assert "vexor" in data["hookSpecificOutput"]["additionalContext"].lower()

    @patch("sys.stdin")
    def test_allowed_tool_no_output(self, mock_stdin, capsys):
        with patch("tool_redirect.json.load", return_value={"tool_name": "Read", "tool_input": {"file_path": "/x"}}):
            result = run_tool_redirect()

        assert result == 0
        captured = capsys.readouterr()
        assert captured.out == ""

    @patch("sys.stdin")
    def test_grep_semantic_pattern_hinted(self, mock_stdin, capsys):
        with patch(
            "tool_redirect.json.load",
            return_value={"tool_name": "Grep", "tool_input": {"pattern": "where is config loaded"}},
        ):
            result = run_tool_redirect()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "hookSpecificOutput" in data

    @patch("sys.stdin")
    def test_grep_code_pattern_no_hint(self, mock_stdin, capsys):
        with patch(
            "tool_redirect.json.load", return_value={"tool_name": "Grep", "tool_input": {"pattern": "def save_config"}}
        ):
            result = run_tool_redirect()

        assert result == 0
        captured = capsys.readouterr()
        assert captured.out == ""


class TestIsSemanticPattern:
    def test_natural_language_detected(self):
        assert is_semantic_pattern("where is the config loaded") is True
        assert is_semantic_pattern("how does authentication work") is True

    def test_code_pattern_not_detected(self):
        assert is_semantic_pattern("def save_config") is False
        assert is_semantic_pattern("class Handler") is False
        assert is_semantic_pattern("import os") is False
