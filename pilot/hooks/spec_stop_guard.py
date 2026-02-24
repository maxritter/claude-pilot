#!/usr/bin/env python3
"""Stop guard for /spec workflow - prevents early finishing when plan is active.

Only allows stopping when:
1. Asking user for plan approval (AskUserQuestion tool)
2. Asking user for an important decision (AskUserQuestion tool)
3. No active plan exists (not in /spec mode)
4. User stops again within 60s cooldown (escape hatch)
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import _sessions_base, get_session_plan_path, is_waiting_for_user_input, stop_block

COOLDOWN_SECONDS = 60


def get_stop_guard_path() -> Path:
    """Get session-scoped stop guard state path."""
    session_id = os.environ.get("PILOT_SESSION_ID", "").strip() or "default"
    guard_dir = _sessions_base() / session_id
    guard_dir.mkdir(parents=True, exist_ok=True)
    return guard_dir / "spec-stop-guard"


def find_active_plan() -> tuple[Path | None, str | None]:
    """Find the active plan for THIS session via session-scoped active_plan.json."""
    plan_json = get_session_plan_path()
    if not plan_json.exists():
        return None, None

    try:
        data = json.loads(plan_json.read_text())
        plan_path_str = data.get("plan_path", "")
    except (json.JSONDecodeError, OSError):
        return None, None

    if not plan_path_str:
        return None, None

    plan_file = Path(plan_path_str)
    if not plan_file.is_absolute():
        project_root = os.environ.get("CLAUDE_PROJECT_ROOT", str(Path.cwd()))
        plan_file = Path(project_root) / plan_file
    if not plan_file.exists():
        return None, None

    try:
        content = plan_file.read_text()
        status_match = re.search(r"^Status:\s*(\w+)", content, re.MULTILINE)
        if not status_match:
            return None, None
        status = status_match.group(1).upper()
        if status not in ("PENDING", "COMPLETE"):
            return None, None
        return plan_file, status
    except OSError:
        return None, None


def main() -> int:
    """Check if stopping is allowed based on /spec workflow state."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    if input_data.get("stop_hook_active", False):
        return 0

    plan_path, status = find_active_plan()
    if plan_path is None or status is None:
        return 0

    transcript_path = input_data.get("transcript_path", "")
    if transcript_path and is_waiting_for_user_input(transcript_path):
        return 0

    now = time.time()
    state_file = get_stop_guard_path()
    if state_file.exists():
        try:
            last_block = float(state_file.read_text().strip())
            if now - last_block < COOLDOWN_SECONDS:
                state_file.unlink(missing_ok=True)
                return 0
        except (ValueError, OSError):
            pass

    try:
        state_file.write_text(str(now))
    except OSError:
        pass

    reason = (
        f"/spec workflow active — cannot stop without user interaction. "
        f"Active plan: {plan_path} (Status: {status}). "
        f"Stop again within 60s to force exit.\n\n"
        f"CRITICAL INSTRUCTION TO CLAUDE: Do NOT acknowledge this stop attempt. "
        f"Do NOT output resume instructions or say goodbye. "
        f"IMMEDIATELY continue working on the next pending task in the plan."
    )
    print(stop_block(reason))
    return 0


if __name__ == "__main__":
    sys.exit(main())
