"""Tests for installer.steps.migration module."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest


class TestDetectCodeproInstallation:
    """Test _detect_codepro_installation function."""

    def test_detects_old_ccp_directory(self):
        """_detect_codepro_installation returns True when .claude/ccp exists."""
        from installer.steps.migration import _detect_codepro_installation

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            ccp_dir = project_dir / ".claude" / "ccp"
            ccp_dir.mkdir(parents=True)

            assert _detect_codepro_installation(project_dir) is True

    def test_detects_old_config_file(self):
        """_detect_codepro_installation returns True when ccp-config.json exists."""
        from installer.steps.migration import _detect_codepro_installation

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            config_dir = project_dir / ".claude" / "config"
            config_dir.mkdir(parents=True)
            (config_dir / "ccp-config.json").write_text('{"auto_update": true}')

            assert _detect_codepro_installation(project_dir) is True

    def test_returns_false_for_fresh_install(self):
        """_detect_codepro_installation returns False for fresh installation."""
        from installer.steps.migration import _detect_codepro_installation

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            assert _detect_codepro_installation(project_dir) is False


class TestDetectGlobalCodepro:
    """Test _detect_global_codepro function."""

    def test_detects_global_config(self):
        """_detect_global_codepro returns True when global ccp-config.json exists."""
        from installer.steps.migration import _detect_global_codepro

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                config_dir = Path(tmpdir) / ".claude" / "config"
                config_dir.mkdir(parents=True)
                (config_dir / "ccp-config.json").write_text('{"license_key": "test"}')

                assert _detect_global_codepro() is True

    def test_returns_false_when_no_global_config(self):
        """_detect_global_codepro returns False when no global config exists."""
        from installer.steps.migration import _detect_global_codepro

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                assert _detect_global_codepro() is False


class TestMigrateGlobalConfig:
    """Test _migrate_global_config function."""

    def test_migrates_config_to_pilot_directory(self):
        """_migrate_global_config moves config to ~/.pilot/config.json."""
        from installer.steps.migration import _migrate_global_config

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                old_config_dir = Path(tmpdir) / ".claude" / "config"
                old_config_dir.mkdir(parents=True)
                old_config = old_config_dir / "ccp-config.json"
                old_config.write_text('{"auto_update": true, "license_key": "test123"}')

                result = _migrate_global_config()

                assert result == {"auto_update": True, "license_key": "test123"}
                new_config = Path(tmpdir) / ".pilot" / "config.json"
                assert new_config.exists()
                assert json.loads(new_config.read_text()) == {"auto_update": True, "license_key": "test123"}
                assert not old_config.exists()

    def test_merges_with_existing_pilot_config(self):
        """_migrate_global_config merges with existing ~/.pilot/config.json."""
        from installer.steps.migration import _migrate_global_config

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                old_config_dir = Path(tmpdir) / ".claude" / "config"
                old_config_dir.mkdir(parents=True)
                (old_config_dir / "ccp-config.json").write_text('{"license_key": "new-key"}')

                new_config_dir = Path(tmpdir) / ".pilot"
                new_config_dir.mkdir(parents=True)
                (new_config_dir / "config.json").write_text('{"auto_update": false}')

                _migrate_global_config()

                new_config = Path(tmpdir) / ".pilot" / "config.json"
                merged = json.loads(new_config.read_text())
                assert merged["auto_update"] is False
                assert merged["license_key"] == "new-key"

    def test_returns_none_when_no_old_config(self):
        """_migrate_global_config returns None when no old config exists."""
        from installer.steps.migration import _migrate_global_config

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                result = _migrate_global_config()
                assert result is None


class TestMigrateProjectConfig:
    """Test _migrate_project_config function."""

    def test_migrates_project_config(self):
        """_migrate_project_config moves project config to ~/.pilot/config.json."""
        from installer.steps.migration import _migrate_project_config

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                project_dir = Path(tmpdir) / "project"
                project_dir.mkdir()
                config_dir = project_dir / ".claude" / "config"
                config_dir.mkdir(parents=True)
                (config_dir / "ccp-config.json").write_text('{"install_mode": "local"}')

                result = _migrate_project_config(project_dir)

                assert result is not None
                new_config = Path(tmpdir) / ".pilot" / "config.json"
                assert new_config.exists()
                assert "install_mode" in json.loads(new_config.read_text())


class TestCleanupOldFolders:
    """Test _cleanup_old_folders function."""

    def test_removes_ccp_directory(self):
        """_cleanup_old_folders removes .claude/ccp directory."""
        from installer.steps.migration import _cleanup_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            ccp_dir = project_dir / ".claude" / "ccp"
            ccp_dir.mkdir(parents=True)
            (ccp_dir / "package.json").write_text('{"name": "test"}')

            removed = _cleanup_old_folders(project_dir)

            assert not ccp_dir.exists()
            assert ".claude/ccp" in removed

    def test_removes_bin_directory(self):
        """_cleanup_old_folders removes .claude/bin directory."""
        from installer.steps.migration import _cleanup_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            bin_dir = project_dir / ".claude" / "bin"
            bin_dir.mkdir(parents=True)
            (bin_dir / "pilot").write_text("#!/bin/bash")

            removed = _cleanup_old_folders(project_dir)

            assert not bin_dir.exists()
            assert ".claude/bin" in removed

    def test_removes_settings_local_json(self):
        """_cleanup_old_folders removes .claude/settings.local.json."""
        from installer.steps.migration import _cleanup_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            claude_dir = project_dir / ".claude"
            claude_dir.mkdir(parents=True)
            settings = claude_dir / "settings.local.json"
            settings.write_text('{"hooks": {}}')

            removed = _cleanup_old_folders(project_dir)

            assert not settings.exists()
            assert ".claude/settings.local.json" in removed

    def test_removes_standard_rules_directory(self):
        """_cleanup_old_folders removes .claude/rules/standard directory."""
        from installer.steps.migration import _cleanup_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            standard_rules = project_dir / ".claude" / "rules" / "standard"
            standard_rules.mkdir(parents=True)
            (standard_rules / "rule.md").write_text("# Rule")

            removed = _cleanup_old_folders(project_dir)

            assert not standard_rules.exists()
            assert ".claude/rules/standard" in removed

    def test_preserves_custom_rules(self):
        """_cleanup_old_folders preserves .claude/rules/custom directory."""
        from installer.steps.migration import _cleanup_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            custom_rules = project_dir / ".claude" / "rules" / "custom"
            custom_rules.mkdir(parents=True)
            (custom_rules / "my-rule.md").write_text("# My Custom Rule")

            _cleanup_old_folders(project_dir)

            assert custom_rules.exists()
            assert (custom_rules / "my-rule.md").exists()


class TestMigrationStep:
    """Test MigrationStep class."""

    def test_check_returns_true_when_no_migration_needed(self):
        """MigrationStep.check returns True for fresh installation."""
        from installer.context import InstallContext
        from installer.steps.migration import MigrationStep
        from installer.ui import Console

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                project_dir = Path(tmpdir) / "project"
                project_dir.mkdir()
                ctx = InstallContext(
                    project_dir=project_dir,
                    ui=Console(non_interactive=True),
                )
                step = MigrationStep()

                assert step.check(ctx) is True

    def test_check_returns_false_when_migration_needed(self):
        """MigrationStep.check returns False when CodePro installation exists."""
        from installer.context import InstallContext
        from installer.steps.migration import MigrationStep
        from installer.ui import Console

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                project_dir = Path(tmpdir) / "project"
                ccp_dir = project_dir / ".claude" / "ccp"
                ccp_dir.mkdir(parents=True)

                ctx = InstallContext(
                    project_dir=project_dir,
                    ui=Console(non_interactive=True),
                )
                step = MigrationStep()

                assert step.check(ctx) is False

    def test_run_migrates_codepro_to_pilot(self):
        """MigrationStep.run migrates CodePro installation to Pilot."""
        from installer.context import InstallContext
        from installer.steps.migration import MigrationStep
        from installer.ui import Console

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                project_dir = Path(tmpdir) / "project"
                ccp_dir = project_dir / ".claude" / "ccp"
                ccp_dir.mkdir(parents=True)
                (ccp_dir / "package.json").write_text('{"name": "ccp"}')

                config_dir = project_dir / ".claude" / "config"
                config_dir.mkdir(parents=True)
                (config_dir / "ccp-config.json").write_text('{"auto_update": true}')

                ctx = InstallContext(
                    project_dir=project_dir,
                    ui=Console(non_interactive=True),
                )
                step = MigrationStep()
                step.run(ctx)

                assert not ccp_dir.exists()
                assert not (config_dir / "ccp-config.json").exists()
                new_config = Path(tmpdir) / ".pilot" / "config.json"
                assert new_config.exists()
                assert ctx.config.get("migration") is not None

    def test_run_is_idempotent(self):
        """MigrationStep.run is safe to run multiple times."""
        from installer.context import InstallContext
        from installer.steps.migration import MigrationStep
        from installer.ui import Console

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                project_dir = Path(tmpdir) / "project"
                project_dir.mkdir()

                ctx = InstallContext(
                    project_dir=project_dir,
                    ui=Console(non_interactive=True),
                )
                step = MigrationStep()

                step.run(ctx)
                step.run(ctx)


class TestCleanupGlobalOldFolders:
    """Test _cleanup_global_old_folders function."""

    def test_removes_empty_config_directory(self):
        """_cleanup_global_old_folders removes empty ~/.claude/config directory."""
        from installer.steps.migration import _cleanup_global_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                config_dir = Path(tmpdir) / ".claude" / "config"
                config_dir.mkdir(parents=True)

                removed = _cleanup_global_old_folders()

                assert not config_dir.exists()
                assert str(config_dir) in removed

    def test_preserves_non_empty_config_directory(self):
        """_cleanup_global_old_folders preserves ~/.claude/config with user files."""
        from installer.steps.migration import _cleanup_global_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                config_dir = Path(tmpdir) / ".claude" / "config"
                config_dir.mkdir(parents=True)
                (config_dir / "user-settings.json").write_text('{"custom": true}')

                removed = _cleanup_global_old_folders()

                assert config_dir.exists()
                assert (config_dir / "user-settings.json").exists()
                assert str(config_dir) not in removed

    def test_removes_bin_directory(self):
        """_cleanup_global_old_folders removes ~/.claude/bin directory."""
        from installer.steps.migration import _cleanup_global_old_folders

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(Path, "home", return_value=Path(tmpdir)):
                bin_dir = Path(tmpdir) / ".claude" / "bin"
                bin_dir.mkdir(parents=True)
                (bin_dir / "pilot").write_text("#!/bin/bash")

                removed = _cleanup_global_old_folders()

                assert not bin_dir.exists()
                assert str(bin_dir) in removed


class TestMigrateCustomRules:
    """Test _migrate_custom_rules function."""

    def test_does_not_overwrite_existing_rules(self):
        """_migrate_custom_rules skips files that already exist at destination."""
        from installer.steps.migration import _migrate_custom_rules

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            old_custom_dir = project_dir / ".claude" / "rules" / "custom"
            new_rules_dir = project_dir / ".claude" / "rules"
            old_custom_dir.mkdir(parents=True)
            new_rules_dir.mkdir(parents=True, exist_ok=True)

            (old_custom_dir / "my-rule.md").write_text("# Old version")
            (new_rules_dir / "my-rule.md").write_text("# New version - do not overwrite")

            _migrate_custom_rules(project_dir)

            assert (new_rules_dir / "my-rule.md").read_text() == "# New version - do not overwrite"

    def test_migrates_new_rules(self):
        """_migrate_custom_rules moves rules that don't exist at destination."""
        from installer.steps.migration import _migrate_custom_rules

        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            old_custom_dir = project_dir / ".claude" / "rules" / "custom"
            old_custom_dir.mkdir(parents=True)
            (old_custom_dir / "new-rule.md").write_text("# New rule")

            count = _migrate_custom_rules(project_dir)

            new_rules_dir = project_dir / ".claude" / "rules"
            assert count == 1
            assert (new_rules_dir / "new-rule.md").exists()
            assert (new_rules_dir / "new-rule.md").read_text() == "# New rule"
