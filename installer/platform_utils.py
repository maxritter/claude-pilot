"""Cross-platform utilities for the installer."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


def has_nvidia_gpu() -> bool:
    """Check if NVIDIA GPU is available via nvidia-smi or /dev/nvidia* fallback."""
    try:
        proc = subprocess.run(
            ["nvidia-smi"],
            capture_output=True,
            timeout=10,
        )
        if proc.returncode == 0:
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError, subprocess.SubprocessError):
        pass

    try:
        nvidia_devices = list(Path("/dev").glob("nvidia*"))
        if nvidia_devices:
            return True
    except (OSError, PermissionError):
        pass

    return False


def is_in_devcontainer() -> bool:
    """Check if running inside a dev container."""
    return Path("/.dockerenv").exists() or Path("/run/.containerenv").exists()


def command_exists(command: str) -> bool:
    """Check if a command exists in PATH."""
    return shutil.which(command) is not None


def needs_npm_sudo() -> bool:
    """Check if npm global installs require sudo.

    Returns True when the npm global prefix directory is not writable
    by the current user (e.g. /usr/lib/node_modules on system-wide installs).
    """
    if not command_exists("npm"):
        return False
    try:
        result = subprocess.run(
            ["npm", "prefix", "-g"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return False
        prefix = Path(result.stdout.strip())
        node_modules = prefix / "lib" / "node_modules"
        check_dir = node_modules if node_modules.exists() else prefix
        return not os.access(check_dir, os.W_OK)
    except Exception:
        return False


def npm_global_cmd(cmd: str) -> str:
    """Wrap an npm global command with sudo -n if needed.

    Uses sudo -n (non-interactive) so it fails immediately if a password
    is required, avoiding installer hangs.
    """
    if needs_npm_sudo():
        return f"sudo -n {cmd}"
    return cmd


def is_homebrew_available() -> bool:
    """Check if Homebrew is available."""
    return shutil.which("brew") is not None


def is_apt_available() -> bool:
    """Check if apt is available (Debian/Ubuntu Linux)."""
    return shutil.which("apt-get") is not None


def is_dnf_available() -> bool:
    """Check if dnf is available (RHEL 8+/AlmaLinux/Rocky/Fedora)."""
    return shutil.which("dnf") is not None


def is_yum_available() -> bool:
    """Check if yum is available (older RHEL/CentOS)."""
    return shutil.which("yum") is not None


def is_linux() -> bool:
    """Check if running on Linux."""
    import platform

    return platform.system() == "Linux"


def is_linux_arm64() -> bool:
    """Check if running on Linux ARM64 (aarch64)."""
    import platform

    return platform.system() == "Linux" and platform.machine() in ("aarch64", "arm64")


def is_macos_arm64() -> bool:
    """Check if running on macOS with Apple Silicon (M-series chip)."""
    import platform

    return platform.system() == "Darwin" and platform.machine() == "arm64"


def get_shell_config_files() -> list[Path]:
    """Get list of shell configuration files for the current user."""
    home = Path.home()
    configs = []

    bashrc = home / ".bashrc"
    bash_profile = home / ".bash_profile"
    if bashrc.exists():
        configs.append(bashrc)
    if bash_profile.exists():
        configs.append(bash_profile)

    zshrc = home / ".zshrc"
    if zshrc.exists():
        configs.append(zshrc)

    fish_config = home / ".config" / "fish" / "config.fish"
    if fish_config.exists():
        configs.append(fish_config)

    if not configs:
        configs = [bashrc, zshrc, fish_config]

    return configs
