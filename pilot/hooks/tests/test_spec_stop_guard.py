"""Tests for spec_stop_guard hook.

Notifications were removed from the stop guard — spec skills now handle
all notifications via `pilot notify`. The stop guard only blocks/allows stops.
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from spec_stop_guard import main


class TestSpecStopGuard:
    @patch("spec_stop_guard.find_active_plan")
    @patch("spec_stop_guard.is_waiting_for_user_input")
    @patch("sys.stdin")
    def test_allows_stop_when_waiting_for_input(self, mock_stdin, mock_waiting, mock_find_plan):
        """Should allow stop (return 0) when waiting for user input."""
        mock_find_plan.return_value = (Path("/plan.md"), "PENDING")
        mock_waiting.return_value = True
        mock_stdin.read.return_value = json.dumps({"transcript_path": "/transcript.jsonl", "stop_hook_active": False})

        result = main()
        assert result == 0

    @patch("spec_stop_guard.find_active_plan")
    @patch("spec_stop_guard.is_waiting_for_user_input")
    @patch("spec_stop_guard.get_stop_guard_path")
    @patch("spec_stop_guard.time.time")
    @patch("sys.stdin")
    def test_allows_stop_on_cooldown_escape(
        self, mock_stdin, mock_time, mock_guard_path, mock_waiting, mock_find_plan
    ):
        """Should allow stop when cooldown escape hatch is triggered (double-stop)."""
        mock_find_plan.return_value = (Path("/plan.md"), "PENDING")
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
        finally:
            state_path.unlink(missing_ok=True)

    @patch("spec_stop_guard.find_active_plan")
    @patch("sys.stdin")
    def test_allows_stop_when_no_active_plan(self, mock_stdin, mock_find_plan):
        """Should allow stop when there's no active plan."""
        mock_find_plan.return_value = (None, None)
        mock_stdin.read.return_value = json.dumps({"transcript_path": "/transcript.jsonl", "stop_hook_active": False})

        result = main()
        assert result == 0

    @patch("spec_stop_guard.find_active_plan")
    @patch("spec_stop_guard.is_waiting_for_user_input")
    @patch("spec_stop_guard.get_stop_guard_path")
    @patch("spec_stop_guard.time.time")
    @patch("sys.stdin")
    def test_blocks_stop_when_outside_cooldown(
        self, mock_stdin, mock_time, mock_guard_path, mock_waiting, mock_find_plan, capsys
    ):
        """Should block stop and output JSON when outside cooldown window."""
        mock_find_plan.return_value = (Path("/plan.md"), "PENDING")
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
            captured = capsys.readouterr()
            data = json.loads(captured.out)
            assert data["decision"] == "block"
            assert "/plan.md" in data["reason"]
        finally:
            state_path.unlink(missing_ok=True)
