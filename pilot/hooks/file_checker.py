"""Unified quality gate — file length + TDD enforcement in a single hook.

Runs both checks and produces one combined blocking output to avoid
duplicate system-reminders from multiple hooks in the same group.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _checkers.go import check_go
from _checkers.python import check_python
from _checkers.typescript import TS_EXTENSIONS, check_typescript
from _util import find_git_root, post_tool_use_block
from tdd_enforcer import (
    has_go_test_file,
    has_python_test_file,
    has_related_failing_test,
    has_typescript_test_file,
    is_test_file,
    is_trivial_edit,
    should_skip,
)


def _tdd_check(tool_name: str, tool_input: dict, file_path: str) -> str:
    """Run TDD enforcement, return warning message or empty string."""
    if should_skip(file_path) or is_test_file(file_path):
        return ""
    if is_trivial_edit(tool_name, tool_input):
        return ""

    if file_path.endswith(".py"):
        path = Path(file_path).parent
        for _ in range(10):
            if has_related_failing_test(str(path), file_path):
                return ""
            if path.parent == path:
                break
            path = path.parent
        if has_python_test_file(file_path):
            return ""
        module_name = Path(file_path).stem
        return f"TDD Reminder: No test file found for '{module_name}' module\n    Consider creating test_{module_name}.py first."

    if file_path.endswith((".ts", ".tsx")):
        if has_typescript_test_file(file_path):
            return ""
        base_name = Path(file_path).stem
        return f"TDD Reminder: No test file found for this module\n    Consider creating {base_name}.test.ts first."

    if file_path.endswith(".go"):
        if has_go_test_file(file_path):
            return ""
        base_name = Path(file_path).stem
        return f"TDD Reminder: No test file found\n    Consider creating {base_name}_test.go first."

    return ""


def main() -> int:
    """Single entry point — file quality + TDD in one pass."""
    try:
        hook_data = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError):
        return 0

    tool_name = hook_data.get("tool_name", "")
    tool_input = hook_data.get("tool_input", {})
    file_path_str = tool_input.get("file_path", "")
    if not file_path_str:
        return 0

    target_file = Path(file_path_str)
    if not target_file.exists():
        return 0

    git_root = find_git_root()
    if git_root:
        os.chdir(git_root)

    file_reason = ""
    if target_file.suffix == ".py":
        _, file_reason = check_python(target_file)
    elif target_file.suffix in TS_EXTENSIONS:
        _, file_reason = check_typescript(target_file)
    elif target_file.suffix == ".go":
        _, file_reason = check_go(target_file)

    tdd_reason = _tdd_check(tool_name, tool_input, file_path_str)

    reasons = [r for r in (file_reason, tdd_reason) if r]
    if reasons:
        print(post_tool_use_block("\n".join(reasons)))

    return 0


if __name__ == "__main__":
    sys.exit(main())
