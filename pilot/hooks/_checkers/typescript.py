"""TypeScript/JavaScript file checker — comment stripping, prettier, eslint."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from _util import BLUE, NC, check_file_length

TS_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"}
DEBUG = os.environ.get("HOOK_DEBUG", "").lower() == "true"


def debug_log(message: str) -> None:
    """Print debug message if enabled."""
    if DEBUG:
        print(f"{BLUE}[DEBUG]{NC} {message}", file=sys.stderr)


def strip_typescript_comments(file_path: Path) -> bool:
    """Remove inline // comments from TypeScript/JavaScript file."""
    preserve_patterns = re.compile(
        r"//\s*@ts-|//\s*eslint-|//\s*prettier-|//\s*TODO|//\s*FIXME|//\s*XXX|//\s*NOTE|//\s*@type|//\s*@param|//\s*@returns",
        re.IGNORECASE,
    )

    try:
        content = file_path.read_text()
        lines = content.splitlines(keepends=True)
    except Exception:
        return False

    new_lines = []
    modified = False

    for line in lines:
        if "//" not in line or '"//' in line or "'//" in line or "`//" in line or "://" in line:
            new_lines.append(line)
            continue

        match = re.search(r"//.*$", line)
        if not match or preserve_patterns.search(match.group(0)):
            new_lines.append(line)
            continue

        before_comment = line[: match.start()].rstrip()
        if before_comment:
            new_lines.append(before_comment + "\n")
            modified = True
        else:
            modified = True

    if modified:
        file_path.write_text("".join(new_lines))
        return True
    return False


def find_project_root(file_path: Path) -> Path | None:
    """Find nearest directory with package.json."""
    current = file_path.parent
    depth = 0
    while current != current.parent:
        if (current / "package.json").exists():
            return current
        current = current.parent
        depth += 1
        if depth > 20:
            break
    return None


def find_tool(tool_name: str, project_root: Path | None) -> str | None:
    """Find tool binary, preferring local node_modules."""
    if project_root:
        local_bin = project_root / "node_modules" / ".bin" / tool_name
        if local_bin.exists():
            return str(local_bin)
    return shutil.which(tool_name)


def check_typescript(file_path: Path) -> tuple[int, str]:
    """Check TypeScript file with prettier and eslint. Returns (0, reason)."""
    strip_typescript_comments(file_path)

    if ".test." in file_path.name or ".spec." in file_path.name:
        return 0, ""

    length_warning = check_file_length(file_path)

    project_root = find_project_root(file_path)

    prettier_bin = find_tool("prettier", project_root)
    if prettier_bin:
        try:
            subprocess.run(
                [prettier_bin, "--write", str(file_path)], capture_output=True, check=False, cwd=project_root
            )
        except Exception:
            pass

    eslint_bin = find_tool("eslint", project_root)

    if not eslint_bin:
        return 0, length_warning

    results: dict[str, tuple] = {}
    has_issues = False

    if eslint_bin:
        has_issues, results = _run_eslint(eslint_bin, file_path, project_root, has_issues, results)

    if has_issues:
        parts = []
        if "eslint" in results:
            errs, warns, _ = results["eslint"]
            parts.append(f"{errs + warns} eslint")
        reason = f"TypeScript: {', '.join(parts)} in {file_path.name}"
        details = _format_typescript_issues(file_path, results)
        if details:
            reason = f"{reason}\n{details}"
        if length_warning:
            reason = f"{reason}\n{length_warning}"
        return 0, reason

    return 0, length_warning


def _run_eslint(
    eslint_bin: str,
    file_path: Path,
    project_root: Path | None,
    has_issues: bool,
    results: dict[str, tuple],
) -> tuple[bool, dict[str, tuple]]:
    """Run eslint and collect results."""
    try:
        result = subprocess.run(
            [eslint_bin, "--format", "json", str(file_path)],
            capture_output=True,
            text=True,
            check=False,
            cwd=project_root,
        )
        try:
            data = json.loads(result.stdout)
            total_errors = sum(f.get("errorCount", 0) for f in data)
            total_warnings = sum(f.get("warningCount", 0) for f in data)
            if total_errors > 0 or total_warnings > 0:
                has_issues = True
                results["eslint"] = (total_errors, total_warnings, data)
        except json.JSONDecodeError:
            pass
    except Exception:
        pass
    return has_issues, results


def _format_typescript_issues(file_path: Path, results: dict[str, tuple]) -> str:
    """Format TypeScript diagnostic issues as plain text."""
    lines: list[str] = []
    try:
        display_path = file_path.relative_to(Path.cwd())
    except ValueError:
        display_path = file_path
    lines.append(f"TypeScript Issues found in: {display_path}")

    if "eslint" in results:
        total_errors, total_warnings, data = results["eslint"]
        total = total_errors + total_warnings
        plural = "issue" if total == 1 else "issues"
        lines.append(f"ESLint: {total} {plural} ({total_errors} errors, {total_warnings} warnings)")
        for file_result in data:
            file_name = Path(file_result.get("filePath", "")).name
            for msg in file_result.get("messages", [])[:10]:
                line_num = msg.get("line", 0)
                rule_id = msg.get("ruleId", "unknown")
                message = msg.get("message", "")
                severity = "error" if msg.get("severity", 0) == 2 else "warn"
                lines.append(f"  {file_name}:{line_num} [{severity}] {rule_id}: {message}")
            if len(file_result.get("messages", [])) > 10:
                remaining = len(file_result["messages"]) - 10
                lines.append(f"  ... and {remaining} more issues")

    lines.append("Fix TypeScript issues above before continuing")
    return "\n".join(lines)
