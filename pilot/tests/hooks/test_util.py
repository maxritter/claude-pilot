"""Tests for shared hook utilities module."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "hooks"))

from _util import (  # type: ignore[import-not-found]
    BLUE,
    CYAN,
    FILE_LENGTH_CRITICAL,
    FILE_LENGTH_WARN,
    GREEN,
    MAGENTA,
    NC,
    RED,
    YELLOW,
    _sessions_base,
    check_file_length,
    find_git_root,
    get_edited_file_from_stdin,
    get_session_cache_path,
    get_session_plan_path,
    is_waiting_for_user_input,
    read_hook_stdin,
)


def test_color_constants_defined():
    """Color constants are defined and non-empty."""
    assert RED
    assert YELLOW
    assert GREEN
    assert CYAN
    assert BLUE
    assert MAGENTA
    assert NC


def test_file_length_constants():
    """File length constants have expected values."""
    assert FILE_LENGTH_WARN == 300
    assert FILE_LENGTH_CRITICAL == 500


def test_sessions_base_returns_path():
    """_sessions_base returns Path under ~/.pilot/sessions."""
    base = _sessions_base()
    assert isinstance(base, Path)
    assert base == Path.home() / ".pilot" / "sessions"


@patch.dict("os.environ", {"PILOT_SESSION_ID": "test-session-123"})
def test_get_session_cache_path_with_session_id():
    """get_session_cache_path returns session-scoped cache path."""
    path = get_session_cache_path()
    assert isinstance(path, Path)
    assert "test-session-123" in str(path)
    assert path.name == "context-cache.json"


@patch.dict("os.environ", {}, clear=True)
def test_get_session_cache_path_defaults_to_default():
    """get_session_cache_path uses 'default' when PILOT_SESSION_ID is missing."""
    path = get_session_cache_path()
    assert isinstance(path, Path)
    assert "default" in str(path)


@patch.dict("os.environ", {"PILOT_SESSION_ID": "test-session-456"})
def test_get_session_plan_path():
    """get_session_plan_path returns session-scoped active plan path."""
    path = get_session_plan_path()
    assert isinstance(path, Path)
    assert "test-session-456" in str(path)
    assert path.name == "active_plan.json"


@patch("subprocess.run")
def test_find_git_root_success(mock_run):
    """find_git_root returns git root when in repo."""
    mock_run.return_value = MagicMock(returncode=0, stdout="/home/user/repo\n")
    result = find_git_root()
    assert result == Path("/home/user/repo")


@patch("subprocess.run")
def test_find_git_root_not_in_repo(mock_run):
    """find_git_root returns None when not in repo."""
    mock_run.return_value = MagicMock(returncode=1, stdout="")
    result = find_git_root()
    assert result is None


@patch("subprocess.run", side_effect=Exception("Git not found"))
def test_find_git_root_handles_exception(mock_run):
    """find_git_root returns None on exception."""
    result = find_git_root()
    assert result is None


def test_read_hook_stdin_valid_json(monkeypatch):
    """read_hook_stdin parses valid JSON from stdin."""
    test_data = {"tool_name": "Write", "tool_input": {"file_path": "test.py"}}
    monkeypatch.setattr("sys.stdin", MagicMock(read=lambda: json.dumps(test_data)))
    result = read_hook_stdin()
    assert result == test_data


def test_read_hook_stdin_invalid_json(monkeypatch):
    """read_hook_stdin returns empty dict on invalid JSON."""
    monkeypatch.setattr("sys.stdin", MagicMock(read=lambda: "not json"))
    result = read_hook_stdin()
    assert result == {}


def test_read_hook_stdin_empty(monkeypatch):
    """read_hook_stdin returns empty dict on empty input."""
    monkeypatch.setattr("sys.stdin", MagicMock(read=lambda: ""))
    result = read_hook_stdin()
    assert result == {}


def test_get_edited_file_from_stdin_with_file_path(monkeypatch):
    """get_edited_file_from_stdin extracts file path from hook data."""
    test_data = {"tool_input": {"file_path": "/path/to/file.py"}}
    with patch("select.select") as mock_select:
        mock_select.return_value = ([sys.stdin], [], [])
        monkeypatch.setattr("sys.stdin", MagicMock(read=lambda: json.dumps(test_data)))
        with patch("json.load", return_value=test_data):
            result = get_edited_file_from_stdin()
            assert result == Path("/path/to/file.py")


def test_get_edited_file_from_stdin_no_file_path(monkeypatch):
    """get_edited_file_from_stdin returns None when no file_path."""
    test_data = {"tool_input": {}}
    with patch("select.select") as mock_select:
        mock_select.return_value = ([sys.stdin], [], [])
        with patch("json.load", return_value=test_data):
            result = get_edited_file_from_stdin()
            assert result is None


def test_get_edited_file_from_stdin_no_stdin(monkeypatch):
    """get_edited_file_from_stdin returns None when stdin is empty."""
    with patch("select.select") as mock_select:
        mock_select.return_value = ([], [], [])
        result = get_edited_file_from_stdin()
        assert result is None


def test_check_file_length_under_warn():
    """check_file_length returns False for files under warn threshold."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write("\n".join([f"line {i}" for i in range(100)]))
        f.flush()
        temp_path = Path(f.name)

    try:
        result = check_file_length(temp_path)
        assert result is False
    finally:
        temp_path.unlink(missing_ok=True)


