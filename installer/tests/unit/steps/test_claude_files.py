"""Tests for pilot files installation step."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch


class TestPatchClaudePaths:
    """Test the patch_claude_paths function."""

    def test_patch_claude_paths_leaves_plugin_path_unchanged(self):
        """patch_claude_paths does NOT expand ~/.claude/pilot (hooks use ${CLAUDE_PLUGIN_ROOT})."""
        from installer.steps.claude_files import patch_claude_paths

        content = '{"command": "~/.claude/pilot/scripts/worker.cjs"}'
        result = patch_claude_paths(content)

        assert content == result

    def test_patch_claude_paths_expands_tilde_bin_path(self):
        """patch_claude_paths expands ~/.pilot/bin/ to absolute path."""
        from pathlib import Path as P

        from installer.steps.claude_files import patch_claude_paths

        content = '{"command": "~/.pilot/bin/pilot statusline"}'
        result = patch_claude_paths(content)

        expected_bin = str(P.home() / ".pilot" / "bin") + "/"
        assert '"~/.pilot/bin/' not in result
        assert expected_bin in result

    def test_patch_claude_paths_only_expands_bin_path(self):
        """patch_claude_paths only expands ~/.pilot/bin/, not ~/.claude/pilot."""
        from pathlib import Path as P

        from installer.steps.claude_files import patch_claude_paths

        content = """{
            "command": "~/.claude/pilot/scripts/worker.cjs",
            "statusLine": {"command": "~/.pilot/bin/pilot statusline"}
        }"""
        result = patch_claude_paths(content)

        expected_bin = str(P.home() / ".pilot" / "bin") + "/"
        assert expected_bin in result
        assert "~/.claude/pilot" in result

    def test_patch_claude_paths_preserves_non_tilde_paths(self):
        """patch_claude_paths leaves non-tilde paths unchanged."""
        from installer.steps.claude_files import patch_claude_paths

        content = '{"path": "/usr/local/bin/something"}'
        result = patch_claude_paths(content)

        assert result == content


class TestProcessSettings:
    """Test the process_settings function."""

    def test_process_settings_round_trips_json(self):
        """process_settings parses and re-serializes JSON with consistent formatting."""
        from installer.steps.claude_files import process_settings

        settings = {"hooks": {"PostToolUse": [{"matcher": "Write", "hooks": []}]}, "model": "opus"}
        result = process_settings(json.dumps(settings))
        parsed = json.loads(result)

        assert parsed == settings
        assert result.endswith("\n")

    def test_process_settings_preserves_all_hooks(self):
        """process_settings preserves all language hooks without filtering."""
        from installer.steps.claude_files import process_settings

        python_hook = "uv run python ~/.claude/pilot/hooks/file_checker_python.py"
        ts_hook = "uv run python ~/.claude/pilot/hooks/file_checker_ts.py"
        go_hook = "uv run python ~/.claude/pilot/hooks/file_checker_go.py"
        settings = {
            "hooks": {
                "PostToolUse": [
                    {
                        "matcher": "Write|Edit|MultiEdit",
                        "hooks": [
                            {"type": "command", "command": python_hook},
                            {"type": "command", "command": ts_hook},
                            {"type": "command", "command": go_hook},
                        ],
                    }
                ]
            }
        }

        result = process_settings(json.dumps(settings))
        parsed = json.loads(result)

        hooks = parsed["hooks"]["PostToolUse"][0]["hooks"]
        assert len(hooks) == 3


class TestClaudeFilesStep:
    """Test ClaudeFilesStep class."""

    def test_claude_files_step_has_correct_name(self):
        """ClaudeFilesStep has name 'claude_files'."""
        from installer.steps.claude_files import ClaudeFilesStep

        step = ClaudeFilesStep()
        assert step.name == "claude_files"

    def test_claude_files_check_returns_false_when_empty(self):
        """ClaudeFilesStep.check returns False when no files installed."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )
            assert step.check(ctx) is False

    def test_claude_files_run_installs_files(self):
        """ClaudeFilesStep.run installs pilot files."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            source_pilot = Path(tmpdir) / "source" / "pilot"
            source_pilot.mkdir(parents=True)
            (source_pilot / "test.md").write_text("test content")
            (source_pilot / "rules").mkdir()
            (source_pilot / "rules" / "rule.md").write_text("rule content")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir) / "source",
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert (home_dir / ".claude" / "rules" / "rule.md").exists()

    def test_claude_files_installs_settings(self):
        """ClaudeFilesStep installs settings to ~/.claude/settings.json."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            source_pilot = Path(tmpdir) / "source" / "pilot"
            source_pilot.mkdir(parents=True)
            (source_pilot / "settings.json").write_text('{"hooks": {}}')

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir) / "source",
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert (home_dir / ".claude" / "settings.json").exists()
            assert not (dest_dir / ".claude" / "settings.local.json").exists()


