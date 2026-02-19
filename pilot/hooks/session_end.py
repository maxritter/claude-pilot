#!/usr/bin/env python3
"""SessionEnd hook - stops worker only when no other sessions are active.

Sends a 'Session Ended' notification. Spec-specific notifications
(verification_complete, plan_approval) are sent by the spec skills
via `pilot notify` to avoid duplication.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

PILOT_BIN = Path.home() / ".pilot" / "bin" / "pilot"


def _get_active_session_count() -> int:
    """Get active session count from the pilot binary."""
    try:
        result = subprocess.run(
            [str(PILOT_BIN), "sessions", "--json"],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data.get("count", 0)
    except (json.JSONDecodeError, OSError, subprocess.TimeoutExpired):
        pass
    return 0


def main() -> int:
    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT", "")
    if not plugin_root:
        return 0

    count = _get_active_session_count()
    if count > 1:
        return 0

    stop_script = Path(plugin_root) / "scripts" / "worker-service.cjs"
    try:
        subprocess.run(
            ["bun", str(stop_script), "stop"],
            capture_output=True,
            text=True,
            check=False,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
