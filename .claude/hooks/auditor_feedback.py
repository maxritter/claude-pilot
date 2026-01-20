#!/usr/bin/env python3
"""Auditor feedback hook - displays rule violations from the Auditor agent."""

from __future__ import annotations

import json
import sys
from pathlib import Path

FINDINGS_FILE = Path("/tmp/ccp-auditor-findings.json")

RED = "\033[0;31m"
YELLOW = "\033[0;33m"
NC = "\033[0m"


def run_auditor_feedback() -> int:
    """Read findings file and display violations."""
    if not FINDINGS_FILE.exists():
        return 0

    try:
        data = json.loads(FINDINGS_FILE.read_text())
        violations = data.get("violations", [])

        if not violations:
            FINDINGS_FILE.unlink(missing_ok=True)
            return 0

        print("", file=sys.stderr)
        print(f"{RED}{'=' * 60}{NC}", file=sys.stderr)
        print(f"{RED}⚠️  AUDITOR VIOLATION - IMMEDIATE ACTION REQUIRED  ⚠️{NC}", file=sys.stderr)
        print(f"{RED}{'=' * 60}{NC}", file=sys.stderr)
        print("", file=sys.stderr)
        print(f"{YELLOW}The Auditor has detected rule violations that MUST be addressed.{NC}", file=sys.stderr)
        print(f"{YELLOW}Do NOT proceed with other work until these are fixed.{NC}", file=sys.stderr)
        print("", file=sys.stderr)

        for v in violations[:3]:
            rule = v.get("rule", "unknown")
            severity = v.get("severity", "warning")
            message = v.get("message", "")
            evidence = v.get("evidence", "")

            color = RED if severity == "error" else YELLOW
            icon = "❌" if severity == "error" else "⚠️"

            print(f"{color}{icon} VIOLATION: {rule}{NC}", file=sys.stderr)
            print(f"{color}   {message}{NC}", file=sys.stderr)
            if evidence:
                print(f"{color}   Evidence: {evidence[:150]}{NC}", file=sys.stderr)
            print("", file=sys.stderr)

        print(f"{RED}ACTION: Fix these violations NOW before continuing.{NC}", file=sys.stderr)
        print(f"{RED}{'=' * 60}{NC}", file=sys.stderr)

        FINDINGS_FILE.unlink(missing_ok=True)
        return 2

    except (json.JSONDecodeError, OSError):
        return 0


if __name__ == "__main__":
    sys.exit(run_auditor_feedback())
