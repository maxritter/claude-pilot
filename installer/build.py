#!/usr/bin/env python3
"""Build script for ccp-installer binary.

Builds standalone executables for distribution using PyInstaller.
Run from the repository root.

Usage:
    python -m installer.build              # CI/CD build with platform suffix
    python -m installer.build --local      # Local build, deploys to .claude/bin
    python -m installer.build --clean      # Clean build directory first
"""

from __future__ import annotations

import argparse
import platform
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

INSTALLER_DIR = Path(__file__).parent
PROJECT_ROOT = INSTALLER_DIR.parent
BUILD_DIR = INSTALLER_DIR / "dist"
BIN_DIR = PROJECT_ROOT / ".claude" / "bin"
INIT_FILE = INSTALLER_DIR / "__init__.py"


def get_current_version() -> str:
    """Read the current version from __init__.py."""
    import re

    content = INIT_FILE.read_text()
    match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
    return match.group(1) if match else "0.0.0"


def get_platform_suffix() -> str:
    """Get platform-specific binary suffix."""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if machine in ("x86_64", "amd64"):
        arch = "x86_64"
    elif machine in ("arm64", "aarch64"):
        arch = "arm64"
    else:
        arch = machine

    return f"{system}-{arch}"


def set_build_timestamp() -> tuple[str, str]:
    """Set build timestamp in __init__.py and return (version, timestamp)."""
    version = get_current_version()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    content = f'''"""Claude CodePro Installer - Professional step-based installation pipeline."""

__version__ = "{version}"
__build__ = "{timestamp}"
'''
    INIT_FILE.write_text(content)
    return version, timestamp


def reset_build_timestamp() -> None:
    """Reset __init__.py to dev mode, preserving version."""
    version = get_current_version()
    content = f'''"""Claude CodePro Installer - Professional step-based installation pipeline."""

__version__ = "{version}"
__build__ = "dev"  # Updated by CI during release builds
'''
    INIT_FILE.write_text(content)


def build_with_pyinstaller(*, local: bool = False) -> Path:
    """Build using PyInstaller."""
    print("Building with PyInstaller...")

    if local:
        output_name = "ccp-installer"
    else:
        output_name = f"ccp-installer-{get_platform_suffix()}"
        if platform.system() == "Windows":
            output_name += ".exe"

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--name",
        output_name,
        "--distpath",
        str(BUILD_DIR),
        "--workpath",
        str(BUILD_DIR / "build"),
        "--specpath",
        str(BUILD_DIR / "build"),
        "--clean",
        "--noconfirm",
        "--hidden-import=rich",
        "--hidden-import=httpx",
        "--hidden-import=typer",
        "--hidden-import=platformdirs",
        str(INSTALLER_DIR / "cli.py"),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr)
        raise subprocess.CalledProcessError(result.returncode, cmd)

    return BUILD_DIR / output_name


def deploy_to_bin(binary: Path) -> Path:
    """Deploy binary to .claude/bin for local testing."""
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    dst = BIN_DIR / binary.name
    print(f"Deploying to {dst}...")
    shutil.copy2(binary, dst)
    dst.chmod(0o755)
    return dst


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Build ccp-installer binary")
    parser.add_argument(
        "--local",
        action="store_true",
        help="Local build: no platform suffix, deploys to .claude/bin",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Clean build directory before building",
    )
    args = parser.parse_args()

    if args.clean and BUILD_DIR.exists():
        print(f"Cleaning {BUILD_DIR}...")
        shutil.rmtree(BUILD_DIR)

    BUILD_DIR.mkdir(parents=True, exist_ok=True)

    # Only set build timestamp for CI/CD builds
    if args.local:
        version = get_current_version()
        print(f"Version: {version}")
        print("Build timestamp: dev (local build)")
    else:
        version, timestamp = set_build_timestamp()
        print(f"Version: {version}")
        print(f"Build timestamp: {timestamp}")

    try:
        output = build_with_pyinstaller(local=args.local)

        print(f"\n✓ Built: {output}")
        print(f"  Size: {output.stat().st_size / 1024 / 1024:.1f} MB")

        if args.local:
            deployed = deploy_to_bin(output)
            print(f"\n✓ Deployed: {deployed}")
            print("\nRestart Claude Code to use the new binary.")

        return 0

    except subprocess.CalledProcessError as e:
        print(f"\n✗ Build failed: {e}", file=sys.stderr)
        return 1

    finally:
        # Only reset if we set it (CI/CD builds)
        if not args.local:
            reset_build_timestamp()


if __name__ == "__main__":
    sys.exit(main())
