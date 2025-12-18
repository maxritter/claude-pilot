"""Bootstrap step - initial setup and upgrade detection."""

from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

from installer.steps.base import BaseStep

if TYPE_CHECKING:
    from installer.context import InstallContext


class BootstrapStep(BaseStep):
    """Bootstrap step that prepares for installation."""

    name = "bootstrap"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - bootstrap always runs."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Set up installation environment."""
        ui = ctx.ui
        claude_dir = ctx.project_dir / ".claude"

        is_upgrade = claude_dir.exists()

        if is_upgrade:
            if ui:
                ui.status(f"Detected existing installation at {claude_dir}")

            ctx.config["is_upgrade"] = True

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
