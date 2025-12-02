"""Pre-flight checks step - validates prerequisites before installation."""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from installer.errors import PreflightError
from installer.steps.base import BaseStep

if TYPE_CHECKING:
    from installer.context import InstallContext


def check_disk_space(path: Path, min_mb: int = 500) -> bool:
    """Check if path has minimum disk space available."""
    try:
        stat = os.statvfs(path)
        free_mb = (stat.f_bavail * stat.f_frsize) / (1024 * 1024)
        return free_mb >= min_mb
    except (OSError, AttributeError):
        return True


def check_permissions(path: Path) -> bool:
    """Check if path is writable."""
    try:
        if path.exists():
            return os.access(path, os.W_OK)
        parent = path.parent
        while not parent.exists():
            parent = parent.parent
        return os.access(parent, os.W_OK)
    except (OSError, IOError):
        return False


def check_dependencies() -> tuple[bool, list[str]]:
    """Check required system dependencies."""
    required = ["curl", "git"]

    missing = []
    for cmd in required:
        if not shutil.which(cmd):
            missing.append(cmd)

    return len(missing) == 0, missing


def check_python_version(min_version: str = "3.8") -> bool:
    """Check if Python version meets minimum requirements."""
    min_parts = [int(x) for x in min_version.split(".")]
    current_parts = [sys.version_info.major, sys.version_info.minor]

    return current_parts >= min_parts[: len(current_parts)]


class PreflightStep(BaseStep):
    """Pre-flight checks step that validates prerequisites."""

    name = "preflight"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - preflight checks always run."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Execute all pre-flight checks."""
        ui = ctx.ui
        results: list[tuple[str, bool, str]] = []

        if ui:
            ui.status("Checking disk space...")
        disk_ok = check_disk_space(ctx.project_dir, min_mb=500)
        results.append(("Disk Space (500MB)", disk_ok, "Insufficient disk space"))

        if ui:
            ui.status("Checking write permissions...")
        perm_ok = check_permissions(ctx.project_dir)
        results.append(("Write Permissions", perm_ok, f"Cannot write to {ctx.project_dir}"))

        if ui:
            ui.status("Checking dependencies...")
        deps_ok, missing = check_dependencies()
        results.append(("Required Tools", deps_ok, f"Missing: {', '.join(missing)}"))

        if ui:
            ui.status("Checking Python version...")
        python_ok = check_python_version("3.9")
        results.append(("Python 3.9+", python_ok, f"Found Python {sys.version_info.major}.{sys.version_info.minor}"))

        if not ctx.local_mode:
            if ui:
                ui.status("Checking network connectivity...")
            from installer.downloads import verify_network

            network_ok = verify_network()
            if not network_ok and ui:
                ui.warning("Network connectivity check failed - may have issues downloading")

        if ui:
            ui.print()
            for check_name, passed, error_msg in results:
                if passed:
                    ui.success(check_name)
                else:
                    ui.error(f"{check_name}: {error_msg}")
            ui.print()

        critical_failures = [(name, msg) for name, passed, msg in results if not passed]
        if critical_failures:
            failure_msgs = [f"{name}: {msg}" for name, msg in critical_failures]
            raise PreflightError(
                f"Pre-flight checks failed:\n  " + "\n  ".join(failure_msgs),
                check_name="preflight",
            )

    def rollback(self, ctx: InstallContext) -> None:
        """No rollback needed for preflight checks."""
        pass
