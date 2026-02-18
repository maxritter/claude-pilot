#!/usr/bin/env python3
"""TDD enforcer - reminds to use TDD when modifying implementation code.

This is a PostToolUse hook — edits always complete, then a structured JSON
reminder is shown to Claude via decision:block to encourage TDD practices.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _util import post_tool_use_block

EXCLUDED_EXTENSIONS = [
    ".md",
    ".rst",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".lock",
    ".sum",
    ".env",
    ".env.example",
    ".sql",
]

EXCLUDED_DIRS = [
    "/cdk/",
    "/infra/",
    "/infrastructure/",
    "/terraform/",
    "/pulumi/",
    "/stacks/",
    "/cloudformation/",
    "/aws/",
    "/deploy/",
    "/migrations/",
    "/alembic/",
    "/generated/",
    "/proto/",
    "/__generated__/",
    "/dist/",
    "/build/",
    "/node_modules/",
    "/.venv/",
    "/venv/",
    "/__pycache__/",
]


def should_skip(file_path: str) -> bool:
    """Check if file should be skipped based on extension or directory."""
    path = Path(file_path)

    if path.suffix in EXCLUDED_EXTENSIONS:
        return True

    if path.name in EXCLUDED_EXTENSIONS:
        return True

    for excluded_dir in EXCLUDED_DIRS:
        if excluded_dir in file_path:
            return True

    return False


def is_test_file(file_path: str) -> bool:
    """Check if file is a test file."""
    path = Path(file_path)
    name = path.name

    if name.endswith(".py"):
        stem = path.stem
        if stem.startswith("test_") or stem.endswith("_test"):
            return True

    if name.endswith((".test.ts", ".spec.ts", ".test.tsx", ".spec.tsx")):
        return True

    if name.endswith("_test.go"):
        return True

    return False


def has_related_failing_test(project_dir: str, impl_file: str) -> bool:
    """Check if there's a failing test specifically for this module.

    Looks for test files matching the implementation file name in the
    pytest lastfailed cache. Only returns True if there's a failing test
    that appears to be for the module being edited.
    """
    cache_file = Path(project_dir) / ".pytest_cache" / "v" / "cache" / "lastfailed"

    if not cache_file.exists():
        return False

    impl_path = Path(impl_file)
    module_name = impl_path.stem

    try:
        with cache_file.open() as f:
            lastfailed = json.load(f)

        if not lastfailed:
            return False

        for test_path in lastfailed:
            test_file = test_path.split("::")[0]
            test_name = Path(test_file).stem

            if test_name == f"test_{module_name}" or test_name == f"{module_name}_test":
                return True

        return False
    except (json.JSONDecodeError, OSError):
        return False


def _find_test_dirs(start: Path) -> list[Path]:
    """Walk up from start to find common test directories."""
    dirs: list[Path] = []
    current = start
    for _ in range(15):
        for name in ("tests", "test", "__tests__"):
            candidate = current / name
            if candidate.is_dir():
                dirs.append(candidate)
        if current.parent == current:
            break
        current = current.parent
    return dirs


def _search_test_dirs(test_dirs: list[Path], base_name: str, extensions: list[str]) -> bool:
    """Search test directories for files matching base_name with any of the given extensions."""
    patterns = [f"**/{base_name}{ext}" for ext in extensions]
    for test_dir in test_dirs:
        for pattern in patterns:
            if list(test_dir.glob(pattern)):
                return True
    return False


def _search_test_dirs_prefix(test_dirs: list[Path], prefix: str, extensions: list[str]) -> bool:
    """Search test directories for files whose name starts with prefix (e.g. 'vault' matches 'vault-view.test.ts')."""
    for test_dir in test_dirs:
        for ext in extensions:
            if list(test_dir.glob(f"**/{prefix}{ext}")) or list(test_dir.glob(f"**/{prefix}-*{ext}")):
                return True
    return False


def has_python_test_file(impl_path: str) -> bool:
    """Check if corresponding Python test file exists (sibling or in test dirs)."""
    path = Path(impl_path)
    module_name = path.stem

    sibling_names = [f"test_{module_name}.py", f"{module_name}_test.py"]
    for name in sibling_names:
        if (path.parent / name).exists():
            return True

    test_dirs = _find_test_dirs(path.parent)
    return _search_test_dirs(test_dirs, "", [f"test_{module_name}.py", f"{module_name}_test.py"])


def _pascal_to_kebab(name: str) -> str:
    """Convert PascalCase/camelCase to kebab-case."""
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name)
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1-\2", s)
    return s.lower()


def has_typescript_test_file(impl_path: str) -> bool:
    """Check if corresponding TypeScript test file exists (sibling or in test dirs)."""
    path = Path(impl_path)

    if path.name.endswith(".tsx"):
        base_name = path.name[:-4]
        extensions = [".test.tsx", ".spec.tsx", ".test.ts", ".spec.ts"]
    elif path.name.endswith(".ts"):
        base_name = path.name[:-3]
        extensions = [".test.ts", ".spec.ts"]
    else:
        return False

    kebab_name = _pascal_to_kebab(base_name)
    names = [base_name] if kebab_name == base_name else [base_name, kebab_name]

    for name in names:
        for ext in extensions:
            if (path.parent / f"{name}{ext}").exists():
                return True

    test_dirs = _find_test_dirs(path.parent)
    for name in names:
        if _search_test_dirs(test_dirs, name, extensions):
            return True

    parent_kebab = _pascal_to_kebab(path.parent.name)
    if parent_kebab and parent_kebab not in (n.lower() for n in names):
        if _search_test_dirs_prefix(test_dirs, parent_kebab, extensions):
            return True

    return False


def has_go_test_file(impl_path: str) -> bool:
    """Check if corresponding Go test file exists (sibling or in test dirs)."""
    path = Path(impl_path)

    if not path.name.endswith(".go"):
        return False

    base_name = path.stem

    if (path.parent / f"{base_name}_test.go").exists():
        return True

    test_dirs = _find_test_dirs(path.parent)
    return _search_test_dirs(test_dirs, base_name, ["_test.go"])


def _is_import_line(line: str) -> bool:
    """Check if a line is part of an import statement."""
    if line.startswith(("import ", "from ")):
        return True
    if line in (")", "("):
        return True
    if re.match(r"^[A-Za-z_][A-Za-z_0-9]*,?$", line):
        return True
    return False


def _is_subsequence(shorter: list[str], longer: list[str]) -> bool:
    """Check if shorter is an ordered subsequence of longer."""
    it = iter(longer)
    return all(line in it for line in shorter)


def is_trivial_edit(tool_name: str, tool_input: dict) -> bool:
    """Check if an Edit is trivial (imports, constants, removals) and doesn't need a failing test."""
    if tool_name != "Edit":
        return False

    old_string = tool_input.get("old_string", "")
    new_string = tool_input.get("new_string", "")

    if not old_string or not new_string:
        return False

    old_lines = [line.strip() for line in old_string.strip().splitlines() if line.strip()]
    new_lines = [line.strip() for line in new_string.strip().splitlines() if line.strip()]

    if not old_lines and not new_lines:
        return False

    all_lines = old_lines + new_lines
    if all_lines and all(_is_import_line(line) for line in all_lines):
        return True

    if new_lines and len(new_lines) < len(old_lines) and _is_subsequence(new_lines, old_lines):
        return True

    added = [line for line in new_lines if line not in old_lines]
    removed = [line for line in old_lines if line not in new_lines]
    if added and not removed and all(re.match(r"^[A-Z][A-Z_0-9]*\s*=\s*", line) for line in added):
        return True

    return False


