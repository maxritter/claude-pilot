"""Tests for shell config step."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import patch

from installer.steps.shell_config import (
    CLAUDE_ALIAS_MARKER,
    OLD_CCP_MARKER,
    PILOT_BIN,
    ShellConfigStep,
    alias_exists_in_file,
    get_alias_lines,
    remove_old_alias,
)


class TestShellConfigStep:
    """Test ShellConfigStep class."""

    def test_shell_config_step_has_correct_name(self):
        """ShellConfigStep has name 'shell_config'."""
        step = ShellConfigStep()
        assert step.name == "shell_config"

    def test_shell_config_check_always_returns_false(self):
        """ShellConfigStep.check always returns False to ensure alias updates."""
        from installer.context import InstallContext
        from installer.ui import Console

        step = ShellConfigStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )
            assert step.check(ctx) is False

    @patch("installer.steps.shell_config.get_shell_config_files")
    def test_shell_config_run_adds_claude_alias(self, mock_get_files):
        """ShellConfigStep.run adds claude alias to shell configs."""
        from installer.context import InstallContext
        from installer.ui import Console

        step = ShellConfigStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            bashrc = Path(tmpdir) / ".bashrc"
            bashrc.write_text("# existing config\n")
            mock_get_files.return_value = [bashrc]

            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            content = bashrc.read_text()
            assert CLAUDE_ALIAS_MARKER in content
            assert "alias claude=" in content
            assert "alias ccp=" in content
            assert PILOT_BIN in content

    @patch("installer.steps.shell_config.get_shell_config_files")
    def test_shell_config_migrates_old_ccp_alias(self, mock_get_files):
        """ShellConfigStep.run removes old ccp alias during migration."""
        from installer.context import InstallContext
        from installer.ui import Console

        step = ShellConfigStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            bashrc = Path(tmpdir) / ".bashrc"
            bashrc.write_text(f"{OLD_CCP_MARKER}\nalias ccp='old wrapper.py version'\n# other config\n")
            mock_get_files.return_value = [bashrc]

            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            content = bashrc.read_text()
            assert "wrapper.py" not in content
            assert OLD_CCP_MARKER not in content
            assert CLAUDE_ALIAS_MARKER in content
            assert "alias claude=" in content


class TestAliasLines:
    """Test alias line generation."""

    def test_get_alias_lines_returns_string(self):
        """get_alias_lines returns a string."""
        result = get_alias_lines("bash")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_alias_lines_contains_both_aliases(self):
        """Alias lines contain both claude and ccp aliases."""
        result = get_alias_lines("bash")
        assert "alias claude=" in result
        assert "alias ccp=" in result
        assert PILOT_BIN in result
        assert CLAUDE_ALIAS_MARKER in result

    def test_get_alias_lines_fish_uses_alias_syntax(self):
        """Fish alias uses alias syntax for both aliases."""
        result = get_alias_lines("fish")
        assert "alias claude=" in result
        assert "alias ccp=" in result
        assert PILOT_BIN in result
        assert CLAUDE_ALIAS_MARKER in result


class TestAliasDetection:
    """Test alias detection in config files."""

    def test_alias_exists_in_file_detects_old_ccp_marker(self):
        """alias_exists_in_file detects old ccp alias marker."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text(f"{OLD_CCP_MARKER}\nalias ccp='...'\n")
            assert alias_exists_in_file(config) is True

    def test_alias_exists_in_file_detects_claude_marker(self):
        """alias_exists_in_file detects claude alias marker."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text(f"{CLAUDE_ALIAS_MARKER}\nalias claude='...'\n")
            assert alias_exists_in_file(config) is True

    def test_alias_exists_in_file_detects_alias_without_marker(self):
        """alias_exists_in_file detects alias ccp without marker."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text("alias ccp='something'\n")
            assert alias_exists_in_file(config) is True

    def test_alias_exists_in_file_returns_false_when_missing(self):
        """alias_exists_in_file returns False when not configured."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text("# some other config\n")
            assert alias_exists_in_file(config) is False

    def test_alias_exists_in_file_detects_claude_alias_without_marker(self):
        """alias_exists_in_file detects alias claude without marker."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text("alias claude='something'\n")
            assert alias_exists_in_file(config) is True


class TestAliasRemoval:
    """Test alias removal for updates and migration."""

    def test_remove_old_alias_removes_ccp_marker_and_alias(self):
        """remove_old_alias removes ccp marker and alias line."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text(f"# before\n{OLD_CCP_MARKER}\nalias ccp='complex alias'\n# after\n")

            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert "alias ccp" not in content
            assert OLD_CCP_MARKER not in content
            assert "# before" in content
            assert "# after" in content

    def test_remove_old_alias_removes_claude_marker_and_alias(self):
        """remove_old_alias removes claude marker and alias."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text(f"# before\n{CLAUDE_ALIAS_MARKER}\nalias claude='...'\n# after\n")

            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert CLAUDE_ALIAS_MARKER not in content
            assert "# before" in content
            assert "# after" in content

    def test_remove_old_alias_removes_claude_function(self):
        """remove_old_alias removes claude() function definition."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text(f'# before\n{CLAUDE_ALIAS_MARKER}\nclaude() {{\n    ccp "$@"\n}}\n# after\n')

            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert CLAUDE_ALIAS_MARKER not in content
            assert "claude()" not in content
            assert "# before" in content
            assert "# after" in content

    def test_remove_old_alias_removes_standalone_ccp_alias(self):
        """remove_old_alias removes alias without marker."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text("# config\nalias ccp='something'\n# more\n")

            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert "alias ccp" not in content

    def test_remove_old_alias_returns_false_when_no_alias(self):
        """remove_old_alias returns False when no alias exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text("# just config\n")

            result = remove_old_alias(config)

            assert result is False

    def test_remove_old_alias_removes_claude_alias_without_marker(self):
        """remove_old_alias removes alias claude without marker."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text("# config\nalias claude='something'\n# more\n")

            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert "alias claude" not in content

    def test_remove_old_alias_removes_fish_function(self):
        """remove_old_alias removes fish function definition."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / "config.fish"
            config.write_text("# before\nfunction claude\n    echo 'hello'\nend\n# after\n")

            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert "function claude" not in content
            assert "end" not in content or "# after" in content
            assert "# before" in content
            assert "# after" in content
