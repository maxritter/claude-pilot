"""Tests for TypeScript/JavaScript file checker."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from _checkers.typescript import (
    TS_EXTENSIONS,
    check_typescript,
    find_project_root,
    find_tool,
    strip_typescript_comments,
)


class TestTsExtensions:
    """Verify supported file extensions."""

    def test_includes_standard_extensions(self) -> None:
        """All common TS/JS extensions are supported."""
        for ext in (".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"):
            assert ext in TS_EXTENSIONS


class TestStripTypescriptComments:
    """Comment stripping preserves directives and removes regular comments."""

    def test_strips_inline_comment(self, tmp_path: Path) -> None:
        """Regular inline comments are removed."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1; // set x\n")

        result = strip_typescript_comments(ts_file)

        assert result is True
        assert ts_file.read_text() == "const x = 1;\n"

    def test_strips_full_line_comment(self, tmp_path: Path) -> None:
        """Full-line comments are deleted entirely."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("// this is a comment\nconst x = 1;\n")

        result = strip_typescript_comments(ts_file)

        assert result is True
        assert ts_file.read_text() == "const x = 1;\n"

    def test_preserves_ts_directives(self, tmp_path: Path) -> None:
        """TypeScript directives like @ts-ignore are preserved."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("// @ts-ignore\nconst x = 1;\n")

        result = strip_typescript_comments(ts_file)

        assert result is False

    def test_preserves_eslint_directives(self, tmp_path: Path) -> None:
        """ESLint directives are preserved."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("// eslint-disable-next-line\nconst x = 1;\n")

        result = strip_typescript_comments(ts_file)

        assert result is False

    def test_preserves_prettier_directives(self, tmp_path: Path) -> None:
        """Prettier directives are preserved."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("// prettier-ignore\nconst x = 1;\n")

        result = strip_typescript_comments(ts_file)

        assert result is False

    def test_preserves_todo(self, tmp_path: Path) -> None:
        """TODO comments are preserved."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1; // TODO: fix this\n")

        result = strip_typescript_comments(ts_file)

        assert result is False

    def test_preserves_jsdoc_type_annotations(self, tmp_path: Path) -> None:
        """JSDoc type annotations are preserved."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("// @type {string}\nconst x = 'hi';\n")

        result = strip_typescript_comments(ts_file)

        assert result is False

    def test_preserves_url_in_string(self, tmp_path: Path) -> None:
        """URLs in strings are not treated as comments."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text('const url = "https://example.com";\n')

        result = strip_typescript_comments(ts_file)

        assert result is False
        assert "https://example.com" in ts_file.read_text()

    def test_no_comments_returns_false(self, tmp_path: Path) -> None:
        """Files without comments return False."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1;\n")

        result = strip_typescript_comments(ts_file)

        assert result is False

    def test_nonexistent_file_returns_false(self, tmp_path: Path) -> None:
        """Nonexistent file returns False."""
        result = strip_typescript_comments(tmp_path / "missing.ts")

        assert result is False


