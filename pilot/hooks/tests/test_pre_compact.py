"""Tests for pre_compact hook."""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestPreCompactHook:
    """Test PreCompact hook state capture."""

    @patch("pre_compact.urllib.request.urlopen")
    @patch("pre_compact.read_hook_stdin")
    @patch("pre_compact.get_session_plan_path")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123"})
    def test_captures_active_plan_state(self, mock_plan_path, mock_stdin, mock_urlopen, capsys):
        """Should capture active plan state from session data."""
        from pre_compact import run_pre_compact

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

            mock_stdin.return_value = {
                "session_id": "test123",
                "trigger": "auto",
                "custom_instructions": "",
            }

            mock_response = MagicMock()
            mock_response.status = 200
            mock_urlopen.return_value = mock_response

            result = run_pre_compact()

            assert mock_urlopen.called
            call_args = mock_urlopen.call_args
            req = call_args[0][0]
            payload = json.loads(req.data.decode())
            assert "PENDING" in payload["text"]
            assert "2026-02-16-test.md" in payload["text"]

            assert result == 0
            captured = capsys.readouterr()
            assert "Compaction in progress" in captured.err

    @patch("pre_compact.urllib.request.urlopen")
    @patch("pre_compact.read_hook_stdin")
    @patch("pre_compact.get_session_plan_path")
    @patch("pre_compact._sessions_base")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123"})
    def test_fallback_to_local_file_on_http_failure(
        self, mock_sessions_base, mock_plan_path, mock_stdin, mock_urlopen, capsys
    ):
        """Should write to local file if HTTP API fails."""
        from pre_compact import run_pre_compact

        with tempfile.TemporaryDirectory() as tmpdir:
            sessions_dir = Path(tmpdir)
            mock_sessions_base.return_value = sessions_dir

            mock_plan_path.return_value = Path(tmpdir) / "nonexistent.json"

            mock_stdin.return_value = {
                "session_id": "test123",
                "trigger": "manual",
                "custom_instructions": "compress heavily",
            }

            mock_urlopen.side_effect = Exception("Connection refused")

            result = run_pre_compact()

            fallback_file = sessions_dir / "test123" / "pre-compact-state.json"
            assert fallback_file.exists()

            state = json.loads(fallback_file.read_text())
            assert state["trigger"] == "manual"

            assert result == 0
            captured = capsys.readouterr()
            assert "local file" in captured.err

    @patch("pre_compact.urllib.request.urlopen")
    @patch("pre_compact.read_hook_stdin")
    @patch("pre_compact.get_session_plan_path")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123"})
    def test_captures_trigger_type(self, mock_plan_path, mock_stdin, mock_urlopen, capsys):
        """Should capture whether compaction was manual or auto."""
        from pre_compact import run_pre_compact

        mock_plan_path.return_value = Path("/nonexistent")
        mock_stdin.return_value = {
            "session_id": "test123",
            "trigger": "manual",
            "custom_instructions": "focus on recent work",
        }

        mock_response = MagicMock()
        mock_response.status = 200
        mock_urlopen.return_value = mock_response

        result = run_pre_compact()

        req = mock_urlopen.call_args[0][0]
        payload = json.loads(req.data.decode())
        assert "manual" in payload["text"]

        assert result == 0

    @patch("pre_compact.urllib.request.urlopen")
    @patch("pre_compact.read_hook_stdin")
    @patch("pre_compact.get_session_plan_path")
    @patch("os.environ", {"PILOT_SESSION_ID": "test123"})
    def test_handles_no_active_plan(self, mock_plan_path, mock_stdin, mock_urlopen):
        """Should handle case where no active plan exists."""
        from pre_compact import run_pre_compact

        mock_plan_path.return_value = Path("/nonexistent")
        mock_stdin.return_value = {
            "session_id": "test123",
            "trigger": "auto",
            "custom_instructions": "",
        }

        mock_response = MagicMock()
        mock_response.status = 200
        mock_urlopen.return_value = mock_response

        result = run_pre_compact()

        assert result == 0
        assert mock_urlopen.called


class TestCaptureTaskList:
    """Test _capture_task_list function."""

    def test_returns_none_when_no_session_id(self):
        """Should return None when PILOT_SESSION_ID is not set."""
        from pre_compact import _capture_task_list

        with patch.dict(os.environ, {"PILOT_SESSION_ID": ""}, clear=False):
            result = _capture_task_list()

        assert result is None

    def test_returns_none_when_tasks_dir_missing(self, tmp_path):
        """Should return None when task directory doesn't exist."""
        from pre_compact import _capture_task_list

        with patch.dict(os.environ, {"PILOT_SESSION_ID": "99999"}, clear=False):
            result = _capture_task_list()

        assert result is None

    def test_captures_task_count(self, tmp_path):
        """Should capture task count from task directory."""
        from pre_compact import _capture_task_list

        pid = "99999"
        tasks_dir = tmp_path / ".claude" / "tasks" / f"pilot-{pid}"
        tasks_dir.mkdir(parents=True)
        (tasks_dir / "1.json").write_text('{"id": "1", "subject": "task 1"}')
        (tasks_dir / "2.json").write_text('{"id": "2", "subject": "task 2"}')

        with (
            patch.dict(os.environ, {"PILOT_SESSION_ID": pid}, clear=False),
            patch.object(Path, "home", return_value=tmp_path),
        ):
            result = _capture_task_list()

        assert result is not None
        assert result["task_count"] == 2

    def test_returns_none_when_no_task_files(self, tmp_path):
        """Should return None when task directory is empty."""
        from pre_compact import _capture_task_list

        pid = "99999"
        tasks_dir = tmp_path / ".claude" / "tasks" / f"pilot-{pid}"
        tasks_dir.mkdir(parents=True)

        with (
            patch.dict(os.environ, {"PILOT_SESSION_ID": pid}, clear=False),
            patch.object(Path, "home", return_value=tmp_path),
        ):
            result = _capture_task_list()

        assert result is None