def test_check_file_length_warn_threshold():
    """check_file_length returns True for files exceeding warn threshold."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write("\n".join([f"line {i}" for i in range(350)]))
        f.flush()
        temp_path = Path(f.name)

    try:
        result = check_file_length(temp_path)
        assert result is True
    finally:
        temp_path.unlink(missing_ok=True)


def test_check_file_length_critical_threshold():
    """check_file_length returns True for files exceeding critical threshold."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write("\n".join([f"line {i}" for i in range(600)]))
        f.flush()
        temp_path = Path(f.name)

    try:
        result = check_file_length(temp_path)
        assert result is True
    finally:
        temp_path.unlink(missing_ok=True)


def test_check_file_length_handles_missing_file():
    """check_file_length returns False for missing files."""
    result = check_file_length(Path("/nonexistent/file.py"))
    assert result is False


class TestIsWaitingForUserInput:
    """Tests for is_waiting_for_user_input."""

    def test_returns_true_when_last_tool_is_ask_user_question(self, tmp_path):
        """Detects AskUserQuestion as last assistant tool call."""
        transcript = tmp_path / "transcript.jsonl"
        msg = {
            "type": "assistant",
            "message": {
                "content": [
                    {"type": "tool_use", "name": "AskUserQuestion", "input": {}}
                ]
            },
        }
        transcript.write_text(json.dumps(msg) + "\n")
        assert is_waiting_for_user_input(str(transcript)) is True

    def test_returns_false_when_last_tool_is_not_ask(self, tmp_path):
        """Returns False when last tool is not AskUserQuestion."""
        transcript = tmp_path / "transcript.jsonl"
        msg = {
            "type": "assistant",
            "message": {
                "content": [{"type": "tool_use", "name": "Write", "input": {}}]
            },
        }
        transcript.write_text(json.dumps(msg) + "\n")
        assert is_waiting_for_user_input(str(transcript)) is False

    def test_returns_false_for_missing_file(self):
        """Returns False when transcript file doesn't exist."""
        assert is_waiting_for_user_input("/nonexistent/transcript.jsonl") is False

    def test_returns_false_for_empty_transcript(self, tmp_path):
        """Returns False when transcript is empty."""
        transcript = tmp_path / "transcript.jsonl"
        transcript.write_text("")
        assert is_waiting_for_user_input(str(transcript)) is False

    def test_uses_last_assistant_message(self, tmp_path):
        """Uses the last assistant message, not the first."""
        transcript = tmp_path / "transcript.jsonl"
        ask_msg = {
            "type": "assistant",
            "message": {
                "content": [
                    {"type": "tool_use", "name": "AskUserQuestion", "input": {}}
                ]
            },
        }
        write_msg = {
            "type": "assistant",
            "message": {
                "content": [{"type": "tool_use", "name": "Write", "input": {}}]
            },
        }
        lines = [json.dumps(ask_msg), json.dumps(write_msg)]
        transcript.write_text("\n".join(lines) + "\n")
        assert is_waiting_for_user_input(str(transcript)) is False
