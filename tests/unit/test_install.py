"""Unit tests for scripts/install.py."""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, Mock, mock_open, patch

import pytest

# Add scripts directory to path so we can import install
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

# Import the module under test
from install import (
    VERSION,
    bootstrap_download,
    download_lib_modules,
    generate_settings_file,
    install_claude_files,
    remove_python_settings,
)


class TestBootstrapDownload:
    """Test bootstrap_download function."""

    def test_bootstrap_download_in_local_mode_with_existing_file_copies_file(self):
        """Test that bootstrap_download copies file when local_mode is True and file exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            local_repo_dir = tmpdir_path / "repo"
            local_repo_dir.mkdir()
            source_file = local_repo_dir / "scripts" / "lib" / "ui.py"
            source_file.parent.mkdir(parents=True)
            source_file.write_text("# Test content")

            dest_path = tmpdir_path / "dest" / "ui.py"

            result = bootstrap_download("scripts/lib/ui.py", dest_path, True, local_repo_dir)

            assert result is True
            assert dest_path.exists()
            assert dest_path.read_text() == "# Test content"

    def test_bootstrap_download_in_local_mode_with_missing_file_returns_false(self):
        """Test that bootstrap_download returns False when local file doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            local_repo_dir = tmpdir_path / "repo"
            local_repo_dir.mkdir()

            dest_path = tmpdir_path / "dest" / "ui.py"

            result = bootstrap_download("scripts/lib/ui.py", dest_path, True, local_repo_dir)

            assert result is False
            assert not dest_path.exists()

    def test_bootstrap_download_creates_parent_directories(self):
        """Test that bootstrap_download creates parent directories for destination."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            local_repo_dir = tmpdir_path / "repo"
            local_repo_dir.mkdir()
            source_file = local_repo_dir / "scripts" / "lib" / "ui.py"
            source_file.parent.mkdir(parents=True)
            source_file.write_text("content")

            dest_path = tmpdir_path / "nested" / "deep" / "path" / "ui.py"

            result = bootstrap_download("scripts/lib/ui.py", dest_path, True, local_repo_dir)

            assert result is True
            assert dest_path.parent.exists()

    @patch("urllib.request.urlopen")
    def test_bootstrap_download_in_network_mode_downloads_file(self, mock_urlopen):
        """Test that bootstrap_download downloads file when local_mode is False."""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.read.return_value = b"Downloaded content"
        mock_response.__enter__ = Mock(return_value=mock_response)
        mock_response.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_response

        with tempfile.TemporaryDirectory() as tmpdir:
            dest_path = Path(tmpdir) / "ui.py"

            result = bootstrap_download("scripts/lib/ui.py", dest_path, False, None)

            assert result is True
            assert dest_path.read_text() == "Downloaded content"
            expected_url = f"https://github.com/maxritter/claude-codepro/raw/{VERSION}/scripts/lib/ui.py"
            mock_urlopen.assert_called_once_with(expected_url)

    @patch("urllib.request.urlopen")
    def test_bootstrap_download_in_network_mode_with_failed_download_returns_false(self, mock_urlopen):
        """Test that bootstrap_download returns False when network download fails."""
        mock_urlopen.side_effect = Exception("Network error")

        with tempfile.TemporaryDirectory() as tmpdir:
            dest_path = Path(tmpdir) / "ui.py"

            result = bootstrap_download("scripts/lib/ui.py", dest_path, False, None)

            assert result is False
            assert not dest_path.exists()


class TestDownloadLibModules:
    """Test download_lib_modules function."""

    def test_download_lib_modules_creates_lib_directory(self):
        """Test that download_lib_modules creates scripts/lib directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            with patch("install.bootstrap_download", return_value=True):
                download_lib_modules(project_dir, False, None)

            lib_dir = project_dir / "scripts" / "lib"
            assert lib_dir.exists()
            assert lib_dir.is_dir()

    def test_download_lib_modules_overwrites_existing_files_for_upgrades(self):
        """Test that download_lib_modules always downloads files (even if they exist) to support upgrades."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            lib_dir = project_dir / "scripts" / "lib"
            lib_dir.mkdir(parents=True)
            existing_file = lib_dir / "ui.py"
            existing_file.write_text("existing content")

            with patch("install.bootstrap_download", return_value=True) as mock_download:
                download_lib_modules(project_dir, False, None)

                # bootstrap_download SHOULD be called for existing file to enable upgrades
                calls = [call[0][0] for call in mock_download.call_args_list]
                assert "scripts/lib/ui.py" in calls

    def test_download_lib_modules_downloads_all_missing_modules(self):
        """Test that download_lib_modules attempts to download all missing modules."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            with patch("install.bootstrap_download", return_value=True) as mock_download:
                download_lib_modules(project_dir, False, None)

                # Should attempt to download all LIB_MODULES
                assert mock_download.call_count >= 1

    def test_download_lib_modules_prints_warning_on_download_failure(self, capsys):
        """Test that download_lib_modules prints warning when download fails."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            with patch("install.bootstrap_download", return_value=False):
                download_lib_modules(project_dir, False, None)

                captured = capsys.readouterr()
                assert "Warning: Failed to download" in captured.err


class TestGenerateSettingsFile:
    """Test generate_settings_file function."""

    def test_generate_settings_file_with_missing_template_prints_warning(self, capsys):
        """Test that generate_settings_file prints warning when template doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            template_file = tmpdir_path / "template.json"
            settings_file = tmpdir_path / "settings.json"
            project_dir = tmpdir_path

            # Mock the ui module
            sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

            generate_settings_file(template_file, settings_file, project_dir, True)

            captured = capsys.readouterr()
            # Warning is printed to stdout, not stderr
            assert "settings.local.template.json not found" in captured.out

    def test_generate_settings_file_creates_new_file_from_template(self):
        """Test that generate_settings_file creates new settings file from template."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            template_file = tmpdir_path / "template.json"
            settings_file = tmpdir_path / "settings.json"
            project_dir = tmpdir_path / "project"

            template_file.write_text('{"path": "{{PROJECT_DIR}}/data"}')

            generate_settings_file(template_file, settings_file, project_dir, True)

            assert settings_file.exists()
            settings_content = settings_file.read_text()
            assert str(project_dir) in settings_content
            assert "{{PROJECT_DIR}}" not in settings_content

    def test_generate_settings_file_keeps_existing_file_in_non_interactive_mode(self):
        """Test that generate_settings_file keeps existing file when OVERWRITE_SETTINGS is not set."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            template_file = tmpdir_path / "template.json"
            settings_file = tmpdir_path / "settings.json"
            project_dir = tmpdir_path

            template_file.write_text('{"new": "content"}')
            settings_file.write_text('{"old": "content"}')

            with patch.dict(os.environ, {"OVERWRITE_SETTINGS": "N"}):
                generate_settings_file(template_file, settings_file, project_dir, True)

            # Should keep old content
            assert settings_file.read_text() == '{"old": "content"}'

    def test_generate_settings_file_overwrites_existing_file_when_env_var_set(self):
        """Test that generate_settings_file overwrites when OVERWRITE_SETTINGS=Y."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            template_file = tmpdir_path / "template.json"
            settings_file = tmpdir_path / "settings.json"
            project_dir = tmpdir_path / "project"

            template_file.write_text('{"path": "{{PROJECT_DIR}}"}')
            settings_file.write_text('{"old": "content"}')

            with patch.dict(os.environ, {"OVERWRITE_SETTINGS": "Y"}):
                generate_settings_file(template_file, settings_file, project_dir, True)

            # Should have new content with replaced path
            settings_content = settings_file.read_text()
            assert str(project_dir) in settings_content
            assert '{"old": "content"}' not in settings_content


class TestRemovePythonSettings:
    """Test remove_python_settings function."""

    def test_remove_python_settings_with_missing_file_does_nothing(self):
        """Test that remove_python_settings handles missing file gracefully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"

            # Should not raise exception
            remove_python_settings(settings_file)

            assert not settings_file.exists()

    def test_remove_python_settings_removes_python_hook(self):
        """Test that remove_python_settings removes file_checker_python.py hook."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_data = {
                "hooks": {
                    "PostToolUse": [
                        {
                            "hooks": [
                                {"command": "python3 file_checker_python.py"},
                                {"command": "python3 other_hook.py"},
                            ]
                        }
                    ]
                }
            }
            settings_file.write_text(json.dumps(settings_data, indent=2))

            remove_python_settings(settings_file)

            result = json.loads(settings_file.read_text())
            hooks = result["hooks"]["PostToolUse"][0]["hooks"]
            assert len(hooks) == 1
            assert hooks[0]["command"] == "python3 other_hook.py"

    def test_remove_python_settings_removes_python_permissions(self):
        """Test that remove_python_settings removes Python-specific permissions."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_data = {
                "permissions": {
                    "allow": [
                        "Bash(pytest:*)",
                        "Bash(ruff check:*)",
                        "Bash(git:*)",
                        "Bash(npm:*)",
                    ]
                }
            }
            settings_file.write_text(json.dumps(settings_data, indent=2))

            remove_python_settings(settings_file)

            result = json.loads(settings_file.read_text())
            permissions = result["permissions"]["allow"]
            assert "Bash(pytest:*)" not in permissions
            assert "Bash(ruff check:*)" not in permissions
            assert "Bash(git:*)" in permissions
            assert "Bash(npm:*)" in permissions

    def test_remove_python_settings_handles_malformed_json(self, capsys):
        """Test that remove_python_settings handles malformed JSON gracefully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_file.write_text("not valid json")

            remove_python_settings(settings_file)

            captured = capsys.readouterr()
            # Warning is printed to stdout, not stderr
            assert "Failed to remove Python settings" in captured.out


class TestInstallClaudeFiles:
    """Test install_claude_files function."""

    def test_install_claude_files_cleans_standard_directory_when_not_local_mode(self):
        """Test that install_claude_files removes and recreates standard directory when not in local mode."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            standard_dir = project_dir / ".claude" / "rules" / "standard"
            standard_dir.mkdir(parents=True)
            (standard_dir / "old_file.md").write_text("old content")

            mock_config = Mock()

            with patch("lib.downloads.get_repo_files", return_value=[]):
                install_claude_files(project_dir, mock_config, "N", local_mode=False)

            # Standard dir should exist but old files should be removed
            assert standard_dir.exists()
            assert not (standard_dir / "old_file.md").exists()

    def test_install_claude_files_preserves_standard_directory_in_local_mode(self):
        """Test that install_claude_files preserves standard directory when in local mode."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            standard_dir = project_dir / ".claude" / "rules" / "standard"
            standard_dir.mkdir(parents=True)
            old_file = standard_dir / "old_file.md"
            old_file.write_text("old content")

            mock_config = Mock()

            with patch("lib.downloads.get_repo_files", return_value=[]):
                install_claude_files(project_dir, mock_config, "N", local_mode=True)

            # In local mode, existing files should be preserved
            assert standard_dir.exists()
            assert old_file.exists()
            assert old_file.read_text() == "old content"

    def test_install_claude_files_skips_python_checker_when_python_disabled(self):
        """Test that install_claude_files skips file_checker_python.py when Python support is disabled."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            mock_config = Mock()

            with patch("lib.downloads.get_repo_files", return_value=[".claude/hooks/file_checker_python.py"]):
                with patch("lib.downloads.download_file") as mock_download:
                    count = install_claude_files(project_dir, mock_config, "N", local_mode=False)

                    mock_download.assert_not_called()
                    assert count == 0

    def test_install_claude_files_downloads_python_checker_when_python_enabled(self):
        """Test that install_claude_files downloads file_checker_python.py when Python support is enabled."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            mock_config = Mock()

            with patch("lib.downloads.get_repo_files", return_value=[".claude/hooks/file_checker_python.py"]):
                with patch("lib.downloads.download_file", return_value=True) as mock_download:
                    count = install_claude_files(project_dir, mock_config, "Y", local_mode=False)

                    assert mock_download.call_count == 1
                    assert count == 1
