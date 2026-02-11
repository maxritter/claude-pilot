"""Tests for spec-plan and spec-verify validation hooks."""

from __future__ import annotations

import datetime
import json
import os
import subprocess
import tempfile
from pathlib import Path

PROJECT_ROOT = str(Path(__file__).parent.parent.parent.parent)


class TestSpecPlanValidator:
    """Test spec_plan_validator.py Stop hook."""

    def test_allows_stop_when_plan_created(self):
        """Should allow stop when plan file exists for today."""
        with tempfile.TemporaryDirectory() as tmpdir:
            today = datetime.date.today().strftime("%Y-%m-%d")
            plan_path = Path(tmpdir) / "docs" / "plans" / f"{today}-test-feature.md"
            plan_path.parent.mkdir(parents=True, exist_ok=True)
            plan_path.write_text("# Test Plan\n\nStatus: PENDING\n")

            result = subprocess.run(
                ["uv", "run", "python", "pilot/hooks/spec_plan_validator.py"],
                input=json.dumps({"project_root": tmpdir, "stop_hook_active": False}),
                capture_output=True,
                text=True,
                cwd=PROJECT_ROOT,
            )

            assert result.returncode == 0, f"Should allow stop when plan exists. stderr: {result.stderr}"

    def test_blocks_stop_when_no_plan(self):
        """Should block stop when no plan file exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = subprocess.run(
                ["uv", "run", "python", "pilot/hooks/spec_plan_validator.py"],
                input=json.dumps({"project_root": tmpdir, "stop_hook_active": False}),
                capture_output=True,
                text=True,
                cwd=PROJECT_ROOT,
            )

            assert result.returncode == 2, f"Should block stop when plan missing. stderr: {result.stderr}"
            assert "Plan file not created yet" in result.stderr

    def test_escape_hatch_allows_stop(self):
        """Should allow stop when stop_hook_active is true (escape hatch)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = subprocess.run(
                ["uv", "run", "python", "pilot/hooks/spec_plan_validator.py"],
                input=json.dumps({"project_root": tmpdir, "stop_hook_active": True}),
                capture_output=True,
                text=True,
                cwd=PROJECT_ROOT,
            )

            assert result.returncode == 0, f"Escape hatch should allow stop. stderr: {result.stderr}"


    def test_allows_stop_when_asking_user_question(self):
        """Should allow stop when AskUserQuestion was the last tool."""
        with tempfile.TemporaryDirectory() as tmpdir:
            transcript = Path(tmpdir) / "transcript.jsonl"
            msg = {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "AskUserQuestion", "input": {}}
                    ]
                },
            }
            transcript.write_text(json.dumps(msg) + "\n")

            result = subprocess.run(
                ["uv", "run", "python", "pilot/hooks/spec_plan_validator.py"],
                input=json.dumps({
                    "project_root": tmpdir,
                    "stop_hook_active": False,
                    "transcript_path": str(transcript),
                }),
                capture_output=True,
                text=True,
                cwd=PROJECT_ROOT,
            )

            assert result.returncode == 0, f"Should allow stop during AskUserQuestion. stderr: {result.stderr}"


class TestSpecVerifyValidator:
    """Test spec_verify_validator.py Stop hook."""

    TEST_SESSION_ID = "_test_verify_validator_"

    def _setup_active_plan(self, plan_path: Path) -> Path:
        """Write active_plan.json in an isolated test session directory."""
        session_dir = Path.home() / ".pilot" / "sessions" / self.TEST_SESSION_ID
        session_dir.mkdir(parents=True, exist_ok=True)
        active_plan_json = session_dir / "active_plan.json"
        active_plan_json.write_text(json.dumps({"plan_path": str(plan_path)}))
        return active_plan_json

    def _run_validator(self, input_data: dict) -> subprocess.CompletedProcess:
        """Run spec_verify_validator with isolated PILOT_SESSION_ID."""
        env = {**os.environ, "PILOT_SESSION_ID": self.TEST_SESSION_ID}
        return subprocess.run(
            ["uv", "run", "python", "pilot/hooks/spec_verify_validator.py"],
            input=json.dumps(input_data),
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            env=env,
        )

    def test_allows_stop_when_status_changed(self):
        """Should allow stop when plan status is not COMPLETE."""
        with tempfile.TemporaryDirectory() as tmpdir:
            plan_path = Path(tmpdir) / "docs" / "plans" / "2026-02-11-test.md"
            plan_path.parent.mkdir(parents=True, exist_ok=True)
            plan_path.write_text("# Test\n\nStatus: VERIFIED\n")

            active_plan_json = self._setup_active_plan(plan_path)
            try:
                result = self._run_validator({"project_root": tmpdir, "stop_hook_active": False})
                assert result.returncode == 0, f"Should allow stop when VERIFIED. stderr: {result.stderr}"
            finally:
                active_plan_json.unlink(missing_ok=True)

    def test_blocks_stop_when_status_complete(self):
        """Should block stop when plan status is still COMPLETE."""
        with tempfile.TemporaryDirectory() as tmpdir:
            plan_path = Path(tmpdir) / "docs" / "plans" / "2026-02-11-test.md"
            plan_path.parent.mkdir(parents=True, exist_ok=True)
            plan_path.write_text("# Test\n\nStatus: COMPLETE\n")

            active_plan_json = self._setup_active_plan(plan_path)
            try:
                result = self._run_validator({"project_root": tmpdir, "stop_hook_active": False})
                assert result.returncode == 2, f"Should block stop when COMPLETE. stderr: {result.stderr}"
                assert "status was not updated" in result.stderr.lower()
            finally:
                active_plan_json.unlink(missing_ok=True)

    def test_allows_stop_when_asking_user_question(self):
        """Should allow stop when AskUserQuestion was the last tool."""
        with tempfile.TemporaryDirectory() as tmpdir:
            plan_path = Path(tmpdir) / "docs" / "plans" / "2026-02-11-test.md"
            plan_path.parent.mkdir(parents=True, exist_ok=True)
            plan_path.write_text("# Test\n\nStatus: COMPLETE\n")

            transcript = Path(tmpdir) / "transcript.jsonl"
            msg = {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "AskUserQuestion", "input": {}}
                    ]
                },
            }
            transcript.write_text(json.dumps(msg) + "\n")

            active_plan_json = self._setup_active_plan(plan_path)
            try:
                result = self._run_validator({
                    "project_root": tmpdir,
                    "stop_hook_active": False,
                    "transcript_path": str(transcript),
                })
                assert result.returncode == 0, f"Should allow stop during AskUserQuestion. stderr: {result.stderr}"
            finally:
                active_plan_json.unlink(missing_ok=True)