class TestClaudeFilesCustomRulesPreservation:
    """Test that standard rules from repo are installed and project rules preserved."""

    def test_standard_rules_installed_and_project_rules_preserved(self):
        """ClaudeFilesStep installs repo standard rules to ~/.claude and preserves project rules."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            source_pilot = Path(tmpdir) / "source" / "pilot"
            source_rules = source_pilot / "rules"
            source_rules.mkdir(parents=True)

            (source_rules / "python-rules.md").write_text("python rules from repo")
            (source_rules / "standard-rule.md").write_text("standard rule")

            dest_dir = Path(tmpdir) / "dest"
            dest_claude = dest_dir / ".claude"
            dest_rules = dest_claude / "rules"
            dest_rules.mkdir(parents=True)
            (dest_rules / "my-project-rules.md").write_text("USER PROJECT RULES - PRESERVED")

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir) / "source",
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert (dest_rules / "my-project-rules.md").exists()
            assert (dest_rules / "my-project-rules.md").read_text() == "USER PROJECT RULES - PRESERVED"

            global_rules = home_dir / ".claude" / "rules"
            assert (global_rules / "python-rules.md").exists()
            assert (global_rules / "python-rules.md").read_text() == "python rules from repo"
            assert (global_rules / "standard-rule.md").exists()

    def test_pycache_files_not_copied(self):
        """ClaudeFilesStep skips __pycache__ directories and .pyc files."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            source_pilot = Path(tmpdir) / "source" / "pilot"
            source_rules = source_pilot / "rules"
            source_pycache = source_rules / "__pycache__"
            source_pycache.mkdir(parents=True)
            (source_rules / "test-rule.md").write_text("# rule")
            (source_pycache / "something.cpython-312.pyc").write_text("bytecode")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir) / "source",
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            global_rules = home_dir / ".claude" / "rules"
            assert (global_rules / "test-rule.md").exists()
            assert not (global_rules / "__pycache__").exists()


