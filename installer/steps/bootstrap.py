"""Bootstrap step - initial setup and upgrade detection."""

from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

from installer import __version__
from installer.steps.base import BaseStep

if TYPE_CHECKING:
    from installer.context import InstallContext

VERSION_FILE = ".claude/.installer-version"


class BootstrapStep(BaseStep):
    """Bootstrap step that prepares for installation."""

    name = "bootstrap"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - bootstrap always runs."""
        return False

    def _get_installed_version(self, ctx: InstallContext) -> str | None:
        """Read the previously installed version."""
        version_file = ctx.project_dir / VERSION_FILE
        if version_file.exists():
            try:
                return version_file.read_text().strip()
            except (OSError, IOError):
                pass
        return None

    def _save_version(self, ctx: InstallContext) -> None:
        """Save the current version for future upgrades."""
        version_file = ctx.project_dir / VERSION_FILE
        try:
            version_file.write_text(__version__)
        except (OSError, IOError):
            pass

    def run(self, ctx: InstallContext) -> None:
        """Set up installation environment."""
        ui = ctx.ui
        claude_dir = ctx.project_dir / ".claude"

        is_upgrade = claude_dir.exists()
        old_version = self._get_installed_version(ctx) if is_upgrade else None

        if is_upgrade:
            if ui:
                if old_version:
                    ui.box(
                        f"[bold]Upgrading:[/bold] {old_version} → {__version__}",
                        title="🔄 Upgrade Detected",
                        style="yellow",
                    )
                else:
                    ui.status(f"Detected existing installation at {claude_dir}")

            ctx.config["is_upgrade"] = True

            # Skip backup in local mode (development)
            if not ctx.local_mode:
                backup_name = f".claude.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                backup_path = ctx.project_dir / backup_name

                if ui:
                    ui.status(f"Creating backup at {backup_name}...")

                try:
                    shutil.copytree(claude_dir, backup_path)
                    ctx.config["backup_path"] = str(backup_path)
                    if ui:
                        ui.success(f"Backup created: {backup_name}")
                except (OSError, shutil.Error) as e:
                    if ui:
                        ui.warning(f"Could not create backup: {e}")
        else:
            if ui:
                ui.status("Fresh installation detected")
            ctx.config["is_upgrade"] = False

        claude_dir.mkdir(parents=True, exist_ok=True)

        subdirs = [
            "rules/standard",
            "rules/custom",
            "hooks",
            "commands",
            "skills",
        ]

        for subdir in subdirs:
            (claude_dir / subdir).mkdir(parents=True, exist_ok=True)

        self._save_version(ctx)

        if ui:
            ui.success("Directory structure created")

    def rollback(self, ctx: InstallContext) -> None:
        """Restore from backup if available."""
        backup_path = ctx.config.get("backup_path")
        if backup_path:
            backup = Path(backup_path)
            claude_dir = ctx.project_dir / ".claude"

            if backup.exists():
                if claude_dir.exists():
                    shutil.rmtree(claude_dir)
                shutil.move(str(backup), str(claude_dir))
