"""Tests for spec_plan_validator hook."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from spec_plan_validator import main


class TestSpecPlanValidator:
    @patch("spec_plan_validator.is_waiting_for_user_input", return_value=False)
    @patch("sys.stdin")
    def test_blocks_when_no_plans_dir(self, mock_stdin, mock_waiting, tmp_path, capsys):
        with patch(
            "spec_plan_validator.json.load",
            return_value={
                "transcript_path": "/t.jsonl",
                "stop_hook_active": False,
                "project_root": str(tmp_path),
            },
        ):
            with patch("spec_plan_validator.os.environ", {"CLAUDE_PROJECT_ROOT": str(tmp_path)}):
                result = main()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["decision"] == "block"
        assert "not created yet" in data["reason"]

    @patch("spec_plan_validator.is_waiting_for_user_input", return_value=False)
    @patch("sys.stdin")
    def test_blocks_when_no_today_plans(self, mock_stdin, mock_waiting, tmp_path, capsys):
        plans_dir = tmp_path / "docs" / "plans"
        plans_dir.mkdir(parents=True)
        (plans_dir / "2020-01-01-old-plan.md").touch()

        with patch(
            "spec_plan_validator.json.load",
            return_value={
                "transcript_path": "/t.jsonl",
                "stop_hook_active": False,
                "project_root": str(tmp_path),
            },
        ):
            with patch("spec_plan_validator.os.environ", {"CLAUDE_PROJECT_ROOT": str(tmp_path)}):
                result = main()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["decision"] == "block"

    @patch("spec_plan_validator.is_waiting_for_user_input", return_value=False)
    @patch("spec_plan_validator.datetime")
    @patch("sys.stdin")
    def test_allows_when_today_plan_exists(self, mock_stdin, mock_dt, mock_waiting, tmp_path, capsys):
        import datetime

        mock_dt.date.today.return_value = datetime.date(2026, 2, 18)

        plans_dir = tmp_path / "docs" / "plans"
        plans_dir.mkdir(parents=True)
        (plans_dir / "2026-02-18-test-plan.md").touch()

        with patch(
            "spec_plan_validator.json.load",
            return_value={
                "transcript_path": "/t.jsonl",
                "stop_hook_active": False,
                "project_root": str(tmp_path),
            },
        ):
            with patch("spec_plan_validator.os.environ", {"CLAUDE_PROJECT_ROOT": str(tmp_path)}):
                result = main()

        assert result == 0
        captured = capsys.readouterr()
        assert captured.out == ""

    @patch("sys.stdin")
    def test_allows_when_waiting_for_user(self, mock_stdin):
        with patch(
            "spec_plan_validator.json.load",
            return_value={
                "transcript_path": "/t.jsonl",
                "stop_hook_active": False,
            },
        ):
            with patch("spec_plan_validator.is_waiting_for_user_input", return_value=True):
                result = main()

        assert result == 0
