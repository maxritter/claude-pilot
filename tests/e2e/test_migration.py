"""E2E tests for migration functionality."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def temp_project():
    """Create a temporary project directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_dir = Path(tmpdir)
        yield project_dir


@pytest.fixture
def project_root():
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent


def setup_migration_module(project_dir: Path, project_root: Path) -> None:
    """Set up migration module for testing."""
    # Copy migration module
    lib_dir = project_dir / "scripts" / "lib"
    lib_dir.mkdir(parents=True)

    # Copy required modules
    for module in ["migration.py", "ui.py", "utils.py", "files.py"]:
        src = project_root / "scripts" / "lib" / module
        dst = lib_dir / module
        dst.write_text(src.read_text())


class TestMigrationDetection:
    """Test migration detection logic."""

    def test_detects_old_subdirectory_structure_in_standard(self, temp_project, project_root):
        """Test that old subdirectory structure (core/) is detected."""
        setup_migration_module(temp_project, project_root)

        # Create old structure with subdirectories
        rules_dir = temp_project / ".claude" / "rules"
        standard_core = rules_dir / "standard" / "core"
        standard_core.mkdir(parents=True)
        (standard_core / "test-rule.md").write_text("# Test")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        result = migration.needs_migration(temp_project)
        assert result is True

    def test_detects_old_subdirectory_structure_workflow(self, temp_project, project_root):
        """Test that old workflow subdirectory is detected."""
        setup_migration_module(temp_project, project_root)

        # Create old structure with workflow subdirectory
        rules_dir = temp_project / ".claude" / "rules"
        standard_workflow = rules_dir / "standard" / "workflow"
        standard_workflow.mkdir(parents=True)
        (standard_workflow / "plan.md").write_text("# Plan")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        result = migration.needs_migration(temp_project)
        assert result is True

    def test_detects_old_subdirectory_structure_extended(self, temp_project, project_root):
        """Test that old extended subdirectory is detected."""
        setup_migration_module(temp_project, project_root)

        # Create old structure with extended subdirectory
        rules_dir = temp_project / ".claude" / "rules"
        standard_extended = rules_dir / "standard" / "extended"
        standard_extended.mkdir(parents=True)
        (standard_extended / "skill.md").write_text("# Skill")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        result = migration.needs_migration(temp_project)
        assert result is True

    def test_detects_old_subdirectory_in_custom(self, temp_project, project_root):
        """Test that old subdirectory structure in custom is detected."""
        setup_migration_module(temp_project, project_root)

        # Create old structure in custom
        rules_dir = temp_project / ".claude" / "rules"
        custom_core = rules_dir / "custom" / "core"
        custom_core.mkdir(parents=True)
        (custom_core / "my-rule.md").write_text("# My Rule")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        result = migration.needs_migration(temp_project)
        assert result is True

    def test_flat_structure_not_needing_migration(self, temp_project, project_root):
        """Test that flat structure is not detected as needing migration."""
        setup_migration_module(temp_project, project_root)

        # Create new flat structure
        rules_dir = temp_project / ".claude" / "rules"
        standard_dir = rules_dir / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "test-rule.md").write_text("# Test")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        result = migration.needs_migration(temp_project)
        assert result is False

    def test_missing_rules_dir_not_needing_migration(self, temp_project, project_root):
        """Test that missing rules directory is not detected as needing migration."""
        setup_migration_module(temp_project, project_root)

        # Don't create any rules directory
        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        result = migration.needs_migration(temp_project)
        assert result is False

    def test_empty_rules_dir_not_needing_migration(self, temp_project, project_root):
        """Test that empty rules directory is not detected as needing migration."""
        setup_migration_module(temp_project, project_root)

        # Create empty rules directory
        rules_dir = temp_project / ".claude" / "rules"
        rules_dir.mkdir(parents=True)

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        result = migration.needs_migration(temp_project)
        assert result is False