class TestFindProjectRoot:
    """Project root detection via package.json."""

    def test_finds_package_json_in_parent(self, tmp_path: Path) -> None:
        """Finds package.json in parent directory."""
        (tmp_path / "package.json").write_text("{}")
        sub_dir = tmp_path / "src"
        sub_dir.mkdir()
        ts_file = sub_dir / "app.ts"
        ts_file.write_text("")

        result = find_project_root(ts_file)

        assert result == tmp_path

    def test_returns_none_without_package_json(self, tmp_path: Path) -> None:
        """Returns None when no package.json exists."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("")

        result = find_project_root(ts_file)

        assert result is None


class TestFindTool:
    """Tool binary discovery."""

    def test_prefers_local_node_modules(self, tmp_path: Path) -> None:
        """Local node_modules/.bin is preferred over global."""
        local_bin = tmp_path / "node_modules" / ".bin" / "eslint"
        local_bin.parent.mkdir(parents=True)
        local_bin.write_text("")

        result = find_tool("eslint", tmp_path)

        assert result == str(local_bin)

    def test_falls_back_to_which(self, tmp_path: Path) -> None:
        """Falls back to shutil.which when no local binary."""
        with patch("_checkers.typescript.shutil.which", return_value="/usr/bin/eslint"):
            result = find_tool("eslint", tmp_path)

        assert result == "/usr/bin/eslint"

    def test_returns_none_when_not_found(self, tmp_path: Path) -> None:
        """Returns None when tool is not found anywhere."""
        with patch("_checkers.typescript.shutil.which", return_value=None):
            result = find_tool("eslint", tmp_path)

        assert result is None

    def test_which_fallback_with_no_project_root(self) -> None:
        """Falls back to which when project_root is None."""
        with patch("_checkers.typescript.shutil.which", return_value="/usr/bin/tsc"):
            result = find_tool("tsc", None)

        assert result == "/usr/bin/tsc"


class TestCheckTypescriptTestFileSkip:
    """Test files should skip validation."""

    def test_test_files_skip_checks(self, tmp_path: Path) -> None:
        """Files with .test. in name skip checks."""
        ts_file = tmp_path / "app.test.ts"
        ts_file.write_text("const x: string = 123;\n")

        with patch("_checkers.typescript.strip_typescript_comments"):
            exit_code, reason = check_typescript(ts_file)

        assert exit_code == 0
        assert reason == ""

    def test_spec_files_skip_checks(self, tmp_path: Path) -> None:
        """Files with .spec. in name skip checks."""
        ts_file = tmp_path / "app.spec.tsx"
        ts_file.write_text("const x: string = 123;\n")

        with patch("_checkers.typescript.strip_typescript_comments"):
            exit_code, reason = check_typescript(ts_file)

        assert exit_code == 0
        assert reason == ""


class TestCheckTypescriptNoTools:
    """When no tools are available, skip gracefully."""

    def test_no_tools_returns_zero(self, tmp_path: Path) -> None:
        """No eslint or tsc installed returns 0."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1;\n")

        with (
            patch("_checkers.typescript.strip_typescript_comments"),
            patch("_checkers.typescript.check_file_length"),
            patch("_checkers.typescript.find_project_root", return_value=None),
            patch("_checkers.typescript.find_tool", return_value=None),
        ):
            exit_code, reason = check_typescript(ts_file)

        assert exit_code == 0
        assert reason == ""