class TestDirectoryClearing:
    """Test directory clearing behavior in local and normal mode."""

    def test_clears_managed_files_preserves_user_files(self):
        """Pilot-managed rules are removed on update; user-created files are preserved."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            old_global_rules = home_dir / ".claude" / "rules"
            old_global_rules.mkdir(parents=True)
            (old_global_rules / "old-rule.md").write_text("old Pilot rule to be removed")
            (old_global_rules / "my-custom-rule.md").write_text("user-created rule")

            manifest_path = home_dir / ".claude" / ".pilot-manifest.json"
            manifest_path.write_text(json.dumps({"files": ["rules/old-rule.md"]}, indent=2))

            source_dir = Path(tmpdir) / "source"
            source_pilot = source_dir / "pilot"
            source_rules = source_pilot / "rules"
            source_rules.mkdir(parents=True)
            (source_rules / "new-rule.md").write_text("new rule content")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=source_dir,
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            global_rules = home_dir / ".claude" / "rules"
            assert (global_rules / "new-rule.md").exists()
            assert (global_rules / "new-rule.md").read_text() == "new rule content"
            assert not (global_rules / "old-rule.md").exists()
            assert (global_rules / "my-custom-rule.md").exists()
            assert (global_rules / "my-custom-rule.md").read_text() == "user-created rule"

    def test_legacy_upgrade_seeds_manifest_and_cleans_old_files(self):
        """Pre-manifest upgrade: old Pilot files are seeded into manifest and cleaned up."""
        from installer.context import InstallContext
        from installer.steps.claude_files import PILOT_MANIFEST_FILE, ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            old_global_rules = home_dir / ".claude" / "rules"
            old_global_rules.mkdir(parents=True)
            (old_global_rules / "old-pilot-rule.md").write_text("old Pilot rule")
            (old_global_rules / "another-old-rule.md").write_text("another old rule")

            old_global_cmds = home_dir / ".claude" / "commands"
            old_global_cmds.mkdir(parents=True)
            (old_global_cmds / "old-cmd.md").write_text("old Pilot command")

            manifest_path = home_dir / ".claude" / PILOT_MANIFEST_FILE
            assert not manifest_path.exists()

            source_dir = Path(tmpdir) / "source"
            source_pilot = source_dir / "pilot"
            source_rules = source_pilot / "rules"
            source_rules.mkdir(parents=True)
            (source_rules / "new-rule.md").write_text("new rule content")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=source_dir,
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            global_rules = home_dir / ".claude" / "rules"
            assert (global_rules / "new-rule.md").exists()
            assert not (global_rules / "old-pilot-rule.md").exists()
            assert not (global_rules / "another-old-rule.md").exists()
            assert not (old_global_cmds / "old-cmd.md").exists()
            assert manifest_path.exists()

    def test_skips_clearing_when_source_equals_destination(self):
        """Directories are NOT cleared when source == destination (same dir)."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            pilot_dir = Path(tmpdir) / "pilot"
            rules_dir = pilot_dir / "rules"
            rules_dir.mkdir(parents=True)
            (rules_dir / "existing-rule.md").write_text("existing rule content")

            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert (home_dir / ".claude" / "rules" / "existing-rule.md").exists()

    def test_stale_managed_rules_removed_when_source_equals_destination(self):
        """Stale Pilot-managed rules are removed even when source == destination."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            global_rules = home_dir / ".claude" / "rules"
            global_rules.mkdir(parents=True)
            (global_rules / "old-deleted-rule.md").write_text("stale rule from previous install")

            manifest_path = home_dir / ".claude" / ".pilot-manifest.json"
            manifest_path.write_text(json.dumps({"files": ["rules/old-deleted-rule.md"]}, indent=2))

            pilot_dir = Path(tmpdir) / "pilot"
            rules_dir = pilot_dir / "rules"
            rules_dir.mkdir(parents=True)
            (rules_dir / "current-rule.md").write_text("current rule content")

            ctx = InstallContext(
                project_dir=Path(tmpdir),
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert (global_rules / "current-rule.md").exists()
            assert not (global_rules / "old-deleted-rule.md").exists()

    def test_project_rules_never_cleared(self):
        """Project rules directory is NEVER cleared, only global standard rules."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            source_dir = Path(tmpdir) / "source"
            source_pilot = source_dir / "pilot"
            source_rules = source_pilot / "rules"
            source_rules.mkdir(parents=True)
            (source_rules / "new-rule.md").write_text("new standard rule")

            dest_dir = Path(tmpdir) / "dest"
            dest_claude = dest_dir / ".claude"
            dest_project_rules = dest_claude / "rules"
            dest_project_rules.mkdir(parents=True)
            (dest_project_rules / "my-project.md").write_text("USER PROJECT RULE")

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=source_dir,
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert (dest_project_rules / "my-project.md").exists()
            assert (dest_project_rules / "my-project.md").read_text() == "USER PROJECT RULE"

            global_rules = home_dir / ".claude" / "rules"
            assert (global_rules / "new-rule.md").exists()

    def test_standard_commands_are_cleared(self):
        """Global commands directory is cleared and replaced with new commands."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            old_global_commands = home_dir / ".claude" / "commands"
            old_global_commands.mkdir(parents=True)
            (old_global_commands / "spec.md").write_text("old spec command")
            (old_global_commands / "plan.md").write_text("old plan command")

            source_dir = Path(tmpdir) / "source"
            source_pilot = source_dir / "pilot"
            source_commands = source_pilot / "commands"
            source_commands.mkdir(parents=True)
            (source_commands / "spec.md").write_text("new spec command")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=source_dir,
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            global_commands = home_dir / ".claude" / "commands"
            assert (global_commands / "spec.md").exists()
            assert (global_commands / "spec.md").read_text() == "new spec command"

    def test_pilot_plugin_folder_is_installed(self):
        """ClaudeFilesStep installs pilot plugin folder to ~/.claude/pilot/ (global)."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()

            source_dir = Path(tmpdir) / "source"
            source_pilot = source_dir / "pilot"
            source_pilot.mkdir(parents=True)
            (source_pilot / "package.json").write_text('{"name": "pilot"}')
            (source_pilot / "plugin.json").write_text('{"version": "1.0"}')
            (source_pilot / ".mcp.json").write_text('{"servers": []}')
            (source_pilot / ".lsp.json").write_text('{"python": {}}')
            (source_pilot / "scripts").mkdir()
            (source_pilot / "scripts" / "mcp-server.cjs").write_text("// mcp server")
            (source_pilot / "hooks").mkdir()
            (source_pilot / "hooks" / "hook.py").write_text("# hook")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=source_dir,
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            global_pilot = home_dir / ".claude" / "pilot"
            assert (global_pilot / "package.json").exists()
            assert (global_pilot / "plugin.json").exists()
            assert (global_pilot / ".mcp.json").exists()
            assert (global_pilot / ".lsp.json").exists()
            assert (global_pilot / "scripts" / "mcp-server.cjs").exists()
            assert (global_pilot / "hooks" / "hook.py").exists()



