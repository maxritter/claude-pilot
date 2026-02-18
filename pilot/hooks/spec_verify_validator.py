#!/usr/bin/env python3
"""Stop hook for spec-verify phase - verifies plan status was updated."""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import is_waiting_for_user_input, stop_block


def main() -> int:
    """Check if plan status was updated from COMPLETE."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    if input_data.get("stop_hook_active", False):
        return 0
    transcript_path = input_data.get("transcript_path", "")
    if transcript_path and is_waiting_for_user_input(transcript_path):
        return 0
    session_id = os.environ.get("PILOT_SESSION_ID", "").strip() or "default"
    plan_json = Path.home() / ".pilot" / "sessions" / session_id / "active_plan.json"
    if not plan_json.exists():
        return 0
    try:
        data = json.loads(plan_json.read_text())
        plan_path_str = data.get("plan_path", "")
        if not plan_path_str:
            return 0
        plan_file = Path(plan_path_str)
        if not plan_file.is_absolute():
            plan_file = Path(os.environ.get("CLAUDE_PROJECT_ROOT", str(Path.cwd()))) / plan_file
        if not plan_file.exists():
            return 0
        status_match = re.search(r"^Status:\s*(\w+)", plan_file.read_text(), re.MULTILINE)
        status = status_match.group(1).upper() if status_match else None
    except (json.JSONDecodeError, OSError):
        return 0
    if status == "COMPLETE":
        print(
            stop_block(
                "Plan status was not updated. spec-verify must update status from COMPLETE to VERIFIED or PENDING."
            )
        )
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
