"""Tests for Python file checker."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from _checkers.python import check_python, strip_python_comments


class TestStripPythonComments:
    """Comment stripping preserves directives and removes regular comments."""

    def test_strips_inline_comment(self, tmp_path: Path) -> None:
        """Regular inline comments are removed."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1  # set x\n")

        result = strip_python_comments(py_file)

        assert result is True
        assert py_file.read_text() == "x = 1\n"

    def test_strips_full_line_comment(self, tmp_path: Path) -> None:
        """Full-line comments are deleted entirely."""
        py_file = tmp_path / "app.py"
        py_file.write_text("# this is a comment\nx = 1\n")

        result = strip_python_comments(py_file)

        assert result is True
        assert py_file.read_text() == "x = 1\n"

    def test_preserves_type_comments(self, tmp_path: Path) -> None:
        """Type hints in comments are preserved."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1  # type: ignore\n")

        result = strip_python_comments(py_file)

        assert result is False
        assert "# type: ignore" in py_file.read_text()

    def test_preserves_noqa(self, tmp_path: Path) -> None:
        """noqa directives are preserved."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1  # noqa: E501\n")

        result = strip_python_comments(py_file)

        assert result is False

    def test_preserves_todo(self, tmp_path: Path) -> None:
        """TODO comments are preserved."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1  # TODO: fix this\n")

        result = strip_python_comments(py_file)

        assert result is False

    def test_preserves_shebang(self, tmp_path: Path) -> None:
        """Shebang lines are preserved."""
        py_file = tmp_path / "app.py"
        py_file.write_text("#!/usr/bin/env python\nx = 1\n")

        result = strip_python_comments(py_file)

        assert result is False
        assert "#!/usr/bin/env python" in py_file.read_text()

    def test_preserves_pyright_directive(self, tmp_path: Path) -> None:
        """Pyright directives are preserved."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1  # pyright: ignore\n")

        result = strip_python_comments(py_file)

        assert result is False

    def test_preserves_ruff_directive(self, tmp_path: Path) -> None:
        """Ruff directives are preserved."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1  # ruff: noqa\n")

        result = strip_python_comments(py_file)

        assert result is False

    def test_no_comments_returns_false(self, tmp_path: Path) -> None:
        """Files without comments return False (no modification)."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1\n")

        result = strip_python_comments(py_file)

        assert result is False

    def test_nonexistent_file_returns_false(self, tmp_path: Path) -> None:
        """Nonexistent file returns False."""
        py_file = tmp_path / "missing.py"

        result = strip_python_comments(py_file)

        assert result is False


class TestCheckPythonTestFileSkip:
    """Test files should skip validation."""

    def test_test_prefix_files_skip_checks(self, tmp_path: Path) -> None:
        """Files with test_ in name skip checks."""
        py_file = tmp_path / "test_app.py"
        py_file.write_text("x = undefined\n")

        with patch("_checkers.python.strip_python_comments"):
            exit_code, reason = check_python(py_file)

        assert exit_code == 0
        assert reason == ""

    def test_spec_files_skip_checks(self, tmp_path: Path) -> None:
        """Files with spec in name skip checks."""
        py_file = tmp_path / "app_spec.py"
        py_file.write_text("x = undefined\n")

        with patch("_checkers.python.strip_python_comments"):
            exit_code, reason = check_python(py_file)

        assert exit_code == 0
        assert reason == ""


