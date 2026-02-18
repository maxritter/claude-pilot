"""Tests for spec_stop_guard hook."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from spec_stop_guard import main


class TestSpecStopGuardNotifications:
    @patch("spec_stop_guard.find_active_plan")
    @patch("spec_stop_guard.is_waiting_for_user_input")
    @patch("spec_stop_guard.send_notification")
    @patch("sys.stdin")
    def test_notifies_when_waiting_for_user_input(self, mock_stdin, mock_notify, mock_waiting, mock_find_plan):
        """Should send notification when stop is allowed due to waiting for user input."""
        mock_find_plan.return_value = (Path("/plan.md"), "PENDING", True)
        mock_waiting.return_value = True
        mock_stdin.read.return_value = json.dumps({"transcript_path": "/transcript.jsonl", "stop_hook_active": False})

        result = main()

        assert result == 0
        mock_notify.assert_called_once_with("Pilot", "Waiting for your input")

    @patch("spec_stop_guard.find_active_plan")
    @patch("spec_stop_guard.is_waiting_for_user_input")
    @patch("spec_stop_guard.send_notification")
    @patch("spec_stop_guard.get_stop_guard_path")
    @patch("spec_stop_guard.time.time")
    @patch("sys.stdin")
    def test_notifies_when_cooldown_allows_stop(
        self, mock_stdin, mock_time, mock_guard_path, mock_notify, mock_waiting, mock_find_plan
    ):
        """Should send notification when stop allowed due to cooldown escape hatch."""
        mock_find_plan.return_value = (Path("/plan.md"), "PENDING", True)
        mock_waiting.return_value = False
        mock_time.return_value = 100.0

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".state") as f:
            f.write("50.0")
            state_path = Path(f.name)

        mock_guard_path.return_value = state_path
        mock_stdin.read.return_value = json.dumps({"transcript_path": "/transcript.jsonl", "stop_hook_active": False})

        try:
            result = main()

            assert result == 0
            mock_notify.assert_called_once_with("Pilot", "Waiting for your input")
        finally:
            state_path.unlink(missing_ok=True)

    @patch("spec_stop_guard.find_active_plan")
    @patch("spec_stop_guard.send_notification")
    @patch("sys.stdin")
    def test_no_notification_when_no_active_plan(self, mock_stdin, mock_notify, mock_find_plan):
        """Should NOT send notification when there's no active plan."""
        mock_find_plan.return_value = (None, None, False)
        mock_stdin.read.return_value = json.dumps({"transcript_path": "/transcript.jsonl", "stop_hook_active": False})

        result = main()

        assert result == 0
        mock_notify.assert_not_called()

    @patch("spec_stop_guard.find_active_plan")
    @patch("spec_stop_guard.is_waiting_for_user_input")
    @patch("spec_stop_guard.send_notification")
    @patch("spec_stop_guard.get_stop_guard_path")
    @patch("spec_stop_guard.time.time")
    @patch("sys.stdin")
    def test_no_notification_when_stop_blocked(  # noqa: PLR0913
        self, mock_stdin, mock_time, mock_guard_path, mock_notify, mock_waiting, mock_find_plan, capsys
    ):
        """Should NOT send notification when stop is blocked — outputs JSON block."""
        mock_find_plan.return_value = (Path("/plan.md"), "PENDING", True)
        mock_waiting.return_value = False
        mock_time.return_value = 200.0

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".state") as f:
            f.write("100.0")
            state_path = Path(f.name)

        mock_guard_path.return_value = state_path
        mock_stdin.read.return_value = json.dumps({"transcript_path": "/transcript.jsonl", "stop_hook_active": False})

        try:
            result = main()

            assert result == 0
            mock_notify.assert_not_called()
            captured = capsys.readouterr()
            data = json.loads(captured.out)
            assert data["decision"] == "block"
            assert "/plan.md" in data["reason"]
            assert "PENDING" in data["reason"]
            assert "spec-implement" in data["reason"]
        finally:
            state_path.unlink(missing_ok=True)
