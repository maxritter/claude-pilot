#!/usr/bin/env python3
"""Context monitor - warns when context usage is high."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

THRESHOLD_WARN = 80
THRESHOLD_STOP = 90
LEARN_THRESHOLDS = [40, 60, 80]

CACHE_FILE = Path("/tmp/.claude_context_cache.json")
CACHE_TTL = 30

RED = "\033[0;31m"
YELLOW = "\033[0;33m"
CYAN = "\033[0;36m"
NC = "\033[0m"


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


def get_cached_context(session_id: str) -> tuple[int, bool, list[int], bool]:
    """Get cached context value if fresh enough and for current session.

    Returns: (tokens, is_cached, shown_learn_thresholds, shown_80_warn)
    """
    if CACHE_FILE.exists():
        try:
            with CACHE_FILE.open() as f:
                cache = json.load(f)
                if cache.get("session_id") == session_id and time.time() - cache.get("timestamp", 0) < CACHE_TTL:
                    return cache.get("tokens", 0), True, cache.get("shown_learn", []), cache.get("shown_80_warn", False)
        except (json.JSONDecodeError, OSError):
            pass
    return 0, False, [], False


def get_session_flags(session_id: str) -> tuple[list[int], bool]:
    """Get shown flags for this session (learn thresholds, 80% warning)."""
    if CACHE_FILE.exists():
        try:
            with CACHE_FILE.open() as f:
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
    if CACHE_FILE.exists():
        try:
            with CACHE_FILE.open() as f:
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
        with CACHE_FILE.open("w") as f:
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


def run_context_monitor() -> int:
    """Run context monitoring and return exit code."""
    session_id = get_current_session_id()
    if not session_id:
        return 0

    cached_tokens, is_cached, shown_learn, shown_80_warn = get_cached_context(session_id)
    if is_cached:
        total_tokens = cached_tokens
    else:
        session_file = find_session_file(session_id)
        if not session_file:
            return 0

        actual_tokens = get_actual_token_count(session_file)
        if actual_tokens is None:
            return 0

        total_tokens = actual_tokens
        shown_learn, shown_80_warn = get_session_flags(session_id)

    percentage = (total_tokens / 200000) * 100

    new_learn_shown: list[int] = []
    for threshold in LEARN_THRESHOLDS:
        if percentage >= threshold and threshold not in shown_learn:
            print("", file=sys.stderr)
            print(
                f"{CYAN}💡 Context {percentage:.0f}% - Online Learning reminder:{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   Did you discover a non-obvious solution or repeatable workflow?{NC}",
                file=sys.stderr,
            )
            print(
                f"{CYAN}   If yes, invoke Skill(learn) to extract it for future sessions.{NC}",
                file=sys.stderr,
            )
            new_learn_shown.append(threshold)
            break

    if percentage >= THRESHOLD_STOP:
        save_cache(total_tokens, session_id, new_learn_shown if new_learn_shown else None)
        print("", file=sys.stderr)
        print(f"{RED}⚠️  CONTEXT {percentage:.0f}% - HANDOFF NOW (not optional){NC}", file=sys.stderr)
        print(f"{RED}STOP current work. Your NEXT actions must be:{NC}", file=sys.stderr)
        print(
            f"{RED}1. Check for active plan: grep -l '^Status: PENDING\\|^Status: COMPLETE' docs/plans/*.md 2>/dev/null | head -1{NC}",
            file=sys.stderr,
        )
        print(f"{RED}2. Write /tmp/claude-continuation.md (include Active Plan path if found){NC}", file=sys.stderr)
        print(
            f"{RED}3. /learn check: Non-obvious solution or repeatable workflow? If yes, invoke Skill(learn) before handoff.{NC}",
            file=sys.stderr,
        )
        print(
            f"{RED}4. Run: ~/.pilot/bin/pilot send-clear <plan-path>  (or --general if no active plan){NC}",
            file=sys.stderr,
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
