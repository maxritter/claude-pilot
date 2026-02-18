"""Tests for post_compact_restore hook."""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestPostCompactRestoreHook:
    """Test SessionStart(compact) hook context restoration."""

    @patch("post_compact_restore.read_hook_stdin")
    @patch("post_compact_restore.get_session_plan_path")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123"})
    def test_restores_active_plan_context(self, mock_plan_path, mock_stdin, capsys):
        """Should restore active plan context with structured message."""
        from post_compact_restore import run_post_compact_restore

        with tempfile.TemporaryDirectory() as tmpdir:
            plan_json = Path(tmpdir) / "active_plan.json"
            plan_json.write_text(
                json.dumps(
                    {
                        "status": "PENDING",
                        "plan_path": "docs/plans/2026-02-16-test.md",
                        "current_task": 3,
                    }
                )
            )
            mock_plan_path.return_value = plan_json

            mock_stdin.return_value = {"session_id": "test123"}

            result = run_post_compact_restore()

            assert result == 0

            captured = capsys.readouterr()
            assert "[Pilot Context Restored After Compaction]" in captured.out
            assert "Active Plan:" in captured.out
            assert "2026-02-16-test.md" in captured.out
            assert "PENDING" in captured.out

    @patch("post_compact_restore.read_hook_stdin")
    @patch("post_compact_restore.get_session_plan_path")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123"})
    def test_handles_no_active_plan(self, mock_plan_path, mock_stdin, capsys):
        """Should handle case where no active plan exists."""
        from post_compact_restore import run_post_compact_restore

        mock_plan_path.return_value = Path("/nonexistent")
        mock_stdin.return_value = {"session_id": "test123"}

        result = run_post_compact_restore()

        assert result == 0

        captured = capsys.readouterr()
        assert "[Pilot Context Restored After Compaction]" in captured.out
        assert "No active plan" in captured.out or "Active Plan:" not in captured.out

    @patch("post_compact_restore.read_hook_stdin")
    @patch("post_compact_restore.get_session_plan_path")
    @patch("post_compact_restore._sessions_base")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123"})
    def test_includes_fallback_state_if_available(self, mock_sessions_base, mock_plan_path, mock_stdin, capsys):
        """Should include pre-compact fallback state if available."""
        from post_compact_restore import run_post_compact_restore

        with tempfile.TemporaryDirectory() as tmpdir:
            sessions_dir = Path(tmpdir)
            mock_sessions_base.return_value = sessions_dir

            session_dir = sessions_dir / "test123"
            session_dir.mkdir()
            fallback_file = session_dir / "pre-compact-state.json"
            fallback_file.write_text(
                json.dumps(
                    {
                        "trigger": "manual",
                        "active_plan": {
                            "plan_path": "docs/plans/2026-02-16-test.md",
                            "status": "COMPLETE",
                        },
                    }
                )
            )

            mock_plan_path.return_value = Path("/nonexistent")
            mock_stdin.return_value = {"session_id": "test123"}

            result = run_post_compact_restore()

            assert result == 0

            captured = capsys.readouterr()
            assert "2026-02-16-test.md" in captured.out or "Restored" in captured.out

    @patch("post_compact_restore.read_hook_stdin")
    @patch("post_compact_restore.get_session_plan_path")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123", "CLAUDE_CODE_TASK_LIST_ID": "test-tasks"})
    def test_fast_execution(self, mock_plan_path, mock_stdin):
        """Should complete in under 2 seconds."""
        import time

        from post_compact_restore import run_post_compact_restore

        mock_plan_path.return_value = Path("/nonexistent")
        mock_stdin.return_value = {"session_id": "test123"}

        start = time.time()
        result = run_post_compact_restore()
        elapsed = time.time() - start

        assert result == 0
        assert elapsed < 2.0, f"Hook took {elapsed:.2f}s, must be under 2s"
