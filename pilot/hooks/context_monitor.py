#!/usr/bin/env python3
"""Context monitor - warns when context usage is high."""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import (
    CYAN,
    MAGENTA,
    NC,
    RED,
    YELLOW,
    get_session_cache_path,
    get_session_plan_path,
)

THRESHOLD_WARN = 80
THRESHOLD_STOP = 90
THRESHOLD_CRITICAL = 95
LEARN_THRESHOLDS = [40, 60, 80]


def find_active_spec() -> tuple[Path | None, str | None]:
    """Find the active spec for THIS session via session-scoped active_plan.json."""
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
        if status in ("PENDING", "COMPLETE"):
            return plan_file, status
    except OSError:
        pass

    return None, None


def print_spec_warning(spec_path: Path, spec_status: str) -> None:
    """Print spec-specific warning at high context."""
    if spec_status == "COMPLETE":
        print(f"{MAGENTA}{'=' * 60}{NC}", file=sys.stderr)
        print(f"{MAGENTA}⛔ ACTIVE SPEC AT STATUS: COMPLETE - VERIFICATION REQUIRED{NC}", file=sys.stderr)
        print(f"{MAGENTA}{'=' * 60}{NC}", file=sys.stderr)
        print(f"{MAGENTA}Spec: {spec_path}{NC}", file=sys.stderr)
        print("", file=sys.stderr)
        print(f"{MAGENTA}You MUST run Phase 3 VERIFICATION before handoff:{NC}", file=sys.stderr)
        print(f"{MAGENTA}  1. Run tests and type checking{NC}", file=sys.stderr)
        print(f"{MAGENTA}  2. Execute actual program{NC}", file=sys.stderr)
        print(f"{MAGENTA}  3. Run code review (spec-verifier agent){NC}", file=sys.stderr)
        print(f"{MAGENTA}  4. Update status to VERIFIED{NC}", file=sys.stderr)
        print(f"{MAGENTA}  5. THEN do handoff{NC}", file=sys.stderr)
        print("", file=sys.stderr)
        print(f"{MAGENTA}DO NOT summarize and stop. VERIFICATION is NON-NEGOTIABLE.{NC}", file=sys.stderr)
        print(f"{MAGENTA}{'=' * 60}{NC}", file=sys.stderr)
    elif spec_status == "PENDING":
        print(f"{YELLOW}📋 Active spec: {spec_path} (Status: PENDING){NC}", file=sys.stderr)
        print(f"{YELLOW}   Continue implementation or get approval before handoff.{NC}", file=sys.stderr)
        print("", file=sys.stderr)


def get_current_session_id() -> str:
    """Get current session ID from history."""
    history = Path.home() / ".claude" / "history.jsonl"
    if not history.exists():
        return ""
    try:
        with history.open() as f:
            lines = f.readlines()
            if lines:
                return json.loads(lines[-1]).get("sessionId", "")
    except (json.JSONDecodeError, OSError):
        pass
    return ""


def find_session_file(session_id: str) -> Path | None:
    """Find session file for given session ID."""
    projects_dir = Path.home() / ".claude" / "projects"
    if not projects_dir.exists():
        return None
    for project_dir in projects_dir.iterdir():
        if project_dir.is_dir():
            session_file = project_dir / f"{session_id}.jsonl"
            if session_file.exists():
                return session_file
    return None


def get_actual_token_count(session_file: Path) -> int | None:
    """Get actual token count from the most recent API usage data."""
    last_usage = None

    try:
        with session_file.open() as f:
            for line in f:
                try:
                    msg = json.loads(line)
                    if msg.get("type") != "assistant":
                        continue

                    message = msg.get("message", {})
                    if not isinstance(message, dict):
                        continue

                    usage = message.get("usage")
                    if usage:
                        last_usage = usage
                except (json.JSONDecodeError, KeyError):
                    continue
    except OSError:
        return None

    if not last_usage:
        return None

    input_tokens = last_usage.get("input_tokens", 0)
    cache_creation = last_usage.get("cache_creation_input_tokens", 0)
    cache_read = last_usage.get("cache_read_input_tokens", 0)

    return input_tokens + cache_creation + cache_read


