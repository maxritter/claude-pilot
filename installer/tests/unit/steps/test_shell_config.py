"""Tests for shell config step."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import patch

from installer.steps.shell_config import (
    CLAUDE_ALIAS_MARKER,
    MCP_CLI_SCRIPT,
    OLD_CCP_MARKER,
    PILOT_BIN,
    PILOT_BIN_DIR,
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
    def test_shell_config_run_adds_pilot_alias(self, mock_get_files):
        """ShellConfigStep.run adds pilot and ccp aliases to shell configs."""
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
            assert "alias pilot=" in content
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
            assert "alias pilot=" in content


    @patch("installer.steps.shell_config.get_shell_config_files")
    def test_shell_config_upgrades_old_bun_only_path(self, mock_get_files):
        """ShellConfigStep upgrades old config with only .bun/bin to include .pilot/bin."""
        from installer.context import InstallContext
        from installer.ui import Console

        step = ShellConfigStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            bashrc = Path(tmpdir) / ".bashrc"
            bashrc.write_text(
                "# before\n"
                f"{CLAUDE_ALIAS_MARKER}\n"
                'export PATH="$HOME/.bun/bin:$PATH"\n'
                f'alias pilot="{PILOT_BIN}"\n'
                f'alias ccp="{PILOT_BIN}"\n'
                "# after\n"
            )
            mock_get_files.return_value = [bashrc]

            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            content = bashrc.read_text()
            assert "# before" in content
            assert "# after" in content
            assert PILOT_BIN_DIR in content
            assert content.count(CLAUDE_ALIAS_MARKER) == 1

            mcp_cli_script = Path.home() / ".pilot" / "bin" / "mcp-cli"
            assert mcp_cli_script.exists()
            import os
            assert os.access(mcp_cli_script, os.X_OK)

    @patch("installer.steps.shell_config.get_shell_config_files")
    def test_shell_config_upgrades_old_mcp_cli_function(self, mock_get_files):
        """ShellConfigStep upgrades old config with mcp-cli function to script."""
        from installer.context import InstallContext
        from installer.ui import Console

        step = ShellConfigStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            bashrc = Path(tmpdir) / ".bashrc"
            bashrc.write_text(
                f"{CLAUDE_ALIAS_MARKER}\n"
                'export PATH="$HOME/.bun/bin:$PATH"\n'
                f'alias pilot="{PILOT_BIN}"\n'
                f'alias ccp="{PILOT_BIN}"\n'
                'mcp-cli() { command claude --mcp-cli "$@"; }\n'
            )
            mock_get_files.return_value = [bashrc]

            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            content = bashrc.read_text()
            assert "mcp-cli()" not in content
            assert PILOT_BIN_DIR in content
            assert 'export PATH="$HOME/.bun/bin:$PATH"' not in content


class TestAliasLines:
    """Test alias line generation."""

    def test_get_alias_lines_returns_string(self):
        """get_alias_lines returns a string."""
        result = get_alias_lines("bash")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_alias_lines_contains_pilot_and_ccp_aliases(self):
        """Alias lines contain pilot and ccp aliases (not claude to avoid overriding binary)."""
        result = get_alias_lines("bash")
        assert "alias pilot=" in result
        assert "alias ccp=" in result
        assert "alias claude=" not in result
        assert PILOT_BIN in result
        assert CLAUDE_ALIAS_MARKER in result

    def test_get_alias_lines_fish_uses_alias_syntax(self):
        """Fish alias uses alias syntax for pilot and ccp aliases."""
        result = get_alias_lines("fish")
        assert "alias pilot=" in result
        assert "alias ccp=" in result
        assert "alias claude=" not in result
        assert PILOT_BIN in result
        assert CLAUDE_ALIAS_MARKER in result


class TestMcpCliFunction:
    """Test mcp-cli function generation and cleanup."""

    def test_get_alias_lines_bash_includes_pilot_bin_in_path(self):
        """Bash alias lines include ~/.pilot/bin in PATH for mcp-cli script."""
        result = get_alias_lines("bash")
        assert PILOT_BIN_DIR in result
        assert "alias mcp-cli" not in result
        assert "mcp-cli()" not in result

    def test_get_alias_lines_fish_includes_pilot_bin_in_path(self):
        """Fish alias lines include ~/.pilot/bin in PATH for mcp-cli script."""
        result = get_alias_lines("fish")
        assert PILOT_BIN_DIR in result
        assert "alias mcp-cli" not in result
        assert "function mcp-cli" not in result

    def test_remove_old_alias_removes_mcp_cli_alias(self):
        """remove_old_alias removes alias mcp-cli from Claude Code."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text(
                "# before\n"
                "alias mcp-cli='/path/to/claude --mcp-cli'\n"
                "# after\n"
            )
            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert "alias mcp-cli" not in content
            assert "# before" in content
            assert "# after" in content

    def test_remove_old_alias_removes_mcp_cli_function(self):
        """remove_old_alias removes mcp-cli() function from previous Pilot install."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text(
                '# before\n'
                'mcp-cli() { command claude --mcp-cli "$@"; }\n'
                '# after\n'
            )
            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert "mcp-cli()" not in content
            assert "# before" in content
            assert "# after" in content

    def test_remove_old_alias_removes_fish_mcp_cli_function(self):
        """remove_old_alias removes fish mcp-cli function definition."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / "config.fish"
            config.write_text(
                "# before\n"
                "function mcp-cli\n"
                "    command claude --mcp-cli $argv\n"
                "end\n"
                "# after\n"
            )
            result = remove_old_alias(config)

            assert result is True
            content = config.read_text()
            assert "function mcp-cli" not in content
            assert "# before" in content
            assert "# after" in content

    def test_alias_exists_detects_mcp_cli_alias(self):
        """alias_exists_in_file detects mcp-cli alias from Claude Code."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text("alias mcp-cli='/path/to/claude --mcp-cli'\n")
            assert alias_exists_in_file(config) is True

    def test_alias_exists_detects_mcp_cli_function(self):
        """alias_exists_in_file detects mcp-cli() function."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = Path(tmpdir) / ".bashrc"
            config.write_text('mcp-cli() { command claude --mcp-cli "$@"; }\n')
            assert alias_exists_in_file(config) is True

    @patch("installer.steps.shell_config.get_shell_config_files")
    def test_shell_config_replaces_mcp_cli_alias_with_script(self, mock_get_files):
        """ShellConfigStep removes Claude Code's mcp-cli alias and installs script."""
        from installer.context import InstallContext
        from installer.ui import Console

        step = ShellConfigStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            bashrc = Path(tmpdir) / ".bashrc"
            bashrc.write_text(
                "# existing config\n"
                "alias mcp-cli='/path/to/claude --mcp-cli'\n"
            )
            mock_get_files.return_value = [bashrc]

            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            content = bashrc.read_text()
            assert "alias mcp-cli" not in content
            assert PILOT_BIN_DIR in content

            mcp_cli_script = Path.home() / ".pilot" / "bin" / "mcp-cli"
            assert mcp_cli_script.exists()
            assert mcp_cli_script.read_text() == MCP_CLI_SCRIPT
            import os
            assert os.access(mcp_cli_script, os.X_OK)


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
