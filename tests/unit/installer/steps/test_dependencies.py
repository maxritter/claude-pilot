"""Tests for dependencies step."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


class TestDependenciesStep:
    """Test DependenciesStep class."""

    def test_dependencies_step_has_correct_name(self):
        """DependenciesStep has name 'dependencies'."""
        from installer.steps.dependencies import DependenciesStep

        step = DependenciesStep()
        assert step.name == "dependencies"

    def test_dependencies_check_returns_false(self):
        """DependenciesStep.check returns False (always runs)."""
        from installer.context import InstallContext
        from installer.steps.dependencies import DependenciesStep
        from installer.ui import Console

        step = DependenciesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )
            # Dependencies always need to be checked
            assert step.check(ctx) is False

    @patch("installer.steps.dependencies.install_dotenvx")
    @patch("installer.steps.dependencies.run_qlty_check")
    @patch("installer.steps.dependencies.install_qlty")
    @patch("installer.steps.dependencies.install_local_milvus")
    @patch("installer.steps.dependencies.install_claude_mem")
    @patch("installer.steps.dependencies.install_bun")
    @patch("installer.steps.dependencies.install_claude_code")
    @patch("installer.steps.dependencies.install_vtsls")
    @patch("installer.steps.dependencies.install_nodejs")
    def test_dependencies_run_installs_core(
        self,
        mock_nodejs,
        mock_vtsls,
        mock_claude,
        mock_bun,
        mock_claude_mem,
        mock_milvus,
        mock_qlty,
        mock_qlty_check,
        mock_dotenvx,
    ):
        """DependenciesStep installs core dependencies."""
        from installer.context import InstallContext
        from installer.steps.dependencies import DependenciesStep
        from installer.ui import Console

        # Setup mocks
        mock_nodejs.return_value = True
        mock_vtsls.return_value = True
        mock_claude.return_value = True
        mock_bun.return_value = True
        mock_claude_mem.return_value = True
        mock_milvus.return_value = True
        mock_qlty.return_value = (True, False)
        mock_dotenvx.return_value = True

        step = DependenciesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                install_python=False,
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            # Core dependencies should be installed
            mock_nodejs.assert_called_once()
            mock_vtsls.assert_called_once()
            mock_claude.assert_called_once()

    @patch("installer.steps.dependencies.install_dotenvx")
    @patch("installer.steps.dependencies.run_qlty_check")
    @patch("installer.steps.dependencies.install_qlty")
    @patch("installer.steps.dependencies.install_local_milvus")
    @patch("installer.steps.dependencies.install_claude_mem")
    @patch("installer.steps.dependencies.install_bun")
    @patch("installer.steps.dependencies.install_claude_code")
    @patch("installer.steps.dependencies.install_python_tools")
    @patch("installer.steps.dependencies.install_uv")
    @patch("installer.steps.dependencies.install_vtsls")
    @patch("installer.steps.dependencies.install_nodejs")
    def test_dependencies_installs_python_when_enabled(
        self,
        mock_nodejs,
        mock_vtsls,
        mock_uv,
        mock_python_tools,
        mock_claude,
        mock_bun,
        mock_claude_mem,
        mock_milvus,
        mock_qlty,
        mock_qlty_check,
        mock_dotenvx,
    ):
        """DependenciesStep installs Python tools when enabled."""
        from installer.context import InstallContext
        from installer.steps.dependencies import DependenciesStep
        from installer.ui import Console

        # Setup mocks
        mock_nodejs.return_value = True
        mock_vtsls.return_value = True
        mock_uv.return_value = True
        mock_python_tools.return_value = True
        mock_claude.return_value = True
        mock_bun.return_value = True
        mock_claude_mem.return_value = True
        mock_milvus.return_value = True
        mock_qlty.return_value = (True, False)
        mock_dotenvx.return_value = True

        step = DependenciesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                install_python=True,
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            # Python tools should be installed
            mock_uv.assert_called_once()
            mock_python_tools.assert_called_once()


class TestDependencyInstallFunctions:
    """Test individual dependency install functions."""

    def test_install_nodejs_exists(self):
        """install_nodejs function exists."""
        from installer.steps.dependencies import install_nodejs

        assert callable(install_nodejs)

    def test_install_claude_code_exists(self):
        """install_claude_code function exists."""
        from installer.steps.dependencies import install_claude_code

        assert callable(install_claude_code)

    def test_install_uv_exists(self):
        """install_uv function exists."""
        from installer.steps.dependencies import install_uv

        assert callable(install_uv)

    def test_install_python_tools_exists(self):
        """install_python_tools function exists."""
        from installer.steps.dependencies import install_python_tools

        assert callable(install_python_tools)

    def test_install_dotenvx_exists(self):
        """install_dotenvx function exists."""
        from installer.steps.dependencies import install_dotenvx

        assert callable(install_dotenvx)


class TestDotenvxInstall:
    """Test dotenvx installation."""

    @patch("installer.steps.dependencies.command_exists")
    @patch("subprocess.run")
    def test_install_dotenvx_calls_native_installer(self, mock_run, mock_cmd_exists):
        """install_dotenvx calls native shell installer."""
        from installer.steps.dependencies import install_dotenvx

        mock_cmd_exists.return_value = False
        mock_run.return_value = MagicMock(returncode=0)

        result = install_dotenvx()

        # Should call curl shell installer
        mock_run.assert_called()
        call_args = mock_run.call_args[0][0]
        assert "bash" in call_args
        assert "dotenvx.sh" in call_args[2]  # The curl command is the 3rd arg

    @patch("installer.steps.dependencies.command_exists")
    def test_install_dotenvx_skips_if_exists(self, mock_cmd_exists):
        """install_dotenvx skips if already installed."""
        from installer.steps.dependencies import install_dotenvx

        mock_cmd_exists.return_value = True

        result = install_dotenvx()

        assert result is True


class TestVtslsInstall:
    """Test VTSLS TypeScript language server installation."""

    def test_install_vtsls_exists(self):
        """install_vtsls function exists."""
        from installer.steps.dependencies import install_vtsls

        assert callable(install_vtsls)

    @patch("installer.steps.dependencies.command_exists")
    @patch("subprocess.run")
    def test_install_vtsls_calls_npm_install(self, mock_run, mock_cmd_exists):
        """install_vtsls calls npm install with correct packages."""
        from installer.steps.dependencies import install_vtsls

        mock_cmd_exists.return_value = False
        mock_run.return_value = MagicMock(returncode=0)

        result = install_vtsls()

        mock_run.assert_called()
        call_args = mock_run.call_args[0][0]
        assert "bash" in call_args
        # The npm install command should include vtsls and typescript
        assert "@vtsls/language-server" in call_args[2]
        assert "typescript" in call_args[2]

    @patch("installer.steps.dependencies.command_exists")
    def test_install_vtsls_skips_if_exists(self, mock_cmd_exists):
        """install_vtsls skips if already installed."""
        from installer.steps.dependencies import install_vtsls

        mock_cmd_exists.return_value = True

        result = install_vtsls()

        assert result is True