class TestMergeAppConfig:
    """Test merging pilot/claude.json app preferences into ~/.claude.json."""

    def test_merge_sets_new_keys(self):
        """Keys in source that don't exist in target are added."""
        from installer.steps.settings_merge import merge_app_config

        target = {"numStartups": 500, "oauthAccount": {"email": "x"}}
        source = {"autoCompactEnabled": True, "theme": "dark"}

        result = merge_app_config(target, source)

        assert result is not None
        assert result["autoCompactEnabled"] is True
        assert result["theme"] == "dark"
        assert result["numStartups"] == 500
        assert result["oauthAccount"] == {"email": "x"}

    def test_merge_updates_existing_keys(self):
        """Keys in source that exist in target are updated to source value."""
        from installer.steps.settings_merge import merge_app_config

        target = {"autoCompactEnabled": False, "verbose": False}
        source = {"autoCompactEnabled": True, "verbose": True}

        result = merge_app_config(target, source)

        assert result is not None
        assert result["autoCompactEnabled"] is True
        assert result["verbose"] is True

    def test_merge_preserves_all_other_keys(self):
        """Keys not in source are never touched."""
        from installer.steps.settings_merge import merge_app_config

        target = {
            "numStartups": 500,
            "oauthAccount": {"email": "x"},
            "projects": {"path": {}},
            "skillUsage": {"spec": 10},
            "cachedGrowthBookFeatures": {"flag": True},
        }
        source = {"theme": "dark"}

        result = merge_app_config(target, source)

        assert result is not None
        assert result["numStartups"] == 500
        assert result["oauthAccount"] == {"email": "x"}
        assert result["projects"] == {"path": {}}
        assert result["skillUsage"] == {"spec": 10}
        assert result["cachedGrowthBookFeatures"] == {"flag": True}

    def test_merge_returns_none_when_no_changes(self):
        """Returns None when all source keys already match target values."""
        from installer.steps.settings_merge import merge_app_config

        target = {"autoCompactEnabled": True, "theme": "dark", "numStartups": 500}
        source = {"autoCompactEnabled": True, "theme": "dark"}

        result = merge_app_config(target, source)

        assert result is None

    def test_integration_merges_claude_json(self):
        """Installer merges pilot/claude.json preferences into ~/.claude.json."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()
            (home_dir / ".claude").mkdir(parents=True)

            claude_json_path = home_dir / ".claude.json"
            claude_json_path.write_text(
                json.dumps(
                    {
                        "numStartups": 500,
                        "autoCompactEnabled": False,
                        "oauthAccount": {"email": "user@test.com"},
                        "projects": {},
                    },
                    indent=2,
                )
                + "\n"
            )

            source_pilot = Path(tmpdir) / "source" / "pilot"
            source_pilot.mkdir(parents=True)
            (source_pilot / "settings.json").write_text(
                json.dumps({"env": {"X": "1"}, "permissions": {"allow": [], "deny": []}}, indent=2)
            )
            (source_pilot / "claude.json").write_text(
                json.dumps(
                    {
                        "autoCompactEnabled": True,
                        "theme": "dark",
                        "verbose": True,
                    },
                    indent=2,
                )
            )

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir) / "source",
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            patched = json.loads(claude_json_path.read_text())

            assert patched["autoCompactEnabled"] is True
            assert patched["theme"] == "dark"
            assert patched["verbose"] is True
            assert patched["numStartups"] == 500
            assert patched["oauthAccount"] == {"email": "user@test.com"}
            assert patched["projects"] == {}

    def test_creates_claude_json_if_missing(self):
        """Installer creates ~/.claude.json if it doesn't exist."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()
            (home_dir / ".claude").mkdir(parents=True)

            source_pilot = Path(tmpdir) / "source" / "pilot"
            source_pilot.mkdir(parents=True)
            (source_pilot / "settings.json").write_text(
                json.dumps({"env": {"X": "1"}, "permissions": {"allow": [], "deny": []}}, indent=2)
            )
            (source_pilot / "claude.json").write_text(
                json.dumps({"autoCompactEnabled": True, "theme": "dark"}, indent=2)
            )

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir) / "source",
            )

            claude_json_path = home_dir / ".claude.json"
            assert not claude_json_path.exists()

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert claude_json_path.exists()
            patched = json.loads(claude_json_path.read_text())
            assert patched["autoCompactEnabled"] is True
            assert patched["theme"] == "dark"

    def test_no_crash_when_claude_json_template_missing(self):
        """Installer skips merge when pilot/claude.json was not installed."""
        from installer.context import InstallContext
        from installer.steps.claude_files import ClaudeFilesStep
        from installer.ui import Console

        step = ClaudeFilesStep()
        with tempfile.TemporaryDirectory() as tmpdir:
            home_dir = Path(tmpdir) / "home"
            home_dir.mkdir()
            (home_dir / ".claude").mkdir(parents=True)

            source_pilot = Path(tmpdir) / "source" / "pilot"
            source_pilot.mkdir(parents=True)
            (source_pilot / "settings.json").write_text(
                json.dumps({"env": {"X": "1"}, "permissions": {"allow": [], "deny": []}}, indent=2)
            )

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            ctx = InstallContext(
                project_dir=dest_dir,
                ui=Console(non_interactive=True),
                local_mode=True,
                local_repo_dir=Path(tmpdir) / "source",
            )

            with patch("installer.steps.claude_files.Path.home", return_value=home_dir):
                step.run(ctx)

            assert not (home_dir / ".claude.json").exists()


