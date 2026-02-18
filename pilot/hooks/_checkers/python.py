"""Python file checker — comment stripping, ruff."""

from __future__ import annotations

import io
import re
import shutil
import subprocess
import tokenize
from pathlib import Path

from _util import check_file_length


def strip_python_comments(file_path: Path) -> bool:
    """Remove inline comments from Python file using tokenizer."""
    try:
        content = file_path.read_text()
    except Exception:
        return False

    preserve_patterns = [
        r"#!",
        r"#\s*type:",
        r"#\s*noqa",
        r"#\s*pragma:",
        r"#\s*pylint:",
        r"#\s*pyright:",
        r"#\s*ruff:",
        r"#\s*fmt:",
        r"#\s*TODO",
        r"#\s*FIXME",
        r"#\s*XXX",
        r"#\s*NOTE",
    ]
    preserve_re = re.compile("|".join(preserve_patterns), re.IGNORECASE)

    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(content).readline))
    except tokenize.TokenError:
        return False

    lines = content.splitlines(keepends=True)
    comments_to_remove: list[tuple[int, int, int]] = []

    for tok in tokens:
        if tok.type == tokenize.COMMENT:
            if preserve_re.search(tok.string):
                continue
            start_row, start_col = tok.start
            _, end_col = tok.end
            comments_to_remove.append((start_row, start_col, end_col))

    if not comments_to_remove:
        return False

    new_lines = list(lines)
    lines_to_delete: set[int] = set()

    for line_num, start_col, _ in reversed(comments_to_remove):
        idx = line_num - 1
        if idx >= len(new_lines):
            continue
        line = new_lines[idx]
        before_comment = line[:start_col].rstrip()
        if before_comment:
            new_lines[idx] = before_comment + "\n"
        else:
            lines_to_delete.add(idx)

    for idx in sorted(lines_to_delete, reverse=True):
        del new_lines[idx]

    new_content = "".join(new_lines)
    if new_content != content:
        file_path.write_text(new_content)
        return True
    return False


def check_python(file_path: Path) -> tuple[int, str]:
    """Check Python file with ruff. Returns (0, reason)."""
    strip_python_comments(file_path)

    if "test_" in file_path.name or "spec" in file_path.name:
        return 0, ""

    length_warning = check_file_length(file_path)

    ruff_bin = shutil.which("ruff")
    if ruff_bin:
        try:
            subprocess.run(
                [ruff_bin, "check", "--select", "I,RUF022", "--fix", str(file_path)], capture_output=True, check=False
            )
            subprocess.run([ruff_bin, "format", str(file_path)], capture_output=True, check=False)
        except Exception:
            pass

    if not ruff_bin:
        return 0, length_warning

    results: dict[str, tuple] = {}
    has_issues = False

    try:
        result = subprocess.run(
            [ruff_bin, "check", "--output-format=concise", str(file_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        output = result.stdout + result.stderr
        error_pattern = re.compile(r":\d+:\d+: [A-Z]{1,3}\d+")
        error_lines = [line for line in output.splitlines() if error_pattern.search(line)]
        if error_lines:
            has_issues = True
            results["ruff"] = (len(error_lines), error_lines)
    except Exception:
        pass

    if has_issues:
        parts = []
        for tool_name, (count, _) in results.items():
            parts.append(f"{count} {tool_name}")
        reason = f"Python: {', '.join(parts)} in {file_path.name}"
        details = _format_python_issues(file_path, results)
        if details:
            reason = f"{reason}\n{details}"
        if length_warning:
            reason = f"{reason}\n{length_warning}"
        return 0, reason

    return 0, length_warning


def _format_python_issues(file_path: Path, results: dict[str, tuple]) -> str:
    """Format Python diagnostic issues as plain text."""
    lines: list[str] = []
    try:
        display_path = file_path.relative_to(Path.cwd())
    except ValueError:
        display_path = file_path
    lines.append(f"Python Issues found in: {display_path}")

    if "ruff" in results:
        count, error_lines = results["ruff"]
        plural = "issue" if count == 1 else "issues"
        lines.append(f"Ruff: {count} {plural}")
        for line in error_lines:
            parts = line.split(None, 1)
            if parts:
                code = parts[0]
                msg = parts[1] if len(parts) > 1 else ""
                msg = msg.replace("[*] ", "")
                lines.append(f"  {code}: {msg}")

    lines.append("Fix Python issues above before continuing")
    return "\n".join(lines)