class TestCheckTypescriptEslintIssues:
    """ESLint issue detection and counting."""

    def test_eslint_errors_reported_in_reason(self, tmp_path: Path) -> None:
        """ESLint errors and warnings are counted."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1;\n")

        eslint_json = json.dumps([{
            "filePath": str(ts_file),
            "errorCount": 2,
            "warningCount": 1,
            "messages": [
                {"line": 1, "ruleId": "no-unused-vars", "message": "x is unused", "severity": 2},
                {"line": 2, "ruleId": "no-console", "message": "no console", "severity": 2},
                {"line": 3, "ruleId": "semi", "message": "missing semi", "severity": 1},
            ],
        }])

        mock_prettier = MagicMock(returncode=0, stdout="", stderr="")
        mock_eslint = MagicMock(returncode=1, stdout=eslint_json, stderr="")

        def run_side_effect(cmd, **kwargs):
            if "eslint" in cmd[0]:
                return mock_eslint
            return mock_prettier

        with (
            patch("_checkers.typescript.strip_typescript_comments"),
            patch("_checkers.typescript.check_file_length"),
            patch("_checkers.typescript.find_project_root", return_value=None),
            patch("_checkers.typescript.find_tool", side_effect=lambda name, _: f"/usr/bin/{name}" if name in ("prettier", "eslint") else None),
            patch("_checkers.typescript.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_typescript(ts_file)

        assert exit_code == 2
        assert "3 eslint" in reason


class TestCheckTypescriptTscIssues:
    """TypeScript compiler issue detection."""

    def test_tsc_errors_reported_in_reason(self, tmp_path: Path) -> None:
        """tsc type errors are counted."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x: string = 1;\n")

        tsc_output = "app.ts(1,7): error TS2322: Type 'number' is not assignable to type 'string'.\n"

        mock_prettier = MagicMock(returncode=0, stdout="", stderr="")
        mock_tsc = MagicMock(returncode=2, stdout=tsc_output, stderr="")

        def run_side_effect(cmd, **kwargs):
            if "tsc" in cmd[0]:
                return mock_tsc
            return mock_prettier

        with (
            patch("_checkers.typescript.strip_typescript_comments"),
            patch("_checkers.typescript.check_file_length"),
            patch("_checkers.typescript.find_project_root", return_value=None),
            patch("_checkers.typescript.find_tool", side_effect=lambda name, _: f"/usr/bin/{name}" if name in ("prettier", "tsc") else None),
            patch("_checkers.typescript.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_typescript(ts_file)

        assert exit_code == 2
        assert "1 tsc" in reason

    def test_tsc_skipped_for_js_files(self, tmp_path: Path) -> None:
        """tsc is not run for .js files."""
        js_file = tmp_path / "app.js"
        js_file.write_text("const x = 1;\n")

        mock_result = MagicMock(returncode=0, stdout="", stderr="")

        with (
            patch("_checkers.typescript.strip_typescript_comments"),
            patch("_checkers.typescript.check_file_length"),
            patch("_checkers.typescript.find_project_root", return_value=None),
            patch("_checkers.typescript.find_tool", return_value=None),
            patch("_checkers.typescript.subprocess.run", return_value=mock_result),
        ):
            exit_code, reason = check_typescript(js_file)

        assert exit_code == 0
        assert reason == ""


class TestCheckTypescriptCleanFile:
    """Clean files should pass."""

    def test_clean_file_returns_success(self, tmp_path: Path) -> None:
        """Clean TS file returns exit 2 with empty reason."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1;\n")

        eslint_json = json.dumps([{"filePath": str(ts_file), "errorCount": 0, "warningCount": 0, "messages": []}])

        mock_prettier = MagicMock(returncode=0, stdout="", stderr="")
        mock_eslint = MagicMock(returncode=0, stdout=eslint_json, stderr="")
        mock_tsc = MagicMock(returncode=0, stdout="", stderr="")

        def run_side_effect(cmd, **kwargs):
            if "eslint" in cmd[0]:
                return mock_eslint
            if "tsc" in cmd[0]:
                return mock_tsc
            return mock_prettier

        with (
            patch("_checkers.typescript.strip_typescript_comments"),
            patch("_checkers.typescript.check_file_length"),
            patch("_checkers.typescript.find_project_root", return_value=None),
            patch("_checkers.typescript.find_tool", side_effect=lambda name, _: f"/usr/bin/{name}"),
            patch("_checkers.typescript.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_typescript(ts_file)

        assert exit_code == 2
        assert reason == ""


class TestCheckTypescriptCombinedIssues:
    """Both eslint and tsc issues at once."""

    def test_both_tools_report_issues(self, tmp_path: Path) -> None:
        """Combined issues from eslint and tsc are reported."""
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1;\n")

        eslint_json = json.dumps([{
            "filePath": str(ts_file),
            "errorCount": 1,
            "warningCount": 0,
            "messages": [{"line": 1, "ruleId": "no-unused-vars", "message": "unused", "severity": 2}],
        }])
        tsc_output = "app.ts(1,7): error TS2322: Type error\n"

        mock_prettier = MagicMock(returncode=0, stdout="", stderr="")
        mock_eslint = MagicMock(returncode=1, stdout=eslint_json, stderr="")
        mock_tsc = MagicMock(returncode=2, stdout=tsc_output, stderr="")

        def run_side_effect(cmd, **kwargs):
            if "eslint" in cmd[0]:
                return mock_eslint
            if "tsc" in cmd[0]:
                return mock_tsc
            return mock_prettier

        with (
            patch("_checkers.typescript.strip_typescript_comments"),
            patch("_checkers.typescript.check_file_length"),
            patch("_checkers.typescript.find_project_root", return_value=None),
            patch("_checkers.typescript.find_tool", side_effect=lambda name, _: f"/usr/bin/{name}"),
            patch("_checkers.typescript.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_typescript(ts_file)

        assert exit_code == 2
        assert "eslint" in reason
        assert "tsc" in reason


class TestCheckTypescriptTsconfigDetection:
    """tsconfig.json detection for tsc."""

    def test_uses_tsconfig_when_present(self, tmp_path: Path) -> None:
        """tsc uses --project with tsconfig.json when found."""
        (tmp_path / "package.json").write_text("{}")
        (tmp_path / "tsconfig.json").write_text("{}")
        ts_file = tmp_path / "app.ts"
        ts_file.write_text("const x = 1;\n")

        mock_prettier = MagicMock(returncode=0, stdout="", stderr="")
        mock_tsc = MagicMock(returncode=0, stdout="", stderr="")
        eslint_json = json.dumps([{"filePath": str(ts_file), "errorCount": 0, "warningCount": 0, "messages": []}])
        mock_eslint = MagicMock(returncode=0, stdout=eslint_json, stderr="")

        calls = []

        def run_side_effect(cmd, **kwargs):
            calls.append(cmd)
            if "tsc" in cmd[0]:
                return mock_tsc
            if "eslint" in cmd[0]:
                return mock_eslint
            return mock_prettier

        with (
            patch("_checkers.typescript.strip_typescript_comments"),
            patch("_checkers.typescript.check_file_length"),
            patch("_checkers.typescript.find_tool", side_effect=lambda name, _: f"/usr/bin/{name}"),
            patch("_checkers.typescript.subprocess.run", side_effect=run_side_effect),
        ):
            check_typescript(ts_file)

        tsc_calls = [c for c in calls if "tsc" in c[0]]
        assert any("--project" in c for c in tsc_calls)
