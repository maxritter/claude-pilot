"""Prerequisites installation step for local installations."""

from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path

from installer.context import InstallContext
from installer.platform_utils import (
    command_exists,
    is_apt_available,
    is_dnf_available,
    is_homebrew_available,
    is_in_devcontainer,
    is_linux,
    is_yum_available,
)
from installer.steps.base import BaseStep

MAX_RETRIES = 3
RETRY_DELAY = 2

HOMEBREW_PACKAGES = [
    "git",
    "gh",
    "python@3.12",
    "node@22",
    "nvm",
    "pnpm",
    "bun",
    "uv",
    "go",
    "gopls",
    "ripgrep",
]


def _is_nvm_installed() -> bool:
    """Check if nvm is installed (it's a shell function, not a binary)."""
    nvm_dir = Path.home() / ".nvm"
    if (nvm_dir / "nvm.sh").exists():
        return True
    try:
        result = subprocess.run(["brew", "list", "nvm"], capture_output=True, check=False, timeout=30)
        return result.returncode == 0
    except (subprocess.SubprocessError, OSError):
        return False


def _ensure_git_installed() -> bool:
    """Install git via system package manager if missing (required by Homebrew)."""
    if command_exists("git"):
        return True
    if not is_linux():
        return False

    pkg_cmds: list[list[str]] = []
    if is_dnf_available():
        pkg_cmds = [["sudo", "-n", "dnf", "install", "-y", "git"]]
    elif is_yum_available():
        pkg_cmds = [["sudo", "-n", "yum", "install", "-y", "git"]]
    elif is_apt_available():
        pkg_cmds = [
            ["sudo", "-n", "apt-get", "update", "-qq"],
            ["sudo", "-n", "apt-get", "install", "-y", "git"],
        ]
    else:
        return False

    try:
        for cmd in pkg_cmds:
            result = subprocess.run(
                cmd,
                capture_output=True,
                check=False,
                stdin=subprocess.DEVNULL,
                timeout=120,
            )
            if result.returncode != 0:
                return False
        return command_exists("git")
    except (subprocess.SubprocessError, OSError):
        return False


def _install_homebrew() -> bool:
    """Install Homebrew non-interactively."""
    try:
        env = {**os.environ, "NONINTERACTIVE": "1"}
        result = subprocess.run(
            '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
            shell=True,
            check=False,
            stdin=subprocess.DEVNULL,
            env=env,
            timeout=300,
        )
        if result.returncode != 0:
            return False

        brew_paths = [
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "/home/linuxbrew/.linuxbrew/bin",
        ]
        for brew_path in brew_paths:
            if os.path.exists(os.path.join(brew_path, "brew")):
                os.environ["PATH"] = f"{brew_path}:{os.environ.get('PATH', '')}"
                break

        return is_homebrew_available()
    except (subprocess.SubprocessError, OSError):
        return False


def _add_bun_tap() -> bool:
    """Add the bun tap to Homebrew."""
    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                ["brew", "tap", "oven-sh/bun"],
                capture_output=True,
                check=False,
                timeout=60,
            )
            if result.returncode == 0 or b"already tapped" in result.stderr.lower():
                return True
        except (subprocess.SubprocessError, OSError):
            pass
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_DELAY)
    return False


def _ensure_homebrew_in_path() -> None:
    """Ensure Homebrew bin directory is in PATH for current process."""
    brew_paths = [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/home/linuxbrew/.linuxbrew/bin",
    ]
    current_path = os.environ.get("PATH", "")
    for brew_path in brew_paths:
        if os.path.exists(os.path.join(brew_path, "brew")):
            if brew_path not in current_path:
                os.environ["PATH"] = f"{brew_path}:{current_path}"
            break


def _install_homebrew_package(package: str) -> bool:
    """Install a single Homebrew package."""
    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                ["brew", "install", package],
                capture_output=True,
                check=False,
                timeout=120,
            )
            if result.returncode == 0:
                _ensure_homebrew_in_path()
                return True
        except (subprocess.SubprocessError, OSError):
            pass
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_DELAY)
    return False


