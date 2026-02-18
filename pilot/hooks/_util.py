"""Shared utilities for hook scripts.

This module provides common constants, color codes, session path helpers,
and utility functions used across all hook scripts.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

RED = "\033[0;31m"
YELLOW = "\033[0;33m"
GREEN = "\033[0;32m"
CYAN = "\033[0;36m"
BLUE = "\033[0;34m"
MAGENTA = "\033[0;35m"
NC = "\033[0m"

FILE_LENGTH_WARN = 300
FILE_LENGTH_CRITICAL = 500

_AUTOCOMPACT_BUFFER_TOKENS = 33_000


def _read_model_from_config() -> str:
    """Read user's main model from ~/.pilot/config.json.

    Intentionally standalone — hooks cannot import from launcher.
    Returns 'sonnet' (default) on any error.
    """
    try:
        config_path = Path.home() / ".pilot" / "config.json"
        data = json.loads(config_path.read_text())
        model = data.get("model", "sonnet")
        if isinstance(model, str) and model in ("sonnet", "sonnet[1m]", "opus", "opus[1m]"):
            return model
    except Exception:
        pass
    return "sonnet"


def _get_max_context_tokens() -> int:
    """Return context window size for the user's configured model.

    Returns 1_000_000 for 1M variants, 200_000 otherwise.
    """
    model = _read_model_from_config()
    return 1_000_000 if "[1m]" in model else 200_000


def _get_compaction_threshold_pct() -> float:
    """Return compaction threshold as percentage of total context window.

    Formula: (window_size - buffer) / window_size * 100
    - 200K context: 83.5%
    - 1M context:  96.7%
    """
    window = _get_max_context_tokens()
    return (window - _AUTOCOMPACT_BUFFER_TOKENS) / window * 100


def _sessions_base() -> Path:
    """Get base sessions directory."""
    return Path.home() / ".pilot" / "sessions"


def get_session_cache_path() -> Path:
    """Get session-scoped context cache path."""
    session_id = os.environ.get("PILOT_SESSION_ID", "").strip() or "default"
    cache_dir = _sessions_base() / session_id
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / "context-cache.json"


def get_session_plan_path() -> Path:
    """Get session-scoped active plan JSON path."""
    session_id = os.environ.get("PILOT_SESSION_ID", "").strip() or "default"
    return _sessions_base() / session_id / "active_plan.json"


def find_git_root() -> Path | None:
    """Find git repository root."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0:
            return Path(result.stdout.strip())
    except Exception:
        pass
    return None


def read_hook_stdin() -> dict:
    """Read and parse JSON from stdin.

    Returns empty dict on error or invalid JSON.
    """
    try:
        content = sys.stdin.read()
        if not content:
            return {}
        return json.loads(content)
    except (json.JSONDecodeError, OSError):
        return {}


def get_edited_file_from_stdin() -> Path | None:
    """Get the edited file path from PostToolUse hook stdin."""
    try:
        import select

        if select.select([sys.stdin], [], [], 0)[0]:
            data = json.load(sys.stdin)
            tool_input = data.get("tool_input", {})
            file_path = tool_input.get("file_path")
            if file_path:
                return Path(file_path)
    except Exception:
        pass
    return None


def is_waiting_for_user_input(transcript_path: str) -> bool:
    """Check if Claude's last action was asking the user a question."""
    try:
        transcript = Path(transcript_path)
        if not transcript.exists():
            return False

        last_assistant_msg = None
        with transcript.open() as f:
            for line in f:
                try:
                    msg = json.loads(line)
                    if msg.get("type") == "assistant":
                        last_assistant_msg = msg
                except json.JSONDecodeError:
                    continue

        if not last_assistant_msg:
            return False

        message = last_assistant_msg.get("message", {})
        if not isinstance(message, dict):
            return False

        content = message.get("content", [])
        if not isinstance(content, list):
            return False

        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                if block.get("name") == "AskUserQuestion":
                    return True

        return False
    except OSError:
        return False


def check_file_length(file_path: Path) -> bool:
    """Warn if file exceeds length thresholds.

    Returns True if warning was emitted, False otherwise.
    """
    try:
        line_count = len(file_path.read_text().splitlines())
    except Exception:
        return False

    if line_count > FILE_LENGTH_CRITICAL:
        print("", file=sys.stderr)
        print(
            f"{RED}🛑 FILE TOO LONG: {file_path.name} has {line_count} lines (limit: {FILE_LENGTH_CRITICAL}){NC}",
            file=sys.stderr,
        )
        print(f"   Split into smaller, focused modules (<{FILE_LENGTH_WARN} lines each).", file=sys.stderr)
        return True
    elif line_count > FILE_LENGTH_WARN:
        print("", file=sys.stderr)
        print(
            f"{YELLOW}⚠️  FILE GROWING LONG: {file_path.name} has {line_count} lines (warn: {FILE_LENGTH_WARN}){NC}",
            file=sys.stderr,
        )
        print("   Consider splitting before it grows further.", file=sys.stderr)
        return True
    return False
