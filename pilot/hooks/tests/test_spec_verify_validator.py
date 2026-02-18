"""Tests for spec_verify_validator hook."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))
from spec_verify_validator import main


class TestSpecVerifyValidator:
    @patch("spec_verify_validator.is_waiting_for_user_input", return_value=False)
    def test_blocks_when_status_complete(self, mock_waiting, tmp_path, capsys):
        session_dir = tmp_path / ".pilot" / "sessions" / "test-sess"
        session_dir.mkdir(parents=True)
        plan_file = tmp_path / "plan.md"
        plan_file.write_text("Status: COMPLETE\nApproved: Yes\n")
        (session_dir / "active_plan.json").write_text(
            json.dumps(
                {
                    "plan_path": str(plan_file),
                }
            )
        )

        with patch(
            "spec_verify_validator.json.load",
            return_value={
                "transcript_path": "/t.jsonl",
                "stop_hook_active": False,
            },
        ):
            with patch("pathlib.Path.home", return_value=tmp_path):
                with patch.dict("os.environ", {"PILOT_SESSION_ID": "test-sess"}):
                    result = main()

        assert result == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data["decision"] == "block"
        assert "not updated" in data["reason"]

    @patch("spec_verify_validator.is_waiting_for_user_input", return_value=False)
    def test_allows_when_status_verified(self, mock_waiting, tmp_path, capsys):
        session_dir = tmp_path / ".pilot" / "sessions" / "test-sess"
        session_dir.mkdir(parents=True)
        plan_file = tmp_path / "plan.md"
        plan_file.write_text("Status: VERIFIED\nApproved: Yes\n")
        (session_dir / "active_plan.json").write_text(
            json.dumps(
                {
                    "plan_path": str(plan_file),
                }
            )
        )

        with patch(
            "spec_verify_validator.json.load",
            return_value={
                "transcript_path": "/t.jsonl",
                "stop_hook_active": False,
            },
        ):
            with patch("pathlib.Path.home", return_value=tmp_path):
                with patch.dict("os.environ", {"PILOT_SESSION_ID": "test-sess"}):
                    result = main()

        assert result == 0
        captured = capsys.readouterr()
        assert captured.out == ""

    def test_allows_when_no_active_plan(self, tmp_path):
        with patch(
            "spec_verify_validator.json.load",
            return_value={
                "transcript_path": "/t.jsonl",
                "stop_hook_active": False,
            },
        ):
            with patch("pathlib.Path.home", return_value=tmp_path):
                with patch.dict("os.environ", {"PILOT_SESSION_ID": "no-plan"}):
                    result = main()

        assert result == 0