def _get_command_for_package(package: str) -> str:
    """Get the command name to check for a given Homebrew package."""
    package_to_command = {
        "python@3.12": "python3",
        "node@22": "node",
        "gh": "gh",
        "git": "git",
        "nvm": "nvm",
        "pnpm": "pnpm",
        "bun": "bun",
        "uv": "uv",
        "go": "go",
        "gopls": "gopls",
        "ripgrep": "rg",
    }
    return package_to_command.get(package, package)


def _install_ripgrep_via_apt() -> bool:
    """Install ripgrep via apt on Debian/Ubuntu Linux."""
    if not is_linux() or not is_apt_available():
        return False
    try:
        subprocess.run(
            ["sudo", "-n", "apt-get", "update", "-qq"],
            capture_output=True,
            check=False,
            stdin=subprocess.DEVNULL,
            timeout=60,
        )
        result = subprocess.run(
            ["sudo", "-n", "apt-get", "install", "-y", "ripgrep"],
            capture_output=True,
            check=False,
            stdin=subprocess.DEVNULL,
            timeout=120,
        )
        return result.returncode == 0
    except (subprocess.SubprocessError, OSError):
        return False


class PrerequisitesStep(BaseStep):
    """Step that installs prerequisite packages for local installations."""

    name = "prerequisites"

    def check(self, ctx: InstallContext) -> bool:
        """Check if this step should be skipped.

        Returns True (skip) if:
        - Running in a dev container
        - Homebrew is available AND all packages are already installed
        """
        if is_in_devcontainer():
            return True

        if not is_homebrew_available():
            return False

        for package in HOMEBREW_PACKAGES:
            if package == "nvm":
                if not _is_nvm_installed():
                    return False
            else:
                cmd = _get_command_for_package(package)
                if not command_exists(cmd):
                    return False

        return True

    def run(self, ctx: InstallContext) -> None:
        """Install Homebrew (if needed) and missing prerequisite packages."""
        ui = ctx.ui

        if not is_homebrew_available():
            if not command_exists("git"):
                if ui:
                    with ui.spinner("Installing git (required by Homebrew)..."):
                        git_ok = _ensure_git_installed()
                    if git_ok:
                        ui.success("git installed")
                    else:
                        ui.warning("Could not install git - please install manually")
                else:
                    _ensure_git_installed()

            if ui:
                ui.info("Homebrew not found, installing...")
                with ui.spinner("Installing Homebrew..."):
                    success = _install_homebrew()
                if success:
                    ui.success("Homebrew installed")
                else:
                    ui.error("Failed to install Homebrew")
                    ui.info("Please install Homebrew manually: https://brew.sh")
                    return
            else:
                if not _install_homebrew():
                    return

        _add_bun_tap()

        for package in HOMEBREW_PACKAGES:
            if package == "nvm":
                is_installed = _is_nvm_installed()
            else:
                cmd = _get_command_for_package(package)
                is_installed = command_exists(cmd)

            if is_installed:
                if ui:
                    ui.info(f"{package} already installed")
                continue

            if ui:
                with ui.spinner(f"Installing {package}..."):
                    success = _install_homebrew_package(package)
                if success:
                    ui.success(f"{package} installed")
                else:
                    ui.warning(f"Could not install {package} - please install manually")
            else:
                _install_homebrew_package(package)

        if not command_exists("rg") and is_linux() and is_apt_available():
            if ui:
                with ui.spinner("Installing ripgrep via apt..."):
                    success = _install_ripgrep_via_apt()
                if success:
                    ui.success("ripgrep installed via apt")
                else:
                    ui.warning("Could not install ripgrep - please run: sudo apt-get install ripgrep")
            else:
                _install_ripgrep_via_apt()