def get_session_flags(session_id: str) -> tuple[list[int], bool]:
    """Get shown flags for this session (learn thresholds, 80% warning)."""
    if get_session_cache_path().exists():
        try:
            with get_session_cache_path().open() as f:
                cache = json.load(f)
                if cache.get("session_id") == session_id:
                    return cache.get("shown_learn", []), cache.get("shown_80_warn", False)
        except (json.JSONDecodeError, OSError):
            pass
    return [], False


def save_cache(
    tokens: int, session_id: str, shown_learn: list[int] | None = None, shown_80_warn: bool | None = None
) -> None:
    """Save context calculation to cache with session ID."""
    existing_shown: list[int] = []
    existing_80_warn = False
    if get_session_cache_path().exists():
        try:
            with get_session_cache_path().open() as f:
                cache = json.load(f)
                if cache.get("session_id") == session_id:
                    existing_shown = cache.get("shown_learn", [])
                    existing_80_warn = cache.get("shown_80_warn", False)
        except (json.JSONDecodeError, OSError):
            pass

    if shown_learn:
        existing_shown = list(set(existing_shown + shown_learn))
    if shown_80_warn:
        existing_80_warn = True

    try:
        with get_session_cache_path().open("w") as f:
            json.dump(
                {
                    "tokens": tokens,
                    "timestamp": time.time(),
                    "session_id": session_id,
                    "shown_learn": existing_shown,
                    "shown_80_warn": existing_80_warn,
                },
                f,
            )
    except OSError:
        pass


def _get_continuation_path() -> str:
    """Get the absolute continuation file path for the current Pilot session."""
    pilot_session_id = os.environ.get("PILOT_SESSION_ID", "").strip() or "default"
    return str(Path.home() / ".pilot" / "sessions" / pilot_session_id / "continuation.md")


def _read_statusline_context_pct() -> float | None:
    """Read authoritative context percentage from statusline cache.

    Returns None if cache is missing, corrupt, stale (>60s), or from a different Claude Code session.
    """
    pilot_session_id = os.environ.get("PILOT_SESSION_ID", "").strip()
    if not pilot_session_id:
        return None
    cache_file = Path.home() / ".pilot" / "sessions" / pilot_session_id / "context-pct.json"
    if not cache_file.exists():
        return None
    try:
        data = json.loads(cache_file.read_text())
        ts = data.get("ts")
        if ts is None or time.time() - ts > 60:
            return None
        cached_session_id = data.get("session_id")
        if cached_session_id:
            current_session_id = get_current_session_id()
            if current_session_id and cached_session_id != current_session_id:
                return None
        pct = data.get("pct")
        return float(pct) if pct is not None else None
    except (json.JSONDecodeError, OSError, ValueError, TypeError):
        return None


def _resolve_context(session_id: str) -> tuple[float, int, list[int], bool] | None:
    """Resolve context percentage and tokens. Returns (pct, tokens, shown_learn, shown_80) or None."""
    statusline_pct = _read_statusline_context_pct()
    if statusline_pct is not None:
        shown_learn, shown_80_warn = get_session_flags(session_id)
        return statusline_pct, int(statusline_pct / 100 * 200000), shown_learn, shown_80_warn

    session_file = find_session_file(session_id)
    if not session_file:
        return None

    actual_tokens = get_actual_token_count(session_file)
    if actual_tokens is None:
        return None

    shown_learn, shown_80_warn = get_session_flags(session_id)
    return (actual_tokens / 200000) * 100, actual_tokens, shown_learn, shown_80_warn