class TestMergeSettings:
    """Tests for three-way settings merge."""

    def test_first_install_uses_incoming(self):
        """Without baseline or current, incoming settings are used as-is."""
        from installer.steps.settings_merge import merge_settings

        incoming = {
            "env": {"A": "1", "B": "2"},
            "permissions": {"allow": ["Bash", "Edit"], "deny": []},
            "spinnerTipsEnabled": False,
        }
        result = merge_settings(None, {}, incoming)

        assert result["env"] == {"A": "1", "B": "2"}
        assert result["permissions"]["allow"] == ["Bash", "Edit"]
        assert result["spinnerTipsEnabled"] is False

    def test_preserves_user_added_permissions(self):
        """User-added permissions survive an update."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"permissions": {"allow": ["Bash", "Edit"], "deny": []}}
        current = {"permissions": {"allow": ["Bash", "Edit", "mcp__typefully__*"], "deny": []}}
        incoming = {"permissions": {"allow": ["Bash", "Edit", "LSP"], "deny": []}}

        result = merge_settings(baseline, current, incoming)

        assert "mcp__typefully__*" in result["permissions"]["allow"]
        assert "LSP" in result["permissions"]["allow"]
        assert "Bash" in result["permissions"]["allow"]

    def test_preserves_user_removed_permissions(self):
        """If user deliberately removed a Pilot permission, it stays removed."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"permissions": {"allow": ["Bash", "Edit", "WebFetch"], "deny": []}}
        current = {"permissions": {"allow": ["Bash", "Edit"], "deny": []}}
        incoming = {"permissions": {"allow": ["Bash", "Edit", "WebFetch", "LSP"], "deny": []}}

        result = merge_settings(baseline, current, incoming)

        assert "WebFetch" not in result["permissions"]["allow"]
        assert "LSP" in result["permissions"]["allow"]

    def test_preserves_user_changed_env_var(self):
        """If user changed an env var value, Pilot doesn't overwrite it."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"env": {"DISABLE_TELEMETRY": "true", "ENABLE_LSP_TOOL": "true"}}
        current = {"env": {"DISABLE_TELEMETRY": "false", "ENABLE_LSP_TOOL": "true"}}
        incoming = {"env": {"DISABLE_TELEMETRY": "true", "ENABLE_LSP_TOOL": "true", "NEW_VAR": "1"}}

        result = merge_settings(baseline, current, incoming)

        assert result["env"]["DISABLE_TELEMETRY"] == "false"
        assert result["env"]["NEW_VAR"] == "1"
        assert result["env"]["ENABLE_LSP_TOOL"] == "true"

    def test_preserves_user_only_keys(self):
        """Keys the user added that Pilot doesn't manage are preserved."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"spinnerTipsEnabled": False}
        current = {"spinnerTipsEnabled": False, "myCustomKey": "hello"}
        incoming = {"spinnerTipsEnabled": False}

        result = merge_settings(baseline, current, incoming)

        assert result["myCustomKey"] == "hello"

    def test_adds_new_pilot_keys(self):
        """New keys from Pilot are added on update."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"env": {"A": "1"}}
        current = {"env": {"A": "1"}}
        incoming = {"env": {"A": "1", "B": "2"}, "newFeature": True}

        result = merge_settings(baseline, current, incoming)

        assert result["env"]["B"] == "2"
        assert result["newFeature"] is True

    def test_updates_unchanged_scalars(self):
        """Scalar values the user didn't touch get updated to new Pilot values."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"alwaysThinkingEnabled": False}
        current = {"alwaysThinkingEnabled": False}
        incoming = {"alwaysThinkingEnabled": True}

        result = merge_settings(baseline, current, incoming)

        assert result["alwaysThinkingEnabled"] is True

    def test_preserves_user_changed_scalar(self):
        """Scalar values the user changed from baseline are kept."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"alwaysThinkingEnabled": True}
        current = {"alwaysThinkingEnabled": False}
        incoming = {"alwaysThinkingEnabled": True}

        result = merge_settings(baseline, current, incoming)

        assert result["alwaysThinkingEnabled"] is False

    def test_preserves_user_added_env_vars(self):
        """User-added env vars not in Pilot's set are preserved."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"env": {"A": "1"}}
        current = {"env": {"A": "1", "MY_CUSTOM_VAR": "yes"}}
        incoming = {"env": {"A": "1"}}

        result = merge_settings(baseline, current, incoming)

        assert result["env"]["MY_CUSTOM_VAR"] == "yes"

    def test_pilot_removed_key_dropped_when_user_unchanged(self):
        """Key Pilot previously managed and user didn't change is removed when Pilot drops it."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"spinnerTipsEnabled": False, "model": "sonnet"}
        current = {"spinnerTipsEnabled": False, "model": "sonnet"}
        incoming = {"spinnerTipsOverride": {"tips": ["tip1"], "excludeDefault": True}, "model": "sonnet"}

        result = merge_settings(baseline, current, incoming)

        assert "spinnerTipsEnabled" not in result
        assert result["spinnerTipsOverride"] == {"tips": ["tip1"], "excludeDefault": True}

    def test_pilot_removed_key_preserved_when_user_changed(self):
        """Key Pilot managed but user changed is preserved even when Pilot removes it."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"spinnerTipsEnabled": False}
        current = {"spinnerTipsEnabled": True}
        incoming = {"spinnerTipsOverride": {"tips": ["tip1"], "excludeDefault": True}}

        result = merge_settings(baseline, current, incoming)

        assert result["spinnerTipsEnabled"] is True
        assert result["spinnerTipsOverride"] == {"tips": ["tip1"], "excludeDefault": True}

    def test_user_added_key_not_in_baseline_preserved_when_not_in_incoming(self):
        """User-added keys (never in Pilot baseline) are always preserved."""
        from installer.steps.settings_merge import merge_settings

        baseline = {"model": "sonnet"}
        current = {"model": "sonnet", "myCustomKey": "hello"}
        incoming = {"model": "opus"}

        result = merge_settings(baseline, current, incoming)

        assert result["myCustomKey"] == "hello"
        assert result["model"] == "opus"


