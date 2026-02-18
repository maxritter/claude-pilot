#!/usr/bin/env python3
"""Context monitor - warns when context usage is high."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import (
    CYAN,
    NC,
    YELLOW,
    _get_compaction_threshold_pct,
    _get_max_context_tokens,
    get_session_cache_path,
)

THRESHOLD_WARN = 65
THRESHOLD_AUTOCOMPACT = 75
LEARN_THRESHOLDS = [40, 55, 65]


def _to_effective(raw_pct: float) -> float:
    """Convert raw context % to effective % (where compaction threshold = 100%)."""
    return min(raw_pct / _get_compaction_threshold_pct() * 100, 100)


def _get_pilot_session_id() -> str:
    """Get Pilot session ID from environment."""
    return os.environ.get("PILOT_SESSION_ID", "").strip() or "unknown"


def get_session_flags(session_id: str) -> tuple[list[int], bool]:
    """Get shown flags for this session (learn thresholds, warn-once flag)."""
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


def _read_statusline_context_pct() -> float | None:
    """Read authoritative context percentage from statusline cache.

    Returns None if cache is missing, corrupt, or stale (>60s).
    Cache is already scoped per Pilot session via PILOT_SESSION_ID.
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
        pct = data.get("pct")
        return float(pct) if pct is not None else None
    except (json.JSONDecodeError, OSError, ValueError, TypeError):
        return None


def _is_throttled(session_id: str) -> bool:
    """Check if context monitoring should be throttled (skipped).

    Returns True if:
    - Last check was < 30 seconds ago AND
    - Last cached context was below the warning threshold (~80% effective)

    Always returns False at high context (never throttle when approaching compaction).
    """
    cache_path = get_session_cache_path()
    if not cache_path.exists():
        return False

    try:
        with cache_path.open() as f:
            cache = json.load(f)
            if cache.get("session_id") != session_id:
                return False

            timestamp = cache.get("timestamp")
            if timestamp is None:
                return False

            if time.time() - timestamp < 30:
                tokens = cache.get("tokens", 0)
                percentage = (tokens / _get_max_context_tokens()) * 100
                if percentage < THRESHOLD_WARN:
                    return True

            return False
    except (json.JSONDecodeError, OSError, KeyError):
        return False


def _resolve_context(session_id: str) -> tuple[float, int, list[int], bool] | None:
    """Resolve context percentage and tokens. Returns (pct, tokens, shown_learn, shown_80) or None.
    Uses the session-scoped statusline cache (context-pct.json) which is
    written by the statusline process for this specific Pilot session.
    """
    statusline_pct = _read_statusline_context_pct()
    if statusline_pct is None:
        return None

    shown_learn, shown_80_warn = get_session_flags(session_id)
    return statusline_pct, int(statusline_pct / 100 * _get_max_context_tokens()), shown_learn, shown_80_warn


def run_context_monitor() -> int:
    """Run context monitoring and return exit code."""
    session_id = _get_pilot_session_id()

    if _is_throttled(session_id):
        return 0

    resolved = _resolve_context(session_id)
    if resolved is None:
        return 0

    percentage, total_tokens, shown_learn, shown_80_warn = resolved
    effective = _to_effective(percentage)

    save_cache(total_tokens, session_id)

    new_learn_shown: list[int] = []
    if percentage < THRESHOLD_AUTOCOMPACT:
        for threshold in LEARN_THRESHOLDS:
            if percentage >= threshold and threshold not in shown_learn:
                print(
                    f"{CYAN}💡 Context {effective:.0f}% — non-obvious discovery or reusable workflow? → Invoke Skill(learn){NC}",
                    file=sys.stderr,
                )
                new_learn_shown.append(threshold)
                break

    if percentage >= THRESHOLD_AUTOCOMPACT:
        save_cache(total_tokens, session_id, new_learn_shown if new_learn_shown else None)
        print("", file=sys.stderr)
        print(
            f"{YELLOW}⚠️  Context at {effective:.0f}%. Auto-compact approaching — no rush, no context is lost.{NC}",
            file=sys.stderr,
        )
        print(
            f"{YELLOW}Complete current task with full quality. Do NOT cut corners or skip verification.{NC}",
            file=sys.stderr,
        )
        return 2

    if percentage >= THRESHOLD_WARN and not shown_80_warn:
        save_cache(total_tokens, session_id, new_learn_shown if new_learn_shown else None, shown_80_warn=True)
        print("", file=sys.stderr)
        print(
            f"{CYAN}💡 Context at {effective:.0f}%. Auto-compact will handle context management automatically. No rush.{NC}",
            file=sys.stderr,
        )
        return 0

    if percentage >= THRESHOLD_WARN and shown_80_warn:
        if new_learn_shown:
            save_cache(total_tokens, session_id, new_learn_shown)
        return 0

    if new_learn_shown:
        save_cache(total_tokens, session_id, new_learn_shown)

    return 0


if __name__ == "__main__":
    sys.exit(run_context_monitor())
