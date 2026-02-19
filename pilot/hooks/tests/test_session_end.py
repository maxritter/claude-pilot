"""Tests for session_end hook."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from session_end import main


class TestSessionEndWorkerStop:
    @patch("session_end._get_active_session_count")
    @patch("session_end.subprocess.run")
    @patch("os.environ", {"CLAUDE_PLUGIN_ROOT": "/plugin"})
    def test_stops_worker_on_clean_session_end(
        self,
        mock_subprocess,
        mock_count,
    ):
        """Should stop worker when session count <= 1."""
        mock_count.return_value = 1
        mock_subprocess.return_value = MagicMock(returncode=0)

        result = main()

        assert result == 0
        mock_subprocess.assert_called_once()

    @patch("session_end._get_active_session_count")
    @patch("session_end.subprocess.run")
    @patch("os.environ", {"CLAUDE_PLUGIN_ROOT": "/plugin"})
    def test_stops_worker_when_zero_sessions(
        self,
        mock_subprocess,
        mock_count,
    ):
        """Should stop worker when count is 0 (current session already gone)."""
        mock_count.return_value = 0
        mock_subprocess.return_value = MagicMock(returncode=0)

        result = main()

        assert result == 0
        mock_subprocess.assert_called_once()

    @patch("session_end._get_active_session_count")
    @patch("os.environ", {"CLAUDE_PLUGIN_ROOT": "/plugin"})
    def test_skips_stop_when_other_sessions_running(self, mock_count):
        """Should skip worker stop when other sessions are still running."""
        mock_count.return_value = 2

        result = main()

        assert result == 0

    @patch("os.environ", {})
    def test_returns_0_when_no_plugin_root(self):
        """Should return 0 when CLAUDE_PLUGIN_ROOT is not set."""
        result = main()
        assert result == 0