def run_context_monitor() -> int:
    """Run context monitoring and return exit code."""
    session_id = get_current_session_id()
    if not session_id:
        return 0

    resolved = _resolve_context(session_id)
    if resolved is None:
        return 0

    percentage, total_tokens, shown_learn, shown_80_warn = resolved

    save_cache(total_tokens, session_id)

    new_learn_shown: list[int] = []
    for threshold in LEARN_THRESHOLDS:
        if percentage >= threshold and threshold not in shown_learn:
            print("", file=sys.stderr)
            print(
                f"{CYAN}💡 Context {percentage:.0f}% - Pattern Recognition Check:{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   Did this session involve any of these?{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   • Undocumented API/tool integration figured out{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   • Multi-step workflow that will recur{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   • Workaround for a common limitation{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   • Non-obvious debugging solution{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   If yes → Invoke Skill(learn) now. It will evaluate if worth capturing.{NC}",
                file=sys.stderr,
            )
            new_learn_shown.append(threshold)
            break

    continuation_path = _get_continuation_path()

    if percentage >= THRESHOLD_CRITICAL:
        save_cache(total_tokens, session_id, new_learn_shown if new_learn_shown else None)
        print("", file=sys.stderr)
        print(f"{RED}🚨 CONTEXT {percentage:.0f}% - CRITICAL: HANDOFF NOW IN THIS TURN{NC}", file=sys.stderr)
        print(f"{RED}Do NOT write code, fix errors, or run commands.{NC}", file=sys.stderr)
        print(f"{RED}Execute BOTH steps below in THIS SINGLE TURN (no stopping between):{NC}", file=sys.stderr)
        print(f"{RED}  1. Write {continuation_path}{NC}", file=sys.stderr)
        print(f"{RED}  2. Run: ~/.pilot/bin/pilot send-clear [plan-path|--general]{NC}", file=sys.stderr)
        print(
            f"{RED}Do NOT output a summary and stop. Do NOT wait for user. Execute send-clear NOW.{NC}", file=sys.stderr
        )
        return 2

    if percentage >= THRESHOLD_STOP:
        save_cache(total_tokens, session_id, new_learn_shown if new_learn_shown else None)
        print("", file=sys.stderr)

        spec_path, spec_status = find_active_spec()
        if spec_path and spec_status:
            print_spec_warning(spec_path, spec_status)
            if spec_status == "COMPLETE":
                return 2

        print(f"{RED}⚠️  CONTEXT {percentage:.0f}% - MANDATORY HANDOFF{NC}", file=sys.stderr)
        print(f"{RED}Do NOT start new tasks or fix cycles. Execute handoff in a SINGLE TURN:{NC}", file=sys.stderr)
        print(f"{RED}  1. Write {continuation_path}{NC}", file=sys.stderr)
        print(f"{RED}  2. Run: ~/.pilot/bin/pilot send-clear [plan-path|--general]{NC}", file=sys.stderr)
        print(
            f"{RED}Do NOT summarize and stop. The send-clear command triggers automatic restart.{NC}", file=sys.stderr
        )
        return 2

    if percentage >= THRESHOLD_WARN and not shown_80_warn:
        save_cache(total_tokens, session_id, new_learn_shown if new_learn_shown else None, shown_80_warn=True)
        print("", file=sys.stderr)
        print(f"{YELLOW}⚠️  CONTEXT {percentage:.0f}% - PREPARE FOR HANDOFF{NC}", file=sys.stderr)
        print(
            f"{YELLOW}Finish current task with full quality, then hand off. Never rush - next session continues seamlessly!{NC}",
            file=sys.stderr,
        )
        return 2

    if percentage >= THRESHOLD_WARN and shown_80_warn:
        if new_learn_shown:
            save_cache(total_tokens, session_id, new_learn_shown)
        print(f"{YELLOW}Context: {percentage:.0f}%{NC}", file=sys.stderr)
        return 2

    if new_learn_shown:
        save_cache(total_tokens, session_id, new_learn_shown)

    return 0


if __name__ == "__main__":
    sys.exit(run_context_monitor())
