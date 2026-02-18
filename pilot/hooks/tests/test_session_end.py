"""Tests for session_end hook."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from session_end import main


class TestSessionEndNotifications:
    @patch("session_end._get_active_session_count")
    @patch("session_end._sessions_base")
    @patch("session_end.subprocess.run")
    @patch("session_end.send_notification")
    @patch("os.environ", {"CLAUDE_PLUGIN_ROOT": "/plugin"})
    def test_notifies_on_clean_session_end(
        self,
        mock_notify,
        mock_subprocess,
        mock_sessions_base,
        mock_count,
    ):
        """Should send notification when session ends cleanly (no VERIFIED plan)."""
        mock_count.return_value = 1

        with tempfile.TemporaryDirectory() as tmpdir:
            session_dir = Path(tmpdir) / "default"
            session_dir.mkdir()
            mock_sessions_base.return_value = Path(tmpdir)

            mock_subprocess.return_value = MagicMock(returncode=0)

            result = main()

            assert result == 0
            mock_notify.assert_called_once_with("Pilot", "Claude session ended")

    @patch("session_end._get_active_session_count")
    @patch("session_end._sessions_base")
    @patch("session_end.subprocess.run")
    @patch("session_end.send_notification")
    @patch("os.environ", {"CLAUDE_PLUGIN_ROOT": "/plugin", "PILOT_SESSION_ID": "test123"})
    def test_notifies_verified_plan_completion(
        self,
        mock_notify,
        mock_subprocess,
        mock_sessions_base,
        mock_count,
    ):
        """Should send specific message when VERIFIED plan completes."""
        mock_count.return_value = 1

        with tempfile.TemporaryDirectory() as tmpdir:
            session_dir = Path(tmpdir) / "test123"
            session_dir.mkdir()
            plan_json = session_dir / "active_plan.json"
            plan_json.write_text(json.dumps({"status": "VERIFIED", "plan_path": "/plan.md"}))
            mock_sessions_base.return_value = Path(tmpdir)

            mock_subprocess.return_value = MagicMock(returncode=0)

            result = main()

            assert result == 0
            mock_notify.assert_called_once_with("Pilot", "Spec complete — all checks passed")

    @patch("session_end._get_active_session_count")
    @patch("session_end.send_notification")
    @patch("os.environ", {"CLAUDE_PLUGIN_ROOT": "/plugin"})
    def test_no_notification_when_other_sessions_running(self, mock_notify, mock_count):
        """Should NOT send notification when other sessions are still running."""
        mock_count.return_value = 2

        result = main()

        assert result == 0
        mock_notify.assert_not_called()

    @patch("os.environ", {})
    def test_returns_0_when_no_plugin_root(self):
        """Should return 0 when CLAUDE_PLUGIN_ROOT is not set."""
        result = main()
        assert result == 0
