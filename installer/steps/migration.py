"""Migration step - migrates CodePro installations to Pilot."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from installer.context import InstallContext
from installer.steps.base import BaseStep


def _detect_codepro_installation(project_dir: Path) -> bool:
    """Detect if old CodePro installation exists in project directory."""
    old_ccp_dir = project_dir / ".claude" / "ccp"
    old_config = project_dir / ".claude" / "config" / "ccp-config.json"
    old_custom_rules = project_dir / ".claude" / "rules" / "custom"
    old_standard_rules = project_dir / ".claude" / "rules" / "standard"
    return old_ccp_dir.exists() or old_config.exists() or old_custom_rules.exists() or old_standard_rules.exists()


def _detect_global_codepro() -> bool:
    """Detect if old global CodePro config exists."""
    old_global_config = Path.home() / ".claude" / "config" / "ccp-config.json"
    return old_global_config.exists()


def _migrate_global_config() -> dict | None:
    """Migrate global ccp-config.json to ~/.pilot/config.json.

    Returns the migrated config dict if migration occurred, None otherwise.
    """
    old_config_path = Path.home() / ".claude" / "config" / "ccp-config.json"
    new_config_dir = Path.home() / ".pilot"
    new_config_path = new_config_dir / "config.json"

    if not old_config_path.exists():
        return None

    try:
        config = json.loads(old_config_path.read_text())

        new_config_dir.mkdir(parents=True, exist_ok=True)

        if new_config_path.exists():
            existing = json.loads(new_config_path.read_text())
            existing.update(config)
            config = existing

        new_config_path.write_text(json.dumps(config, indent=2) + "\n")

        old_config_path.unlink()
        config_dir = old_config_path.parent
        if config_dir.exists() and not any(config_dir.iterdir()):
            config_dir.rmdir()

        return config
    except (json.JSONDecodeError, OSError, IOError):
        return None


def _migrate_project_config(project_dir: Path) -> dict | None:
    """Migrate project ccp-config.json to ~/.pilot/config.json.

    Returns the migrated config dict if migration occurred, None otherwise.
    """
    old_config_path = project_dir / ".claude" / "config" / "ccp-config.json"
    new_config_dir = Path.home() / ".pilot"
    new_config_path = new_config_dir / "config.json"

    if not old_config_path.exists():
        return None

    try:
        config = json.loads(old_config_path.read_text())

        new_config_dir.mkdir(parents=True, exist_ok=True)

        if new_config_path.exists():
            existing = json.loads(new_config_path.read_text())
            for key, value in config.items():
                if key not in existing:
                    existing[key] = value
            config = existing

        new_config_path.write_text(json.dumps(config, indent=2) + "\n")

        old_config_path.unlink()
        config_dir = old_config_path.parent
        if config_dir.exists() and not any(config_dir.iterdir()):
            config_dir.rmdir()

        return config
    except (json.JSONDecodeError, OSError, IOError):
        return None


def _cleanup_old_folders(project_dir: Path) -> list[str]:
    """Remove old CodePro folders from project directory.

    Returns list of removed folder names.
    """
    removed: list[str] = []

    folders_to_remove = [
        project_dir / ".claude" / "ccp",
        project_dir / ".claude" / "bin",
        project_dir / ".claude" / "installer",
        project_dir / ".claude" / "rules" / "standard",
    ]

    for folder in folders_to_remove:
        if folder.exists():
            try:
                shutil.rmtree(folder)
                removed.append(str(folder.relative_to(project_dir)))
            except (OSError, IOError):
                pass

    old_settings = project_dir / ".claude" / "settings.local.json"
    if old_settings.exists():
        try:
            old_settings.unlink()
            removed.append(str(old_settings.relative_to(project_dir)))
        except (OSError, IOError):
            pass

    return removed


def _cleanup_global_old_folders() -> list[str]:
    """Remove old global CodePro folders.

    Returns list of removed folder paths.
    """
    removed: list[str] = []

    old_bin = Path.home() / ".claude" / "bin"
    if old_bin.exists():
        try:
            shutil.rmtree(old_bin)
            removed.append(str(old_bin))
        except (OSError, IOError):
            pass

    old_config = Path.home() / ".claude" / "config"
    if old_config.exists():
        try:
            if old_config.is_dir() and not any(old_config.iterdir()):
                old_config.rmdir()
                removed.append(str(old_config))
        except (OSError, IOError):
            pass

    return removed


def _migrate_custom_rules(project_dir: Path) -> int:
    """Move custom rules from .claude/rules/custom/ to .claude/rules/.

    Returns count of migrated rules.
    """
    old_custom_dir = project_dir / ".claude" / "rules" / "custom"
    new_rules_dir = project_dir / ".claude" / "rules"

    if not old_custom_dir.exists():
        return 0

    migrated = 0
    new_rules_dir.mkdir(parents=True, exist_ok=True)

    for rule_file in old_custom_dir.glob("*.md"):
        try:
            dest = new_rules_dir / rule_file.name
            if dest.exists():
                continue
            shutil.move(str(rule_file), str(dest))
            migrated += 1
        except (OSError, IOError):
            pass

    gitkeep = old_custom_dir / ".gitkeep"
    if gitkeep.exists():
        try:
            gitkeep.unlink()
        except (OSError, IOError):
            pass

    if old_custom_dir.exists() and not any(old_custom_dir.iterdir()):
        try:
            old_custom_dir.rmdir()
        except (OSError, IOError):
            pass

    return migrated


class MigrationStep(BaseStep):
    """Step that migrates CodePro installations to Pilot."""

    name = "migration"

    def check(self, ctx: InstallContext) -> bool:
        """Check if migration is needed.

        Returns True if no migration needed (already migrated or fresh install).
        """
        has_project_codepro = _detect_codepro_installation(ctx.project_dir)
        has_global_codepro = _detect_global_codepro()
        return not has_project_codepro and not has_global_codepro

    def run(self, ctx: InstallContext) -> None:
        """Run migration from CodePro to Pilot."""
        ui = ctx.ui

        has_project_codepro = _detect_codepro_installation(ctx.project_dir)
        has_global_codepro = _detect_global_codepro()

        if not has_project_codepro and not has_global_codepro:
            return

        if ui:
            ui.status("Migrating from CodePro to Pilot...")

        migrated_config = False
        removed_folders: list[str] = []
        migrated_rules = 0

        if has_global_codepro:
            if _migrate_global_config():
                migrated_config = True
            removed_folders.extend(_cleanup_global_old_folders())

        if has_project_codepro:
            if _migrate_project_config(ctx.project_dir):
                migrated_config = True
            migrated_rules = _migrate_custom_rules(ctx.project_dir)
            removed_folders.extend(_cleanup_old_folders(ctx.project_dir))

        if ui:
            if migrated_config:
                ui.success("Config migrated to ~/.pilot/config.json")
            if migrated_rules > 0:
                ui.success(f"Migrated {migrated_rules} custom rules to .claude/rules/")
            if removed_folders:
                ui.success(f"Cleaned up {len(removed_folders)} old CodePro folders")
            ui.success("Migration complete")

        ctx.config["migration"] = {
            "config_migrated": migrated_config,
            "migrated_rules": migrated_rules,
            "removed_folders": removed_folders,
        }
