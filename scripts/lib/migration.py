"""
Migration Functions - Handle upgrades from older versions

Provides migration logic for upgrading from older Claude CodePro versions.
Specifically handles flattening old subdirectory structure (core/workflow/extended)
to the new flat structure.
"""

from __future__ import annotations

import shutil
import sys
import time
from pathlib import Path

from . import ui

OLD_SUBDIRS = ["core", "workflow", "extended"]


def needs_migration(project_dir: Path) -> bool:
    """
    Check if migration is needed.

    Detects old subdirectory structure (core/workflow/extended) in standard/ or custom/.

    Args:
        project_dir: Project directory path

    Returns:
        True if old subdirectories found, False otherwise
    """
    rules_dir = project_dir / ".claude" / "rules"

    if not rules_dir.exists():
        return False

    for source in ["standard", "custom"]:
        source_dir = rules_dir / source
        if not source_dir.exists():
            continue

        for old_subdir in OLD_SUBDIRS:
            if (source_dir / old_subdir).exists():
                return True

    return False


def run_migration(project_dir: Path, non_interactive: bool = False) -> None:
    """
    Run migration - flatten subdirectories in standard/ and custom/.

    Moves .md files from core/workflow/extended subdirectories to parent,
    then removes the empty subdirectories.

    Args:
        project_dir: Project directory path
        non_interactive: Skip interactive prompts
    """
    if not needs_migration(project_dir):
        return

    rules_dir = project_dir / ".claude" / "rules"

    ui.print_section("Migration Required")

    print("Detected old subdirectory structure (core/workflow/extended).")
    print("The new system uses flat directories for rules.")
    print("")
    print("This migration will:")
    print("  1. Create backup at .claude/rules.backup.<timestamp>")
    print("  2. Move all .md files to flat structure")
    print("  3. Remove old subdirectories (core/workflow/extended)")
    print("")

    if not non_interactive:
        if sys.stdin.isatty():
            reply = input("Continue with migration? (Y/n): ").strip()
        else:
            reply = input("Continue with migration? (Y/n): ").strip()
    else:
        reply = "Y"

    print("")

    if not reply:
        reply = "Y"

    if reply.lower() not in ["y", "yes"]:
        ui.print_error("Migration cancelled.")
        print("")
        print("To migrate manually:")
        print("  1. Move .md files from standard/core/, standard/workflow/, etc. to standard/")
        print("  2. Move .md files from custom/core/, custom/workflow/, etc. to custom/")
        print("  3. Remove empty subdirectories")
        print("  4. Re-run installation")
        sys.exit(1)

    # Create backup
    timestamp = int(time.time())
    backup_dir = project_dir / ".claude" / f"rules.backup.{timestamp}"
    ui.print_status(f"Creating backup at {backup_dir.name}...")
    shutil.copytree(rules_dir, backup_dir)
    ui.print_success(f"Backup created at: {backup_dir}")

    # Flatten each source directory
    for source in ["standard", "custom"]:
        source_dir = rules_dir / source
        if not source_dir.exists():
            continue

        for old_subdir in OLD_SUBDIRS:
            subdir_path = source_dir / old_subdir
            if not subdir_path.exists():
                continue

            # Move .md files from subdirectory to parent
            for md_file in subdir_path.glob("*.md"):
                dest = source_dir / md_file.name
                if dest.exists():
                    ui.print_warning(f"Skipping {md_file.name}: already exists in {source}/")
                    continue
                shutil.move(str(md_file), str(dest))
                ui.print_success(f"Moved: {source}/{old_subdir}/{md_file.name} → {source}/{md_file.name}")

            # Remove subdirectory (including any remaining files like .gitkeep)
            if subdir_path.exists():
                shutil.rmtree(subdir_path)
                ui.print_status(f"Removed: {source}/{old_subdir}/")

    # Also remove old config.yaml if it exists (no longer needed)
    config_file = rules_dir / "config.yaml"
    if config_file.exists():
        config_file.unlink()
        ui.print_status("Removed: config.yaml (no longer needed)")

    print("")
    ui.print_success("Migration complete! Rules flattened to new structure.")
    print("")
