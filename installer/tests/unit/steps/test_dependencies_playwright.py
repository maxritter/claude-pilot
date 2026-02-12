"""Tests for playwright-cli installation functions in dependencies step."""

from __future__ import annotations

from unittest.mock import MagicMock, patch


class TestIsPlaywrightCliReady:
    """Test _is_playwright_cli_ready function."""

    @patch("installer.steps.dependencies._get_playwright_cache_dirs")
    @patch("installer.steps.dependencies.command_exists")
    def test_returns_false_when_command_not_found(self, mock_cmd, _mock_dirs):
        """Returns False when playwright-cli is not installed."""
        from installer.steps.dependencies import _is_playwright_cli_ready

        mock_cmd.return_value = False
        assert _is_playwright_cli_ready() is False
        mock_cmd.assert_called_once_with("playwright-cli")

    @patch("installer.steps.dependencies._get_playwright_cache_dirs")
    @patch("installer.steps.dependencies.command_exists")
    def test_returns_false_when_no_chromium_cache(self, mock_cmd, mock_dirs, tmp_path):
        """Returns False when command exists but no Chromium cache."""
        from installer.steps.dependencies import _is_playwright_cli_ready

        mock_cmd.return_value = True
        empty_cache = tmp_path / "ms-playwright"
        empty_cache.mkdir()
        mock_dirs.return_value = [empty_cache]
        assert _is_playwright_cli_ready() is False

    @patch("installer.steps.dependencies._get_playwright_cache_dirs")
    @patch("installer.steps.dependencies.command_exists")
    def test_returns_true_with_chromium_installed(self, mock_cmd, mock_dirs, tmp_path):
        """Returns True when command exists and Chromium is installed."""
        from installer.steps.dependencies import _is_playwright_cli_ready

        mock_cmd.return_value = True
        cache_dir = tmp_path / "ms-playwright"
        chromium_dir = cache_dir / "chromium-1234"
        chromium_dir.mkdir(parents=True)
        (chromium_dir / "INSTALLATION_COMPLETE").touch()
        mock_dirs.return_value = [cache_dir]
        assert _is_playwright_cli_ready() is True

    @patch("installer.steps.dependencies._get_playwright_cache_dirs")
    @patch("installer.steps.dependencies.command_exists")
    def test_returns_true_with_headless_shell_installed(self, mock_cmd, mock_dirs, tmp_path):
        """Returns True when chromium_headless_shell variant is installed."""
        from installer.steps.dependencies import _is_playwright_cli_ready

        mock_cmd.return_value = True
        cache_dir = tmp_path / "ms-playwright"
        chromium_dir = cache_dir / "chromium_headless_shell-1234"
        chromium_dir.mkdir(parents=True)
        (chromium_dir / "INSTALLATION_COMPLETE").touch()
        mock_dirs.return_value = [cache_dir]
        assert _is_playwright_cli_ready() is True

    @patch("installer.steps.dependencies._get_playwright_cache_dirs")
    @patch("installer.steps.dependencies.command_exists")
    def test_returns_false_when_cache_dirs_dont_exist(self, mock_cmd, mock_dirs, tmp_path):
        """Returns False when cache directories don't exist."""
        from installer.steps.dependencies import _is_playwright_cli_ready

        mock_cmd.return_value = True
        mock_dirs.return_value = [tmp_path / "nonexistent"]
        assert _is_playwright_cli_ready() is False


class TestInstallPlaywrightCli:
    """Test install_playwright_cli function."""

    @patch("installer.steps.dependencies._is_playwright_cli_ready")
    def test_skips_install_when_already_ready(self, mock_ready):
        """Skips installation when playwright-cli is already ready."""
        from installer.steps.dependencies import install_playwright_cli

        mock_ready.return_value = True
        assert install_playwright_cli() is True

    @patch("installer.steps.dependencies._is_playwright_cli_ready")
    @patch("installer.steps.dependencies._run_bash_with_retry")
    def test_installs_npm_package(self, mock_run, mock_ready):
        """Installs @playwright/cli@latest via npm."""
        from installer.steps.dependencies import install_playwright_cli

        mock_ready.side_effect = [False, True]
        mock_run.return_value = True
        assert install_playwright_cli() is True
        mock_run.assert_called_once_with("npm install -g @playwright/cli@latest")

    @patch("installer.steps.dependencies._is_playwright_cli_ready")
    @patch("installer.steps.dependencies._run_bash_with_retry")
    def test_returns_false_when_npm_fails(self, mock_run, mock_ready):
        """Returns False when npm install fails."""
        from installer.steps.dependencies import install_playwright_cli

        mock_ready.return_value = False
        mock_run.return_value = False
        assert install_playwright_cli() is False

    @patch("installer.steps.dependencies.subprocess")
    @patch("installer.steps.dependencies._is_playwright_cli_ready")
    @patch("installer.steps.dependencies._run_bash_with_retry")
    def test_installs_browser_when_npm_succeeds_but_not_ready(self, mock_run, mock_ready, mock_subprocess):
        """Runs playwright-cli install when npm succeeds but Chromium not cached."""
        from installer.steps.dependencies import install_playwright_cli

        mock_ready.side_effect = [False, False, False]
        mock_run.return_value = True
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.run.return_value = mock_result
        assert install_playwright_cli() is True
        mock_subprocess.run.assert_called_once_with(
            ["playwright-cli", "install"],
            capture_output=True,
            text=True,
            timeout=300,
        )

    @patch("installer.steps.dependencies.subprocess")
    @patch("installer.steps.dependencies._is_playwright_cli_ready")
    @patch("installer.steps.dependencies._run_bash_with_retry")
    def test_install_browser_with_ui_spinner(self, mock_run, mock_ready, mock_subprocess):
        """Uses UI spinner when downloading browser with UI provided."""
        from installer.steps.dependencies import install_playwright_cli

        mock_ready.side_effect = [False, False, False]
        mock_run.return_value = True
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.run.return_value = mock_result

        ui = MagicMock()
        ui.spinner.return_value.__enter__ = MagicMock()
        ui.spinner.return_value.__exit__ = MagicMock(return_value=False)

        assert install_playwright_cli(ui=ui) is True
        ui.spinner.assert_called_once_with("Downloading Chromium browser...")


class TestInstallPlaywrightCliWithUi:
    """Test _install_playwright_cli_with_ui function."""

    @patch("installer.steps.dependencies.install_playwright_cli")
    def test_shows_success_message(self, mock_install):
        """Shows success message when installation succeeds."""
        from installer.steps.dependencies import _install_playwright_cli_with_ui

        mock_install.return_value = True
        ui = MagicMock()
        assert _install_playwright_cli_with_ui(ui) is True
        ui.status.assert_called_once_with("Installing playwright-cli...")
        ui.success.assert_called_once_with("playwright-cli installed")

    @patch("installer.steps.dependencies.install_playwright_cli")
    def test_shows_warning_on_failure(self, mock_install):
        """Shows warning when installation fails."""
        from installer.steps.dependencies import _install_playwright_cli_with_ui

        mock_install.return_value = False
        ui = MagicMock()
        assert _install_playwright_cli_with_ui(ui) is False
        ui.warning.assert_called_once_with("Could not install playwright-cli - please install manually")

    @patch("installer.steps.dependencies.install_playwright_cli")
    def test_works_without_ui(self, mock_install):
        """Works when ui is None."""
        from installer.steps.dependencies import _install_playwright_cli_with_ui

        mock_install.return_value = True
        assert _install_playwright_cli_with_ui(None) is True
