"""Tests for Go file checker."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

from _checkers.go import check_go


class TestCheckGoVetCounting:
    """Verify go vet issue counting excludes header lines."""

    def test_vet_count_excludes_package_header_lines(self, tmp_path: Path) -> None:
        """go vet prefixes output with '# package-name' headers that should not be counted as issues."""
        go_file = tmp_path / "main.go"
        go_file.write_text("package main\n")

        mock_result = MagicMock()
        mock_result.returncode = 2
        mock_result.stdout = ""
        mock_result.stderr = (
            "# command-line-arguments\n"
            "vet: ./main.go:5:6: x declared and not used\n"
        )

        with (
            patch("_checkers.go.strip_go_comments"),
            patch("_checkers.go.check_file_length"),
            patch("_checkers.go.shutil.which", side_effect=lambda name: f"/usr/bin/{name}" if name == "go" else None),
            patch("_checkers.go.subprocess.run", return_value=mock_result),
        ):
            exit_code, reason = check_go(go_file)

        assert exit_code == 2
        assert "1 vet" in reason, f"Expected '1 vet' but got: {reason}"

    def test_vet_count_with_multiple_issues_and_header(self, tmp_path: Path) -> None:
        """Multiple real issues should be counted, header excluded."""
        go_file = tmp_path / "main.go"
        go_file.write_text("package main\n")

        mock_result = MagicMock()
        mock_result.returncode = 2
        mock_result.stdout = ""
        mock_result.stderr = (
            "# command-line-arguments\n"
            "vet: ./main.go:5:6: x declared and not used\n"
            "vet: ./main.go:6:2: y declared and not used\n"
        )

        with (
            patch("_checkers.go.strip_go_comments"),
            patch("_checkers.go.check_file_length"),
            patch("_checkers.go.shutil.which", side_effect=lambda name: f"/usr/bin/{name}" if name == "go" else None),
            patch("_checkers.go.subprocess.run", return_value=mock_result),
        ):
            exit_code, reason = check_go(go_file)

        assert exit_code == 2
        assert "2 vet" in reason, f"Expected '2 vet' but got: {reason}"

    def test_vet_header_only_output_means_no_issues(self, tmp_path: Path) -> None:
        """If go vet returns only a header line with no actual issues, treat as clean."""
        go_file = tmp_path / "main.go"
        go_file.write_text("package main\n")

        mock_vet = MagicMock()
        mock_vet.returncode = 1
        mock_vet.stdout = ""
        mock_vet.stderr = "# command-line-arguments\n"

        with (
            patch("_checkers.go.strip_go_comments"),
            patch("_checkers.go.check_file_length"),
            patch("_checkers.go.shutil.which", side_effect=lambda name: f"/usr/bin/{name}" if name == "go" else None),
            patch("_checkers.go.subprocess.run", return_value=mock_vet),
        ):
            _, reason = check_go(go_file)

        assert reason == "", f"Expected no issues but got: {reason}"


class TestCheckGoTestFileSkip:
    """Test files should skip validation."""

    def test_test_files_skip_checks(self, tmp_path: Path) -> None:
        """Files ending in _test.go should return early."""
        go_file = tmp_path / "main_test.go"
        go_file.write_text("package main\n")

        with patch("_checkers.go.strip_go_comments"):
            exit_code, reason = check_go(go_file)

        assert exit_code == 0
        assert reason == ""


class TestCheckGoCleanFile:
    """Clean files should pass."""

    def test_clean_file_returns_success(self, tmp_path: Path) -> None:
        """Clean Go file should return exit 2 with empty reason."""
        go_file = tmp_path / "main.go"
        go_file.write_text("package main\n")

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = ""
        mock_result.stderr = ""

        with (
            patch("_checkers.go.strip_go_comments"),
            patch("_checkers.go.check_file_length"),
            patch("_checkers.go.shutil.which", side_effect=lambda name: f"/usr/bin/{name}" if name == "go" else None),
            patch("_checkers.go.subprocess.run", return_value=mock_result),
        ):
            exit_code, reason = check_go(go_file)

        assert exit_code == 2
        assert reason == ""