class TestMigrationExecution:
    """Test migration execution."""

    def test_creates_backup_directory(self, temp_project, project_root):
        """Test that migration creates backup directory."""
        setup_migration_module(temp_project, project_root)

        # Create old structure
        rules_dir = temp_project / ".claude" / "rules"
        standard_core = rules_dir / "standard" / "core"
        standard_core.mkdir(parents=True)
        (standard_core / "test-rule.md").write_text("Test content")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # Check backup was created
        backups = list((temp_project / ".claude").glob("rules.backup.*"))
        assert len(backups) == 1
        assert backups[0].is_dir()

    def test_backup_contains_original_files(self, temp_project, project_root):
        """Test that backup contains original files."""
        setup_migration_module(temp_project, project_root)

        # Create old structure with files
        rules_dir = temp_project / ".claude" / "rules"
        standard_core = rules_dir / "standard" / "core"
        standard_core.mkdir(parents=True)
        (standard_core / "test-rule.md").write_text("Test rule content")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # Find backup directory
        backups = list((temp_project / ".claude").glob("rules.backup.*"))
        backup_dir = backups[0]

        # Verify files are in backup
        assert (backup_dir / "standard" / "core" / "test-rule.md").exists()
        assert (backup_dir / "standard" / "core" / "test-rule.md").read_text() == "Test rule content"

    def test_flattens_core_subdirectory(self, temp_project, project_root):
        """Test that core subdirectory files are moved to parent."""
        setup_migration_module(temp_project, project_root)

        # Create old structure
        rules_dir = temp_project / ".claude" / "rules"
        standard_core = rules_dir / "standard" / "core"
        standard_core.mkdir(parents=True)
        (standard_core / "test-rule.md").write_text("Test content")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # File should be moved to flat structure
        assert (rules_dir / "standard" / "test-rule.md").exists()
        assert (rules_dir / "standard" / "test-rule.md").read_text() == "Test content"
        # Subdirectory should be removed
        assert not (rules_dir / "standard" / "core").exists()

    def test_flattens_workflow_subdirectory(self, temp_project, project_root):
        """Test that workflow subdirectory files are moved to parent."""
        setup_migration_module(temp_project, project_root)

        # Create old structure
        rules_dir = temp_project / ".claude" / "rules"
        standard_workflow = rules_dir / "standard" / "workflow"
        standard_workflow.mkdir(parents=True)
        (standard_workflow / "plan.md").write_text("Plan content")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # File should be moved to flat structure
        assert (rules_dir / "standard" / "plan.md").exists()
        # Subdirectory should be removed
        assert not (rules_dir / "standard" / "workflow").exists()

    def test_flattens_extended_subdirectory(self, temp_project, project_root):
        """Test that extended subdirectory files are moved to parent."""
        setup_migration_module(temp_project, project_root)

        # Create old structure
        rules_dir = temp_project / ".claude" / "rules"
        standard_extended = rules_dir / "standard" / "extended"
        standard_extended.mkdir(parents=True)
        (standard_extended / "skill.md").write_text("Skill content")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # File should be moved to flat structure
        assert (rules_dir / "standard" / "skill.md").exists()
        # Subdirectory should be removed
        assert not (rules_dir / "standard" / "extended").exists()

    def test_flattens_custom_subdirectories(self, temp_project, project_root):
        """Test that custom subdirectories are also flattened."""
        setup_migration_module(temp_project, project_root)

        # Create old structure in custom
        rules_dir = temp_project / ".claude" / "rules"
        custom_core = rules_dir / "custom" / "core"
        custom_core.mkdir(parents=True)
        (custom_core / "my-rule.md").write_text("My rule content")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # File should be moved to flat structure
        assert (rules_dir / "custom" / "my-rule.md").exists()
        # Subdirectory should be removed
        assert not (rules_dir / "custom" / "core").exists()

    def test_removes_config_yaml(self, temp_project, project_root):
        """Test that config.yaml is removed during migration."""
        setup_migration_module(temp_project, project_root)

        # Create old structure with config.yaml
        rules_dir = temp_project / ".claude" / "rules"
        standard_core = rules_dir / "standard" / "core"
        standard_core.mkdir(parents=True)
        (standard_core / "test-rule.md").write_text("Test content")
        (rules_dir / "config.yaml").write_text("old: config")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # config.yaml should be removed
        assert not (rules_dir / "config.yaml").exists()

    def test_handles_file_conflict(self, temp_project, project_root):
        """Test that file conflicts are handled (file skipped with warning)."""
        setup_migration_module(temp_project, project_root)

        # Create conflict: file exists in both parent and subdirectory
        rules_dir = temp_project / ".claude" / "rules"
        standard_dir = rules_dir / "standard"
        standard_core = standard_dir / "core"
        standard_core.mkdir(parents=True)

        # File in subdirectory
        (standard_core / "conflict.md").write_text("From core")
        # Same file already in parent
        (standard_dir / "conflict.md").write_text("From parent")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # Original parent file should be preserved
        assert (standard_dir / "conflict.md").read_text() == "From parent"
        # Subdirectory should still be removed
        assert not (standard_dir / "core").exists()

    def test_handles_multiple_subdirectories(self, temp_project, project_root):
        """Test that multiple subdirectories are all flattened."""
        setup_migration_module(temp_project, project_root)

        # Create all three old subdirectories
        rules_dir = temp_project / ".claude" / "rules"
        for subdir in ["core", "workflow", "extended"]:
            sub_path = rules_dir / "standard" / subdir
            sub_path.mkdir(parents=True)
            (sub_path / f"{subdir}-rule.md").write_text(f"Content from {subdir}")

        sys.path.insert(0, str(temp_project / "scripts"))
        from lib import migration

        migration.run_migration(temp_project, non_interactive=True)

        # All files should be in flat structure
        standard_dir = rules_dir / "standard"
        assert (standard_dir / "core-rule.md").exists()
        assert (standard_dir / "workflow-rule.md").exists()
        assert (standard_dir / "extended-rule.md").exists()

        # All subdirectories should be removed
        assert not (standard_dir / "core").exists()
        assert not (standard_dir / "workflow").exists()
        assert not (standard_dir / "extended").exists()
