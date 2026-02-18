"""Tests for context_monitor hook."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from context_monitor import run_context_monitor


def _make_statusline_cache(tmp_path: Path, session_id: str, pct: float) -> None:
    """Write a statusline context-pct.json cache file."""
    cache_dir = tmp_path / ".pilot" / "sessions" / session_id
    cache_dir.mkdir(parents=True, exist_ok=True)
    (cache_dir / "context-pct.json").write_text(json.dumps({"pct": pct, "ts": time.time()}))


class TestContextMonitorAutocompact:
    @patch("context_monitor.save_cache")
    @patch("context_monitor._get_pilot_session_id", return_value="test-sess")
    @patch("context_monitor._is_throttled", return_value=False)
    @patch("context_monitor._resolve_context")
    def test_autocompact_returns_0_with_additional_context(
        self, mock_resolve, mock_throttle, mock_sid, mock_save, capsys
    ):
        mock_resolve.return_value = (80.0, 160000, [], False)

        result = run_context_monitor()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "hookSpecificOutput" in data
        assert data["hookSpecificOutput"]["hookEventName"] == "PostToolUse"
        assert "Auto-compact approaching" in data["hookSpecificOutput"]["additionalContext"]
        assert captured.err == ""

    @patch("context_monitor.save_cache")
    @patch("context_monitor._get_pilot_session_id", return_value="test-sess")
    @patch("context_monitor._is_throttled", return_value=False)
    @patch("context_monitor._resolve_context")
    def test_autocompact_does_not_use_decision_block(self, mock_resolve, mock_throttle, mock_sid, mock_save, capsys):
        mock_resolve.return_value = (80.0, 160000, [], False)

        run_context_monitor()

        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "decision" not in data


class TestContextMonitorLearnReminder:
    @patch("context_monitor.save_cache")
    @patch("context_monitor._get_pilot_session_id", return_value="test-sess")
    @patch("context_monitor._is_throttled", return_value=False)
    @patch("context_monitor._resolve_context")
    def test_learn_reminder_uses_additional_context(self, mock_resolve, mock_throttle, mock_sid, mock_save, capsys):
        mock_resolve.return_value = (45.0, 90000, [], False)

        result = run_context_monitor()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "hookSpecificOutput" in data
        assert "Skill(learn)" in data["hookSpecificOutput"]["additionalContext"]


class TestContextMonitor80Warn:
    @patch("context_monitor.save_cache")
    @patch("context_monitor._get_pilot_session_id", return_value="test-sess")
    @patch("context_monitor._is_throttled", return_value=False)
    @patch("context_monitor._resolve_context")
    def test_80_warn_uses_additional_context(self, mock_resolve, mock_throttle, mock_sid, mock_save, capsys):
        mock_resolve.return_value = (70.0, 140000, [40, 55, 65], False)

        result = run_context_monitor()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "hookSpecificOutput" in data
        assert "Auto-compact will handle" in data["hookSpecificOutput"]["additionalContext"]


class TestContextMonitorBelowThreshold:
    @patch("context_monitor.save_cache")
    @patch("context_monitor._get_pilot_session_id", return_value="test-sess")
    @patch("context_monitor._is_throttled", return_value=False)
    @patch("context_monitor._resolve_context")
    def test_below_threshold_no_output(self, mock_resolve, mock_throttle, mock_sid, mock_save, capsys):
        mock_resolve.return_value = (20.0, 40000, [], False)

        result = run_context_monitor()

        assert result == 0
        captured = capsys.readouterr()
        assert captured.out == ""

    @patch("context_monitor._get_pilot_session_id", return_value="test-sess")
    @patch("context_monitor._is_throttled", return_value=True)
    def test_throttled_no_output(self, mock_throttle, mock_sid, capsys):
        result = run_context_monitor()

        assert result == 0
        captured = capsys.readouterr()
        assert captured.out == ""

    @patch("context_monitor._get_pilot_session_id", return_value="test-sess")
    @patch("context_monitor._is_throttled", return_value=False)
    @patch("context_monitor._resolve_context", return_value=None)
    def test_no_context_data_no_output(self, mock_resolve, mock_throttle, mock_sid, capsys):
        result = run_context_monitor()

        assert result == 0
        captured = capsys.readouterr()
        assert captured.out == ""
