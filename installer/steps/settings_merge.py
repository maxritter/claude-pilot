"""Settings merge utilities for non-destructive installer updates.

Provides three-way merge logic for settings files (~/.claude/settings.json,
~/.claude.json) and manifest-based tracking for Pilot-managed files
in shared directories (commands/, rules/).
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any


def merge_settings(
    baseline: dict[str, Any] | None,
    current: dict[str, Any],
    incoming: dict[str, Any],
) -> dict[str, Any]:
    """Three-way merge of settings: baseline (last Pilot install), current (on disk), incoming (new Pilot).

    Rules:
    - If no baseline exists (first install), incoming wins for all keys.
    - For list fields (permissions.allow, permissions.deny): union of current + incoming,
      minus any Pilot entries the user explicitly removed (in baseline but not in current).
    - For dict fields (env, attribution, statusLine): merge keys individually.
      If user changed a key from baseline value, keep user's value. Otherwise update to incoming.
    - For scalar fields: if user changed from baseline, keep user's value. Otherwise update.
    """
    result: dict[str, Any] = {}
    all_keys = set(incoming.keys()) | set(current.keys())

    for key in all_keys:
        in_incoming = key in incoming
        in_current = key in current
        in_baseline = baseline is not None and key in baseline

        if not in_incoming:
            if baseline is not None and in_baseline and current[key] == baseline[key]:
                pass
            else:
                result[key] = current[key]
        elif not in_current:
            result[key] = incoming[key]
        elif key == "permissions":
            result[key] = _merge_permissions(
                baseline.get("permissions", {}) if baseline is not None else None,
                current.get("permissions", {}),
                incoming.get("permissions", {}),
            )
        elif isinstance(incoming[key], dict) and isinstance(current[key], dict):
            result[key] = _merge_dict_field(
                baseline.get(key, {}) if baseline is not None and in_baseline else None,
                current[key],
                incoming[key],
            )
        else:
            if baseline is None or not in_baseline:
                result[key] = incoming[key]
            elif current[key] == baseline[key]:
                result[key] = incoming[key]
            else:
                result[key] = current[key]

    return result


def _merge_permissions(
    baseline: dict[str, Any] | None,
    current: dict[str, Any],
    incoming: dict[str, Any],
) -> dict[str, Any]:
    """Merge permissions with set-union for allow/deny lists.

    - Entries in incoming are always included (Pilot-managed).
    - User-added entries (in current but not in baseline) are preserved.
    - Entries the user explicitly removed (in baseline but not in current) stay removed.
    """
    result: dict[str, Any] = {}

    for list_key in ("allow", "deny"):
        incoming_set = set(incoming.get(list_key, []))
        current_set = set(current.get(list_key, []))

        if baseline is None:
            merged = incoming_set | current_set
        else:
            baseline_set = set(baseline.get(list_key, []))
            user_added = current_set - baseline_set
            user_removed = baseline_set - current_set
            merged = (incoming_set | user_added) - user_removed

        result[list_key] = sorted(merged)

    return result


def _merge_dict_field(
    baseline: dict[str, Any] | None,
    current: dict[str, Any],
    incoming: dict[str, Any],
) -> dict[str, Any]:
    """Merge a dict field (env, attribution, etc.) key by key.

    - New incoming keys are added.
    - User-only keys (not in incoming) are preserved.
    - If user changed a value from baseline, keep user's value.
    - Otherwise update to incoming value.
    """
    result: dict[str, Any] = {}
    all_keys = set(incoming.keys()) | set(current.keys())

    for key in all_keys:
        if key not in incoming:
            result[key] = current[key]
        elif key not in current:
            result[key] = incoming[key]
        elif baseline is None or key not in baseline:
            result[key] = incoming[key]
        elif current[key] == baseline[key]:
            result[key] = incoming[key]
        else:
            result[key] = current[key]

    return result


def merge_app_config(
    target: dict[str, Any],
    source: dict[str, Any],
    baseline: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Merge app-level preferences from source into target (~/.claude.json).

    With baseline (three-way merge): only updates keys the user hasn't manually changed.
    Without baseline (first install): sets all source keys into target.
    Returns patched dict if changes were made, None if no changes needed.
    """
    modified = False
    for key, value in source.items():
        if key in target and baseline is not None and key in baseline:
            if target[key] != baseline[key]:
                continue
        if key not in target or target[key] != value:
            target[key] = value
            modified = True
    return target if modified else None


def load_manifest(manifest_path: Path) -> set[str]:
    """Load the set of Pilot-managed filenames from manifest."""
    if not manifest_path.exists():
        return set()
    try:
        data = json.loads(manifest_path.read_text())
        return set(data.get("files", []))
    except (json.JSONDecodeError, OSError, IOError):
        return set()


def save_manifest(manifest_path: Path, files: set[str]) -> None:
    """Save the set of Pilot-managed filenames to manifest."""
    try:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps({"files": sorted(files)}, indent=2) + "\n")
    except (OSError, IOError):
        pass


def cleanup_managed_files(directory: Path, manifest_path: Path, prefix: str) -> None:
    """Remove only Pilot-managed files from a directory, preserving user files.

    Reads the manifest to know which files Pilot previously installed,
    removes those files (cleaning up stale ones from previous versions),
    and leaves all other files untouched.

    Args:
        directory: The directory to clean (e.g. ~/.claude/commands/)
        manifest_path: Path to .pilot-manifest.json
        prefix: Manifest entry prefix to filter (e.g. "commands/" or "rules/")
    """
    managed = load_manifest(manifest_path)
    if not managed or not directory.exists():
        return

    for entry in managed:
        if not entry.startswith(prefix):
            continue
        relative = entry[len(prefix) :]
        file_path = directory / relative
        if file_path.exists():
            try:
                if file_path.is_dir():
                    shutil.rmtree(file_path)
                else:
                    file_path.unlink()
            except (OSError, IOError):
                pass
