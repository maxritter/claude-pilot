#!/usr/bin/env python3
"""Stop hook for spec-plan phase - verifies plan file was created."""

from __future__ import annotations

import datetime
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import is_waiting_for_user_input, stop_block


def main() -> int:
    """Check if plan file was created before allowing stop."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    if input_data.get("stop_hook_active", False):
        return 0

    transcript_path = input_data.get("transcript_path", "")
    if transcript_path and is_waiting_for_user_input(transcript_path):
        return 0

    project_root = input_data.get("project_root") or os.environ.get("CLAUDE_PROJECT_ROOT") or str(Path.cwd())
    plans_dir = Path(project_root) / "docs" / "plans"

    today = datetime.date.today().strftime("%Y-%m-%d")
    if not plans_dir.exists():
        print(
            stop_block("Plan file not created yet. spec-plan must create a plan file in docs/plans/ before stopping.")
        )
        return 0

    today_plans = list(plans_dir.glob(f"{today}-*.md"))
    if not today_plans:
        print(stop_block(f"Plan file not created yet. Expected a plan file matching: docs/plans/{today}-*.md"))
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