class TestMergeAppConfigWithBaseline:
    """Tests for merge_app_config with baseline parameter."""

    def test_baseline_preserves_user_changes(self):
        """User changes to ~/.claude.json are preserved when baseline exists."""
        from installer.steps.settings_merge import merge_app_config

        target = {"autoCompactEnabled": False, "verbose": True}
        source = {"autoCompactEnabled": True, "verbose": True, "newKey": "value"}
        baseline = {"autoCompactEnabled": True, "verbose": True}

        result = merge_app_config(target, source, baseline)

        assert result is not None
        assert result["autoCompactEnabled"] is False
        assert result["newKey"] == "value"
        assert result["verbose"] is True

    def test_no_baseline_overwrites_like_before(self):
        """Without baseline (first install), all source keys are applied."""
        from installer.steps.settings_merge import merge_app_config

        target = {"autoCompactEnabled": False}
        source = {"autoCompactEnabled": True}

        result = merge_app_config(target, source, None)

        assert result is not None
        assert result["autoCompactEnabled"] is True


class TestResolveRepoUrl:
    """Tests for _resolve_repo_url method."""

    def test_resolve_repo_url_returns_correct_url(self):
        """_resolve_repo_url returns the repository URL."""
        from installer.steps.claude_files import ClaudeFilesStep

        step = ClaudeFilesStep()
        result = step._resolve_repo_url("v5.0.0")

        assert result == "https://github.com/maxritter/claude-pilot"