def warn(message: str, suggestion: str) -> int:
    """Output JSON block decision to stdout and return 0."""
    reason = f"TDD Reminder: {message}\n    {suggestion}"
    print(post_tool_use_block(reason))
    return 0


def run_tdd_enforcer() -> int:
    """Run TDD enforcement and return exit code."""
    try:
        hook_data = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError):
        return 0

    tool_name = hook_data.get("tool_name", "")
    if tool_name not in ("Write", "Edit"):
        return 0

    tool_input = hook_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")
    if not file_path:
        return 0

    if should_skip(file_path):
        return 0

    if is_test_file(file_path):
        return 0

    if is_trivial_edit(tool_name, tool_input):
        return 0

    if file_path.endswith(".py"):
        path = Path(file_path).parent
        found_failing = False

        for _ in range(10):
            if has_related_failing_test(str(path), file_path):
                found_failing = True
                break
            if path.parent == path:
                break
            path = path.parent

        if found_failing:
            return 0

        if has_python_test_file(file_path):
            return 0

        module_name = Path(file_path).stem
        return warn(
            f"No test file found for '{module_name}' module",
            f"Consider creating test_{module_name}.py first.",
        )

    if file_path.endswith((".ts", ".tsx")):
        if has_typescript_test_file(file_path):
            return 0

        base_name = Path(file_path).stem
        return warn(
            "No test file found for this module",
            f"Consider creating {base_name}.test.ts first.",
        )

    if file_path.endswith(".go"):
        if has_go_test_file(file_path):
            return 0

        base_name = Path(file_path).stem
        return warn(
            "No test file found",
            f"Consider creating {base_name}_test.go first.",
        )

    return 0


if __name__ == "__main__":
    sys.exit(run_tdd_enforcer())