class TestCheckPythonNoTools:
    """When no tools are available, skip gracefully."""

    def test_no_tools_returns_zero(self, tmp_path: Path) -> None:
        """No ruff or basedpyright installed returns 0."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1\n")

        with (
            patch("_checkers.python.strip_python_comments"),
            patch("_checkers.python.check_file_length"),
            patch("_checkers.python.shutil.which", return_value=None),
        ):
            exit_code, reason = check_python(py_file)

        assert exit_code == 0
        assert reason == ""


class TestCheckPythonRuffIssues:
    """Ruff issue detection and counting."""

    def test_ruff_errors_reported_in_reason(self, tmp_path: Path) -> None:
        """Ruff errors are counted and reported."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1\n")

        mock_format = MagicMock(returncode=0, stdout="", stderr="")
        mock_fix = MagicMock(returncode=0, stdout="", stderr="")
        mock_check = MagicMock(
            returncode=1,
            stdout="app.py:1:1: F401 unused import\napp.py:2:1: E302 expected 2 blank lines\n",
            stderr="",
        )

        def run_side_effect(cmd, **kwargs):
            if "format" in cmd:
                return mock_format
            if "--select" in cmd:
                return mock_fix
            return mock_check

        def which_side_effect(name):
            if name == "ruff":
                return "/usr/bin/ruff"
            return None

        with (
            patch("_checkers.python.strip_python_comments"),
            patch("_checkers.python.check_file_length"),
            patch("_checkers.python.shutil.which", side_effect=which_side_effect),
            patch("_checkers.python.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_python(py_file)

        assert exit_code == 2
        assert "2 ruff" in reason

    def test_ruff_clean_output_no_issues(self, tmp_path: Path) -> None:
        """Ruff with no errors means clean."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1\n")

        mock_result = MagicMock(returncode=0, stdout="", stderr="")

        def which_side_effect(name):
            if name == "ruff":
                return "/usr/bin/ruff"
            return None

        with (
            patch("_checkers.python.strip_python_comments"),
            patch("_checkers.python.check_file_length"),
            patch("_checkers.python.shutil.which", side_effect=which_side_effect),
            patch("_checkers.python.subprocess.run", return_value=mock_result),
        ):
            exit_code, reason = check_python(py_file)

        assert exit_code == 2
        assert reason == ""


class TestCheckPythonBasedpyrightIssues:
    """Basedpyright issue detection and counting."""

    def test_type_errors_reported_in_reason(self, tmp_path: Path) -> None:
        """Basedpyright type errors are counted."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1\n")

        pyright_output = json.dumps({
            "summary": {"errorCount": 2},
            "generalDiagnostics": [
                {"file": "app.py", "range": {"start": {"line": 1}}, "message": "error one"},
                {"file": "app.py", "range": {"start": {"line": 5}}, "message": "error two"},
            ],
        })

        mock_ruff = MagicMock(returncode=0, stdout="", stderr="")
        mock_pyright = MagicMock(returncode=1, stdout=pyright_output, stderr="")

        def run_side_effect(cmd, **kwargs):
            if "basedpyright" in cmd[0]:
                return mock_pyright
            return mock_ruff

        def which_side_effect(name):
            return f"/usr/bin/{name}" if name in ("ruff", "basedpyright") else None

        with (
            patch("_checkers.python.strip_python_comments"),
            patch("_checkers.python.check_file_length"),
            patch("_checkers.python.shutil.which", side_effect=which_side_effect),
            patch("_checkers.python.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_python(py_file)

        assert exit_code == 2
        assert "2 basedpyright" in reason

    def test_zero_errors_means_clean(self, tmp_path: Path) -> None:
        """Basedpyright with 0 errors is clean."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1\n")

        pyright_output = json.dumps({"summary": {"errorCount": 0}, "generalDiagnostics": []})
        mock_ruff = MagicMock(returncode=0, stdout="", stderr="")
        mock_pyright = MagicMock(returncode=0, stdout=pyright_output, stderr="")

        def run_side_effect(cmd, **kwargs):
            if "basedpyright" in cmd[0]:
                return mock_pyright
            return mock_ruff

        def which_side_effect(name):
            return f"/usr/bin/{name}" if name in ("ruff", "basedpyright") else None

        with (
            patch("_checkers.python.strip_python_comments"),
            patch("_checkers.python.check_file_length"),
            patch("_checkers.python.shutil.which", side_effect=which_side_effect),
            patch("_checkers.python.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_python(py_file)

        assert exit_code == 2
        assert reason == ""


class TestCheckPythonCombinedIssues:
    """Both ruff and basedpyright issues at once."""

    def test_both_tools_report_issues(self, tmp_path: Path) -> None:
        """Combined issues from ruff and basedpyright are reported."""
        py_file = tmp_path / "app.py"
        py_file.write_text("x = 1\n")

        pyright_output = json.dumps({
            "summary": {"errorCount": 1},
            "generalDiagnostics": [
                {"file": "app.py", "range": {"start": {"line": 1}}, "message": "type error"},
            ],
        })

        mock_format = MagicMock(returncode=0, stdout="", stderr="")
        mock_fix = MagicMock(returncode=0, stdout="", stderr="")
        mock_check = MagicMock(
            returncode=1,
            stdout="app.py:1:1: F401 unused import\n",
            stderr="",
        )
        mock_pyright = MagicMock(returncode=1, stdout=pyright_output, stderr="")

        call_count = 0

        def run_side_effect(cmd, **kwargs):
            nonlocal call_count
            if "basedpyright" in cmd[0]:
                return mock_pyright
            call_count += 1
            if call_count <= 2:
                return mock_fix if "--select" in cmd else mock_format
            return mock_check

        def which_side_effect(name):
            return f"/usr/bin/{name}" if name in ("ruff", "basedpyright") else None

        with (
            patch("_checkers.python.strip_python_comments"),
            patch("_checkers.python.check_file_length"),
            patch("_checkers.python.shutil.which", side_effect=which_side_effect),
            patch("_checkers.python.subprocess.run", side_effect=run_side_effect),
        ):
            exit_code, reason = check_python(py_file)

        assert exit_code == 2
        assert "ruff" in reason
        assert "basedpyright" in reason
