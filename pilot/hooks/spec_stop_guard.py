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
from _util import CYAN, NC, RED, YELLOW, _sessions_base, get_session_plan_path, is_waiting_for_user_input

COOLDOWN_SECONDS = 60


def get_stop_guard_path() -> Path:
    """Get session-scoped stop guard state path."""
    session_id = os.environ.get("PILOT_SESSION_ID", "").strip() or "default"
    guard_dir = _sessions_base() / session_id
    guard_dir.mkdir(parents=True, exist_ok=True)
    return guard_dir / "spec-stop-guard"


def find_active_plan() -> tuple[Path | None, str | None, bool]:
    """Find the active plan for THIS session via session-scoped active_plan.json."""
    plan_json = get_session_plan_path()
    if not plan_json.exists():
        return None, None, False

    try:
        data = json.loads(plan_json.read_text())
        plan_path_str = data.get("plan_path", "")
    except (json.JSONDecodeError, OSError):
        return None, None, False

    if not plan_path_str:
        return None, None, False

    plan_file = Path(plan_path_str)
    if not plan_file.is_absolute():
        project_root = os.environ.get("CLAUDE_PROJECT_ROOT", str(Path.cwd()))
        plan_file = Path(project_root) / plan_file
    if not plan_file.exists():
        return None, None, False

    try:
        content = plan_file.read_text()
        status_match = re.search(r"^Status:\s*(\w+)", content, re.MULTILINE)
        if not status_match:
            return None, None, False
        status = status_match.group(1).upper()
        if status not in ("PENDING", "COMPLETE"):
            return None, None, False
        approved_match = re.search(r"^Approved:\s*(Yes|No)", content, re.MULTILINE | re.IGNORECASE)
        approved = bool(approved_match and approved_match.group(1).lower() == "yes")
        return plan_file, status, approved
    except OSError:
        return None, None, False


def get_next_phase(status: str, approved: bool) -> str:
    """Determine which phase skill should run next."""
    if status == "PENDING" and not approved:
        return "spec-plan"
    if status == "PENDING" and approved:
        return "spec-implement"
    if status == "COMPLETE":
        return "spec-verify"
    return "spec"


def main() -> int:
    """Check if stopping is allowed based on /spec workflow state."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    if input_data.get("stop_hook_active", False):
        return 0

    plan_path, status, approved = find_active_plan()
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

    next_phase = get_next_phase(status, approved)

    print(
        f"{RED}⛔ /spec workflow active - cannot stop without user interaction{NC}",
        file=sys.stderr,
    )
    print(f"{YELLOW}Active plan: {plan_path} (Status: {status}){NC}", file=sys.stderr)
    print(f"{YELLOW}💡 Stop again within 60s to force exit{NC}", file=sys.stderr)
    print("", file=sys.stderr)
    print("You may only stop when:", file=sys.stderr)
    print("  • Asking user for plan approval (use AskUserQuestion)", file=sys.stderr)
    print(
        "  • Asking user for an important decision (use AskUserQuestion)",
        file=sys.stderr,
    )
    print("", file=sys.stderr)

    if status == "PENDING" and not approved:
        print("Status is PENDING (not approved). Either:", file=sys.stderr)
        print("  1. Ask user for plan approval with AskUserQuestion", file=sys.stderr)
        print(
            "  2. If blocked, ask user for decision with AskUserQuestion",
            file=sys.stderr,
        )
        print("", file=sys.stderr)
        print(
            f"{CYAN}Next: Skill(skill='{next_phase}', args='{plan_path}'){NC}",
            file=sys.stderr,
        )
    elif status == "PENDING" and approved:
        print("Status is PENDING (approved). You must:", file=sys.stderr)
        print("  1. Continue implementing tasks", file=sys.stderr)
        print(
            "  2. If blocked, ask user for decision with AskUserQuestion",
            file=sys.stderr,
        )
        print("", file=sys.stderr)
        print(
            f"{CYAN}Next: Skill(skill='{next_phase}', args='{plan_path}'){NC}",
            file=sys.stderr,
        )
    elif status == "COMPLETE":
        print("Status is COMPLETE. You must:", file=sys.stderr)
        print("  1. Run verification phase", file=sys.stderr)
        print("  2. Update status to VERIFIED when done", file=sys.stderr)
        print(
            "  3. If issues found, fix them or ask user with AskUserQuestion",
            file=sys.stderr,
        )
        print("", file=sys.stderr)
        print(
            f"{CYAN}Next: Skill(skill='{next_phase}', args='{plan_path}'){NC}",
            file=sys.stderr,
        )

    print("", file=sys.stderr)
    print(
        "Continue the workflow or use AskUserQuestion if user input is needed.",
        file=sys.stderr,
    )

    return 2


if __name__ == "__main__":
    sys.exit(main())
