"""Tests for Prerequisites installation step."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch


class TestPrerequisitesStep:
    """Test PrerequisitesStep class."""

    def test_prerequisites_step_has_correct_name(self):
        """PrerequisitesStep has name 'prerequisites'."""
        from installer.steps.prerequisites import PrerequisitesStep

        step = PrerequisitesStep()
        assert step.name == "prerequisites"

    def test_prerequisites_step_skips_in_devcontainer(self):
        """PrerequisitesStep.check returns True when in dev container (skip step)."""
        from installer.context import InstallContext
        from installer.steps.prerequisites import PrerequisitesStep
        from installer.ui import Console

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )

            with patch("installer.steps.prerequisites.is_in_devcontainer", return_value=True):
                assert step.check(ctx) is True

    def test_prerequisites_step_runs_when_not_in_devcontainer(self):
        """PrerequisitesStep.check returns False when not in dev container."""
        from installer.context import InstallContext
        from installer.steps.prerequisites import PrerequisitesStep
        from installer.ui import Console

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                is_local_install=True,
                ui=Console(non_interactive=True),
            )

            with patch("installer.steps.prerequisites.is_in_devcontainer", return_value=False):
                with patch("installer.steps.prerequisites.is_homebrew_available", return_value=True):
                    with patch("installer.steps.prerequisites.command_exists", return_value=False):
                        assert step.check(ctx) is False

    def test_prerequisites_step_skips_when_all_packages_installed(self):
        """PrerequisitesStep.check returns True when all packages already installed."""
        from installer.context import InstallContext
        from installer.steps.prerequisites import PrerequisitesStep
        from installer.ui import Console

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                is_local_install=True,
                ui=Console(non_interactive=True),
            )

            with patch("installer.steps.prerequisites.is_in_devcontainer", return_value=False):
                with patch("installer.steps.prerequisites.is_homebrew_available", return_value=True):
                    with patch("installer.steps.prerequisites.command_exists", return_value=True):
                        with patch("installer.steps.prerequisites._is_nvm_installed", return_value=True):
                            assert step.check(ctx) is True

    def test_prerequisites_step_runs_outside_devcontainer(self):
        """PrerequisitesStep.check returns False (run) when not in dev container and packages missing."""
        from installer.context import InstallContext
        from installer.steps.prerequisites import PrerequisitesStep
        from installer.ui import Console

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
            )

            with patch("installer.steps.prerequisites.is_in_devcontainer", return_value=False):
                with patch("installer.steps.prerequisites.is_homebrew_available", return_value=True):
                    with patch("installer.steps.prerequisites.command_exists", return_value=False):
                        assert step.check(ctx) is False


class TestPrerequisitesStepRun:
    """Test PrerequisitesStep.run() method."""

    @patch("installer.steps.prerequisites._install_homebrew_package")
    @patch("installer.steps.prerequisites._add_bun_tap")
    @patch("installer.steps.prerequisites._is_nvm_installed")
    @patch("installer.steps.prerequisites.command_exists")
    @patch("installer.steps.prerequisites.is_homebrew_available")
    def test_prerequisites_run_installs_missing_packages(
        self, mock_homebrew_available, mock_cmd_exists, mock_nvm_installed, mock_tap, mock_install
    ):
        """PrerequisitesStep.run installs packages that are missing."""
        from installer.context import InstallContext
        from installer.steps.prerequisites import HOMEBREW_PACKAGES, PrerequisitesStep
        from installer.ui import Console

        mock_homebrew_available.return_value = True
        mock_cmd_exists.return_value = False
        mock_nvm_installed.return_value = False
        mock_tap.return_value = True
        mock_install.return_value = True

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                is_local_install=True,
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            mock_tap.assert_called_once()
            assert mock_install.call_count == len(HOMEBREW_PACKAGES)

    @patch("installer.steps.prerequisites._install_homebrew_package")
    @patch("installer.steps.prerequisites._add_bun_tap")
    @patch("installer.steps.prerequisites._is_nvm_installed")
    @patch("installer.steps.prerequisites.command_exists")
    @patch("installer.steps.prerequisites.is_homebrew_available")
    def test_prerequisites_run_skips_installed_packages(
        self, mock_homebrew_available, mock_cmd_exists, mock_nvm_installed, mock_tap, mock_install
    ):
        """PrerequisitesStep.run skips packages that are already installed."""
        from installer.context import InstallContext
        from installer.steps.prerequisites import PrerequisitesStep
        from installer.ui import Console

        mock_homebrew_available.return_value = True
        mock_cmd_exists.return_value = True
        mock_nvm_installed.return_value = True
        mock_tap.return_value = True
        mock_install.return_value = True

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                is_local_install=True,
                ui=Console(non_interactive=True),
            )

            step.run(ctx)

            mock_tap.assert_called_once()
            mock_install.assert_not_called()


class TestPrerequisitesHelpers:
    """Test Prerequisites helper functions."""

    def test_homebrew_packages_list_exists(self):
        """HOMEBREW_PACKAGES constant exists and contains expected packages."""
        from installer.steps.prerequisites import HOMEBREW_PACKAGES

        assert isinstance(HOMEBREW_PACKAGES, list)
        assert "git" in HOMEBREW_PACKAGES
        assert "gh" in HOMEBREW_PACKAGES
        assert "python@3.12" in HOMEBREW_PACKAGES
        assert "node@22" in HOMEBREW_PACKAGES
        assert "bun" in HOMEBREW_PACKAGES
        assert "uv" in HOMEBREW_PACKAGES
        assert "go" in HOMEBREW_PACKAGES
        assert "ripgrep" in HOMEBREW_PACKAGES

    def test_get_command_for_package_maps_ripgrep_to_rg(self):
        """_get_command_for_package returns 'rg' for ripgrep package."""
        from installer.steps.prerequisites import _get_command_for_package

        assert _get_command_for_package("ripgrep") == "rg"

    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.is_apt_available")
    def test_install_ripgrep_via_apt_skips_on_non_linux(self, mock_apt, mock_linux):
        """_install_ripgrep_via_apt returns False on non-Linux systems."""
        from installer.steps.prerequisites import _install_ripgrep_via_apt

        mock_linux.return_value = False
        mock_apt.return_value = True

        result = _install_ripgrep_via_apt()
        assert result is False

    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.is_apt_available")
    def test_install_ripgrep_via_apt_skips_without_apt(self, mock_apt, mock_linux):
        """_install_ripgrep_via_apt returns False when apt not available."""
        from installer.steps.prerequisites import _install_ripgrep_via_apt

        mock_linux.return_value = True
        mock_apt.return_value = False

        result = _install_ripgrep_via_apt()
        assert result is False

    @patch("subprocess.run")
    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.is_apt_available")
    def test_install_ripgrep_via_apt_runs_with_sudo_n_and_devnull_stdin(self, mock_apt, mock_linux, mock_run):
        """_install_ripgrep_via_apt uses sudo -n and stdin=DEVNULL to prevent hanging."""
        from installer.steps.prerequisites import _install_ripgrep_via_apt

        mock_linux.return_value = True
        mock_apt.return_value = True
        mock_run.return_value = MagicMock(returncode=0)

        result = _install_ripgrep_via_apt()

        assert result is True
        assert mock_run.call_count == 2
        first_call = mock_run.call_args_list[0]
        assert "update" in first_call[0][0]
        assert "sudo" in first_call[0][0]
        assert "-n" in first_call[0][0]
        second_call = mock_run.call_args_list[1]
        assert "install" in second_call[0][0]
        assert "ripgrep" in second_call[0][0]
        assert second_call[1].get("stdin") == subprocess.DEVNULL
        assert second_call[1].get("timeout") is not None

    @patch("subprocess.run")
    def test_add_bun_tap_runs_brew_tap(self, mock_run):
        """_add_bun_tap runs brew tap command."""
        from installer.steps.prerequisites import _add_bun_tap

        mock_run.return_value = MagicMock(returncode=0)

        result = _add_bun_tap()

        assert result is True
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        assert "brew" in call_args
        assert "tap" in call_args
        assert "oven-sh/bun" in call_args

    @patch("subprocess.run")
    def test_install_homebrew_package_runs_brew_install(self, mock_run):
        """_install_homebrew_package runs brew install command."""
        from installer.steps.prerequisites import _install_homebrew_package

        mock_run.return_value = MagicMock(returncode=0)

        result = _install_homebrew_package("git")

        assert result is True
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        assert "brew" in call_args
        assert "install" in call_args
        assert "git" in call_args

    @patch("os.path.exists")
    def test_ensure_homebrew_in_path_adds_brew_path(self, mock_exists):
        """_ensure_homebrew_in_path adds Homebrew bin to PATH when missing."""
        import os

        from installer.steps.prerequisites import _ensure_homebrew_in_path

        mock_exists.side_effect = lambda p: p == "/opt/homebrew/bin/brew"
        original_path = os.environ.get("PATH", "")

        os.environ["PATH"] = "/usr/bin:/bin"
        try:
            _ensure_homebrew_in_path()
            assert "/opt/homebrew/bin" in os.environ["PATH"]
        finally:
            os.environ["PATH"] = original_path

    @patch("os.path.exists")
    def test_ensure_homebrew_in_path_skips_if_already_present(self, mock_exists):
        """_ensure_homebrew_in_path does nothing if brew path already in PATH."""
        import os

        from installer.steps.prerequisites import _ensure_homebrew_in_path

        mock_exists.side_effect = lambda p: p == "/opt/homebrew/bin/brew"
        original_path = os.environ.get("PATH", "")

        os.environ["PATH"] = "/opt/homebrew/bin:/usr/bin:/bin"
        try:
            _ensure_homebrew_in_path()
            assert os.environ["PATH"].count("/opt/homebrew/bin") == 1
        finally:
            os.environ["PATH"] = original_path


class TestEnsureGitInstalled:
    """Test _ensure_git_installed function."""

    @patch("installer.steps.prerequisites.command_exists")
    def test_returns_true_when_git_already_exists(self, mock_cmd):
        from installer.steps.prerequisites import _ensure_git_installed

        mock_cmd.return_value = True
        assert _ensure_git_installed() is True

    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.command_exists")
    def test_returns_false_on_non_linux(self, mock_cmd, mock_linux):
        from installer.steps.prerequisites import _ensure_git_installed

        mock_cmd.return_value = False
        mock_linux.return_value = False
        assert _ensure_git_installed() is False

    @patch("subprocess.run")
    @patch("installer.steps.prerequisites.is_dnf_available")
    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.command_exists")
    def test_uses_dnf_on_rhel_based(self, mock_cmd, mock_linux, mock_dnf, mock_run):
        from installer.steps.prerequisites import _ensure_git_installed

        mock_cmd.side_effect = [False, True]
        mock_linux.return_value = True
        mock_dnf.return_value = True
        mock_run.return_value = MagicMock(returncode=0)

        assert _ensure_git_installed() is True
        call_args = mock_run.call_args_list[0][0][0]
        assert "dnf" in call_args
        assert "git" in call_args
        assert mock_run.call_args_list[0][1].get("stdin") == subprocess.DEVNULL

    @patch("subprocess.run")
    @patch("installer.steps.prerequisites.is_dnf_available")
    @patch("installer.steps.prerequisites.is_yum_available")
    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.command_exists")
    def test_falls_back_to_yum(self, mock_cmd, mock_linux, mock_yum, mock_dnf, mock_run):
        from installer.steps.prerequisites import _ensure_git_installed

        mock_cmd.side_effect = [False, True]
        mock_linux.return_value = True
        mock_dnf.return_value = False
        mock_yum.return_value = True
        mock_run.return_value = MagicMock(returncode=0)

        assert _ensure_git_installed() is True
        call_args = mock_run.call_args_list[0][0][0]
        assert "yum" in call_args

    @patch("subprocess.run")
    @patch("installer.steps.prerequisites.is_dnf_available")
    @patch("installer.steps.prerequisites.is_yum_available")
    @patch("installer.steps.prerequisites.is_apt_available")
    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.command_exists")
    def test_returns_false_when_no_package_manager(
        self, mock_cmd, mock_linux, mock_apt, mock_yum, mock_dnf, mock_run
    ):
        from installer.steps.prerequisites import _ensure_git_installed

        mock_cmd.return_value = False
        mock_linux.return_value = True
        mock_dnf.return_value = False
        mock_yum.return_value = False
        mock_apt.return_value = False

        assert _ensure_git_installed() is False
        mock_run.assert_not_called()

    @patch("subprocess.run")
    @patch("installer.steps.prerequisites.is_dnf_available")
    @patch("installer.steps.prerequisites.is_linux")
    @patch("installer.steps.prerequisites.command_exists")
    def test_returns_false_on_install_failure(self, mock_cmd, mock_linux, mock_dnf, mock_run):
        from installer.steps.prerequisites import _ensure_git_installed

        mock_cmd.return_value = False
        mock_linux.return_value = True
        mock_dnf.return_value = True
        mock_run.return_value = MagicMock(returncode=1)

        assert _ensure_git_installed() is False


class TestPrerequisitesStepRunGitInstall:
    """Test that PrerequisitesStep.run installs git before Homebrew."""

    @patch("installer.steps.prerequisites._install_homebrew")
    @patch("installer.steps.prerequisites._ensure_git_installed")
    @patch("installer.steps.prerequisites.command_exists")
    @patch("installer.steps.prerequisites.is_homebrew_available")
    def test_run_installs_git_before_homebrew_when_missing(
        self, mock_brew, mock_cmd, mock_git, mock_homebrew_install
    ):
        from installer.context import InstallContext
        from installer.steps.prerequisites import PrerequisitesStep
        from installer.ui import Console

        mock_brew.return_value = False
        mock_cmd.return_value = False
        mock_git.return_value = True
        mock_homebrew_install.return_value = False

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                is_local_install=True,
                ui=Console(non_interactive=True),
            )
            step.run(ctx)

        mock_git.assert_called_once()

    @patch("installer.steps.prerequisites._install_homebrew")
    @patch("installer.steps.prerequisites._ensure_git_installed")
    @patch("installer.steps.prerequisites.command_exists")
    @patch("installer.steps.prerequisites.is_homebrew_available")
    def test_run_skips_git_install_when_already_present(
        self, mock_brew, mock_cmd, mock_git, mock_homebrew_install
    ):
        from installer.context import InstallContext
        from installer.steps.prerequisites import PrerequisitesStep
        from installer.ui import Console

        mock_brew.return_value = False
        mock_cmd.return_value = True
        mock_homebrew_install.return_value = False

        step = PrerequisitesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                is_local_install=True,
                ui=Console(non_interactive=True),
            )
            step.run(ctx)

        mock_git.assert_not_called()


class TestInstallHomebrew:
    """Test _install_homebrew function."""

    @patch("installer.steps.prerequisites.is_homebrew_available")
    @patch("subprocess.run")
    def test_install_homebrew_uses_string_command_with_noninteractive(self, mock_run, mock_brew_available):
        """_install_homebrew passes a string (not list) to subprocess.run with shell=True and NONINTERACTIVE=1."""
        from installer.steps.prerequisites import _install_homebrew

        mock_run.return_value = MagicMock(returncode=0)
        mock_brew_available.return_value = True

        _install_homebrew()

        mock_run.assert_called_once()
        call_kwargs = mock_run.call_args
        cmd = call_kwargs[0][0]
        assert isinstance(cmd, str), f"Expected string command, got {type(cmd)}"
        assert "curl" in cmd
        assert "Homebrew/install" in cmd
        assert call_kwargs[1].get("shell") is True
        env = call_kwargs[1].get("env", {})
        assert env.get("NONINTERACTIVE") == "1", "Must set NONINTERACTIVE=1 for Homebrew"
        assert "timeout" in call_kwargs[1], "Must have a timeout to prevent hanging"
        assert call_kwargs[1]["timeout"] > 0

    @patch("installer.steps.prerequisites.is_homebrew_available")
    @patch("subprocess.run")
    def test_install_homebrew_uses_devnull_stdin(self, mock_run, mock_brew_available):
        """_install_homebrew passes stdin=DEVNULL to prevent interactive prompts."""
        import subprocess as sp

        from installer.steps.prerequisites import _install_homebrew

        mock_run.return_value = MagicMock(returncode=0)
        mock_brew_available.return_value = True

        _install_homebrew()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs.get("stdin") == sp.DEVNULL, "Must use stdin=DEVNULL to prevent hanging on prompts"

    @patch("installer.steps.prerequisites.is_homebrew_available")
    @patch("subprocess.run")
    def test_install_homebrew_returns_false_on_timeout(self, mock_run, _mock_brew_available):
        """_install_homebrew returns False when subprocess times out."""
        import subprocess as sp

        from installer.steps.prerequisites import _install_homebrew

        mock_run.side_effect = sp.TimeoutExpired(cmd="brew", timeout=300)

        result = _install_homebrew()
        assert result is False


class TestIsHomebrewAvailable:
    """Test is_homebrew_available function."""

    @patch("shutil.which")
    def test_is_homebrew_available_returns_true_when_found(self, mock_which):
        """is_homebrew_available returns True when brew is in PATH."""
        from installer.platform_utils import is_homebrew_available

        mock_which.return_value = "/opt/homebrew/bin/brew"
        assert is_homebrew_available() is True

    @patch("shutil.which")
    def test_is_homebrew_available_returns_false_when_not_found(self, mock_which):
        """is_homebrew_available returns False when brew not in PATH."""
        from installer.platform_utils import is_homebrew_available

        mock_which.return_value = None
        assert is_homebrew_available() is False
