"""Go file checker — comment stripping, gofmt, go vet, golangci-lint."""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

from _util import (
    GREEN,
    NC,
    RED,
    YELLOW,
    check_file_length,
)


def strip_go_comments(file_path: Path) -> bool:
    """Remove inline // comments from Go file."""
    preserve_patterns = re.compile(r"//\s*nolint|//\s*TODO|//\s*FIXME|//\s*XXX|//\s*NOTE|//\s*go:", re.IGNORECASE)

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


def check_go(file_path: Path) -> tuple[int, str]:
    """Check Go file with gofmt, go vet, and golangci-lint. Returns (exit_code, reason)."""
    strip_go_comments(file_path)

    if file_path.name.endswith("_test.go"):
        return 0, ""

    check_file_length(file_path)

    go_bin = shutil.which("go")
    gofmt_bin = shutil.which("gofmt")
    golangci_lint_bin = shutil.which("golangci-lint")

    if not go_bin:
        return 0, ""

    if gofmt_bin:
        try:
            subprocess.run([gofmt_bin, "-w", str(file_path)], capture_output=True, check=False)
        except Exception:
            pass

    results: dict[str, tuple] = {}
    has_issues = False

    try:
        result = subprocess.run([go_bin, "vet", str(file_path)], capture_output=True, text=True, check=False)
        output = result.stdout + result.stderr
        if result.returncode != 0 or output.strip():
            lines = [line.strip() for line in output.splitlines() if line.strip() and not line.strip().startswith("#")]
            if lines:
                has_issues = True
                results["vet"] = (len(lines), lines)
    except Exception:
        pass

    if golangci_lint_bin:
        try:
            result = subprocess.run(
                [golangci_lint_bin, "run", "--fast", str(file_path)], capture_output=True, text=True, check=False
            )
            output = result.stdout + result.stderr
            if result.returncode != 0:
                lines = [line.strip() for line in output.splitlines() if line.strip()]
                issue_count = len([line for line in lines if ": " in line])
                if issue_count > 0:
                    has_issues = True
                    results["lint"] = (issue_count, lines)
        except Exception:
            pass

    if has_issues:
        _print_go_issues(file_path, results)
        parts = []
        for tool_name, (count, _) in results.items():
            parts.append(f"{count} {tool_name}")
        reason = f"Go: {', '.join(parts)} in {file_path.name}"
        return 2, reason

    print("", file=sys.stderr)
    if not golangci_lint_bin:
        print(f"{YELLOW}⚠️  Missing: golangci-lint (install for full linting){NC}", file=sys.stderr)
    print(f"{GREEN}✅ Go: All checks passed{NC}", file=sys.stderr)
    return 2, ""


def _print_go_issues(file_path: Path, results: dict[str, tuple]) -> None:
    """Print Go diagnostic issues to stderr."""
    print("", file=sys.stderr)
    try:
        display_path = file_path.relative_to(Path.cwd())
    except ValueError:
        display_path = file_path
    print(f"{RED}🛑 Go Issues found in: {display_path}{NC}", file=sys.stderr)

    if "vet" in results:
        count, lines = results["vet"]
        plural = "issue" if count == 1 else "issues"
        print("", file=sys.stderr)
        print(f"🔍 go vet: {count} {plural}", file=sys.stderr)
        print("───────────────────────────────────────", file=sys.stderr)
        for line in lines[:10]:
            print(f"  {line}", file=sys.stderr)
        if count > 10:
            print(f"  ... and {count - 10} more issues", file=sys.stderr)
        print("", file=sys.stderr)

    if "lint" in results:
        count, lines = results["lint"]
        plural = "issue" if count == 1 else "issues"
        print("", file=sys.stderr)
        print(f"🔧 golangci-lint: {count} {plural}", file=sys.stderr)
        print("───────────────────────────────────────", file=sys.stderr)
        for line in lines[:10]:
            print(f"  {line}", file=sys.stderr)
        if len(lines) > 10:
            print(f"  ... and {len(lines) - 10} more lines", file=sys.stderr)
        print("", file=sys.stderr)

    print(f"{RED}Fix Go issues above before continuing{NC}", file=sys.stderr)
