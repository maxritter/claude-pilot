"""Claude files installation step - installs pilot directory files."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from installer.context import InstallContext
from installer.downloads import (
    DownloadConfig,
    FileInfo,
    download_file,
    download_files_parallel,
    get_repo_files,
)
from installer.steps.base import BaseStep
from installer.steps.settings_merge import (
    cleanup_managed_files,
    load_manifest,
    merge_app_config,
    merge_settings,
    save_manifest,
)

SETTINGS_FILE = "settings.json"
SETTINGS_BASELINE_FILE = ".pilot-settings-baseline.json"
PILOT_MANIFEST_FILE = ".pilot-manifest.json"

REPO_URL = "https://github.com/maxritter/claude-pilot"

SKIP_PATTERNS = (
    "__pycache__",
    ".pyc",
    "/node_modules/",
    "/dist/",
    "/.vite/",
    "/coverage/",
    "/.turbo/",
    ".lock",
    "-lock.yaml",
    ".install-version",
)

SKIP_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp")


def patch_claude_paths(content: str) -> str:
    """Expand ~/.pilot/bin/ paths to absolute paths."""
    home = Path.home()
    abs_bin_path = str(home / ".pilot" / "bin") + "/"
    return content.replace('"~/.pilot/bin/', '"' + abs_bin_path)


def process_settings(settings_content: str) -> str:
    """Process settings JSON - parse and re-serialize with consistent formatting."""
    config: dict[str, Any] = json.loads(settings_content)
    return json.dumps(config, indent=2) + "\n"


def _should_skip_file(file_path: str) -> bool:
    """Check if a file should be skipped during installation."""
    if not file_path:
        return True

    if any(pattern in file_path for pattern in SKIP_PATTERNS):
        return True

    if file_path.endswith(SKIP_EXTENSIONS):
        return True
    if Path(file_path).name == ".gitignore":
        return True

    return False


def _categorize_file(file_path: str) -> str:
    """Determine which category a file belongs to."""
    if file_path == "pilot/settings.json" or file_path.endswith("/settings.json"):
        return "settings"
    elif "/commands/" in file_path:
        return "commands"
    elif "/rules/" in file_path:
        return "rules"
    else:
        return "pilot_plugin"


def _clear_directory_safe(path: Path, ui: Any = None, error_msg: str = "") -> None:
    """Safely remove a directory with error handling."""
    if not path.exists():
        return
    try:
        shutil.rmtree(path)
    except (OSError, IOError) as e:
        if ui and error_msg:
            ui.warning(f"{error_msg}: {e}")


def _clear_directory_contents(path: Path) -> None:
    """Remove contents of a directory but keep the directory."""
    if not path.exists():
        return
    for item in path.iterdir():
        try:
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
        except (OSError, IOError):
            pass


class ClaudeFilesStep(BaseStep):
    """Step that installs pilot directory files from the repository."""

    name = "claude_files"

    def check(self, ctx: InstallContext) -> bool:
        """Check if pilot files are already installed."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Install all pilot files from repository."""
        ui = ctx.ui
        config = self._create_download_config(ctx)

        if ui:
            ui.status("Installing pilot files...")

        pilot_files = get_repo_files("pilot", config)
        if not pilot_files:
            self._handle_no_files(ui, config)
            return

        categories = self._categorize_files(pilot_files, ctx)

        self._cleanup_old_directories(ctx, config, ui)

        installed_files, file_count, failed_files = self._install_categories(categories, ctx, config, ui)

        ctx.config["installed_files"] = installed_files

        self._post_install_processing(ctx, ui)

        self._report_results(ui, file_count, failed_files)

    def _create_download_config(self, ctx: InstallContext) -> DownloadConfig:
        """Create download configuration based on context."""
        repo_branch = "main"
        if ctx.target_version:
            if ctx.target_version.startswith("dev-"):
                repo_branch = ctx.target_version
            else:
                repo_branch = f"v{ctx.target_version}"

        repo_url = self._resolve_repo_url(repo_branch)

        return DownloadConfig(
            repo_url=repo_url,
            repo_branch=repo_branch,
            local_mode=ctx.local_mode,
            local_repo_dir=ctx.local_repo_dir,
        )

    def _resolve_repo_url(self, branch: str) -> str:
        """Return the repository URL."""
        return REPO_URL

    def _handle_no_files(self, ui: Any, config: DownloadConfig) -> None:
        """Handle case when no pilot files are found."""
        if ui:
            ui.warning("No pilot files found in repository")
            if not config.local_mode:
                ui.print("  This may be due to GitHub API rate limiting.")
                ui.print("  Try running with --local flag if you have the repo cloned.")

    def _categorize_files(self, pilot_files: list[FileInfo], ctx: InstallContext) -> dict[str, list[FileInfo]]:
        """Categorize files and filter out ones to skip."""
        categories: dict[str, list[FileInfo]] = {
            "commands": [],
            "rules": [],
            "pilot_plugin": [],
            "settings": [],
        }

        for file_info in pilot_files:
            file_path = file_info.path
            if _should_skip_file(file_path):
                continue

            category = _categorize_file(file_path)
            categories[category].append(file_info)

        return categories

    def _cleanup_old_directories(
        self,
        ctx: InstallContext,
        config: DownloadConfig,
        ui: Any,
    ) -> None:
        """Clean up Pilot-managed files before reinstallation.

        Uses manifests to track which files Pilot installed. Only removes
        Pilot-managed files — user-created files in commands/ and rules/ are preserved.
        """
        home_claude_dir = Path.home() / ".claude"
        home_pilot_plugin_dir = home_claude_dir / "pilot"

        self._cleanup_legacy_standards_skills(home_pilot_plugin_dir)

        source_is_destination = (
            config.local_mode and config.local_repo_dir and config.local_repo_dir.resolve() == ctx.project_dir.resolve()
        )
        if source_is_destination:
            return

        manifest_path = home_claude_dir / PILOT_MANIFEST_FILE
        if not manifest_path.exists():
            self._seed_manifest_from_existing(home_claude_dir, manifest_path)
        cleanup_managed_files(home_claude_dir / "commands", manifest_path, "commands/")
        cleanup_managed_files(home_claude_dir / "rules", manifest_path, "rules/")

        _clear_directory_contents(home_pilot_plugin_dir)

    def _cleanup_legacy_standards_skills(self, plugin_dir: Path) -> None:
        """Remove old standards-* skill directories from plugin skills folder.

        Standards were migrated from pilot/skills/ to pilot/rules/ with frontmatter.
        Runs unconditionally (before source_is_destination check) to clean up stale installs.
        """
        skills_dir = plugin_dir / "skills"
        if not skills_dir.exists():
            return

        for item in skills_dir.iterdir():
            if item.is_dir() and item.name.startswith("standards-"):
                _clear_directory_safe(item)

        if skills_dir.exists() and not any(skills_dir.iterdir()):
            try:
                skills_dir.rmdir()
            except (OSError, IOError):
                pass

    def _seed_manifest_from_existing(self, home_claude_dir: Path, manifest_path: Path) -> None:
        """Seed manifest from existing files for legacy upgrades.

        When upgrading from a pre-manifest Pilot version, no manifest exists yet.
        The old installer nuked these directories entirely, so all existing files
        are Pilot-managed. Seed the manifest with them so cleanup_managed_files
        can remove stale ones while future user-added files remain safe.
        """
        files: set[str] = set()
        for subdir in ("commands", "rules"):
            directory = home_claude_dir / subdir
            if not directory.exists():
                continue
            for item in directory.iterdir():
                if item.name.startswith("."):
                    continue
                files.add(f"{subdir}/{item.name}")
        if files:
            save_manifest(manifest_path, files)

    def _install_categories(
        self,
        categories: dict[str, list[FileInfo]],
        ctx: InstallContext,
        config: DownloadConfig,
        ui: Any,
    ) -> tuple[list[str], int, list[str]]:
        """Install files by category."""
        installed_files: list[str] = []
        file_count = 0
        failed_files: list[str] = []

        category_names = {
            "commands": "slash commands",
            "rules": "standard rules",
            "pilot_plugin": "Pilot plugin files",
            "settings": "settings",
        }

        for category, file_infos in categories.items():
            if not file_infos:
                continue

            count, installed, failed = self._install_category_files(
                category, file_infos, ctx, config, ui, category_names[category]
            )
            file_count += count
            installed_files.extend(installed)
            failed_files.extend(failed)

        return installed_files, file_count, failed_files

    def _install_category_files(
        self,
        category: str,
        file_infos: list[FileInfo],
        ctx: InstallContext,
        config: DownloadConfig,
        ui: Any,
        category_display_name: str,
    ) -> tuple[int, list[str], list[str]]:
        """Install files for a single category."""
        installed: list[str] = []
        failed: list[str] = []

        def install_files() -> None:
            if category == "settings":
                for file_info in file_infos:
                    file_path = file_info.path
                    dest_file = self._get_dest_path(category, file_path, ctx)
                    success = self._install_settings(
                        file_path,
                        dest_file,
                        config,
                    )
                    if success:
                        installed.append(str(dest_file))
                    else:
                        failed.append(file_path)
                return

            dest_paths = [self._get_dest_path(category, fi.path, ctx) for fi in file_infos]
            results = download_files_parallel(file_infos, dest_paths, config)

            for file_info, dest_path, success in zip(file_infos, dest_paths, results):
                if success:
                    installed.append(str(dest_path))
                else:
                    failed.append(file_info.path)

        if ui:
            with ui.spinner(f"Installing {category_display_name}..."):
                install_files()
            ui.success(f"Installed {len(file_infos)} {category_display_name}")
        else:
            install_files()

        return len(installed), installed, failed

    def _get_dest_path(self, category: str, file_path: str, ctx: InstallContext) -> Path:
        """Determine destination path based on category."""
        home_claude_dir = Path.home() / ".claude"
        home_pilot_plugin_dir = home_claude_dir / "pilot"

        if category == "commands":
            rel_path = Path(file_path).relative_to("pilot/commands")
            return home_claude_dir / "commands" / rel_path
        elif category == "rules":
            rel_path = Path(file_path).relative_to("pilot/rules")
            return home_claude_dir / "rules" / rel_path
        elif category == "pilot_plugin":
            rel_path = Path(file_path).relative_to("pilot")
            return home_pilot_plugin_dir / rel_path
        elif category == "settings":
            return home_claude_dir / SETTINGS_FILE
        else:
            return ctx.project_dir / file_path

    def _post_install_processing(self, ctx: InstallContext, ui: Any) -> None:
        """Run post-installation processing tasks."""
        home_pilot_plugin_dir = Path.home() / ".claude" / "pilot"

        self._make_scripts_executable(home_pilot_plugin_dir)

        self._update_lsp_config(home_pilot_plugin_dir)

        if not ctx.local_mode:
            self._update_hooks_config(home_pilot_plugin_dir)

        self._merge_app_config()
        self._cleanup_stale_rules(ctx)
        self._save_pilot_manifest(ctx)

    def _save_pilot_manifest(self, ctx: InstallContext) -> None:
        """Save manifest of Pilot-managed files in commands/ and rules/.

        Records filenames (relative to their directory) so the next update
        can selectively remove only Pilot's files, preserving user files.
        """
        home_claude_dir = Path.home() / ".claude"
        installed = ctx.config.get("installed_files", [])

        commands_dir = home_claude_dir / "commands"
        rules_dir = home_claude_dir / "rules"
        managed_files: set[str] = set()

        for filepath_str in installed:
            filepath = Path(filepath_str)
            try:
                if filepath.is_relative_to(commands_dir):
                    managed_files.add("commands/" + str(filepath.relative_to(commands_dir)))
                elif filepath.is_relative_to(rules_dir):
                    managed_files.add("rules/" + str(filepath.relative_to(rules_dir)))
            except (ValueError, TypeError):
                continue

        save_manifest(home_claude_dir / PILOT_MANIFEST_FILE, managed_files)

    def _make_scripts_executable(self, plugin_dir: Path) -> None:
        """Make script files executable."""
        scripts_dir = plugin_dir / "scripts"
        if not scripts_dir.exists():
            return

        for script in scripts_dir.glob("*.cjs"):
            try:
                current_mode = script.stat().st_mode
                script.chmod(current_mode | 0o111)
            except (OSError, IOError):
                pass

    def _update_lsp_config(self, plugin_dir: Path) -> None:
        """Process LSP config with consistent formatting."""
        lsp_config_path = plugin_dir / ".lsp.json"
        if not lsp_config_path.exists():
            return

        try:
            lsp_config = json.loads(lsp_config_path.read_text())
            lsp_config_path.write_text(json.dumps(lsp_config, indent=2) + "\n")
        except (json.JSONDecodeError, OSError, IOError):
            pass

    def _update_hooks_config(self, plugin_dir: Path) -> None:
        """Process hooks config with path patching and consistent formatting."""
        hooks_json_path = plugin_dir / "hooks" / "hooks.json"
        if not hooks_json_path.exists():
            return

        try:
            hooks_content = hooks_json_path.read_text()
            hooks_content = patch_claude_paths(hooks_content)
            hooks_config = json.loads(hooks_content)
            hooks_json_path.write_text(json.dumps(hooks_config, indent=2) + "\n")
        except (json.JSONDecodeError, OSError, IOError):
            pass

    def _merge_app_config(self) -> None:
        """Merge app-level preferences from pilot/claude.json into ~/.claude.json.

        Uses three-way merge with baseline to preserve user customizations.
        Reads the installed claude.json template and merges its keys into the
        user's ~/.claude.json. Preserves all existing app state (projects,
        oauthAccount, caches, etc.) — only sets/updates keys defined in the template.
        """
        template_path = Path.home() / ".claude" / "pilot" / "claude.json"
        if not template_path.exists():
            return

        claude_json_path = Path.home() / ".claude.json"
        baseline_path = Path.home() / ".claude" / ".pilot-claude-baseline.json"

        try:
            source = json.loads(template_path.read_text())
        except (json.JSONDecodeError, OSError, IOError):
            return

        try:
            target = json.loads(claude_json_path.read_text()) if claude_json_path.exists() else {}
        except (json.JSONDecodeError, OSError, IOError):
            target = {}

        baseline: dict[str, Any] | None = None
        if baseline_path.exists():
            try:
                baseline = json.loads(baseline_path.read_text())
            except (json.JSONDecodeError, OSError, IOError):
                baseline = None

        patched = merge_app_config(target, source, baseline)
        if patched is not None:
            try:
                claude_json_path.write_text(json.dumps(patched, indent=2) + "\n")
            except (OSError, IOError):
                pass

        try:
            baseline_path.parent.mkdir(parents=True, exist_ok=True)
            baseline_path.write_text(json.dumps(source, indent=2) + "\n")
        except (OSError, IOError):
            pass

    def _cleanup_stale_rules(self, ctx: InstallContext) -> None:
        """Remove stale Pilot-managed rule files not present in this installation.

        Only removes files that Pilot previously installed (tracked in manifest)
        but are no longer part of the current installation. User-created rules
        are never touched.
        """
        home_claude_dir = Path.home() / ".claude"
        global_rules_dir = home_claude_dir / "rules"
        if not global_rules_dir.exists():
            return

        manifest_path = home_claude_dir / PILOT_MANIFEST_FILE
        previous_managed = load_manifest(manifest_path)
        installed = {Path(p).resolve() for p in ctx.config.get("installed_files", [])}

        for entry in previous_managed:
            if not entry.startswith("rules/"):
                continue
            relative = entry[len("rules/") :]
            file_path = global_rules_dir / relative
            if file_path.exists() and file_path.resolve() not in installed:
                try:
                    file_path.unlink()
                except (OSError, IOError):
                    pass

    def _report_results(self, ui: Any, file_count: int, failed_files: list[str]) -> None:
        """Report installation results."""
        if not ui:
            return

        if file_count > 0:
            ui.success(f"Installed {file_count} pilot files")
        else:
            ui.warning("No pilot files were installed")

        if failed_files:
            ui.warning(f"Failed to download {len(failed_files)} files")
            for failed in failed_files[:5]:
                ui.print(f"  - {failed}")
            if len(failed_files) > 5:
                ui.print(f"  ... and {len(failed_files) - 5} more")

    def _install_settings(
        self,
        source_path: str,
        dest_path: Path,
        config: DownloadConfig,
    ) -> bool:
        """Download, merge, and install settings to ~/.claude/settings.json.

        Uses three-way merge to preserve user customizations:
        - baseline (~/.claude/.pilot-settings-baseline.json) = what Pilot installed last time
        - current (~/.claude/settings.json) = what's on disk now (may have user changes)
        - incoming (downloaded settings.json) = new Pilot settings
        """
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            temp_file = Path(tmpdir) / "settings.json"
            if not download_file(source_path, temp_file, config):
                return False

            try:
                raw_content = temp_file.read_text()
                processed_content = patch_claude_paths(process_settings(raw_content))
                incoming: dict[str, Any] = json.loads(processed_content)

                dest_path.parent.mkdir(parents=True, exist_ok=True)
                baseline_path = dest_path.parent / SETTINGS_BASELINE_FILE

                current: dict[str, Any] | None = None
                baseline: dict[str, Any] | None = None

                if dest_path.exists():
                    try:
                        current = json.loads(dest_path.read_text())
                    except (json.JSONDecodeError, OSError, IOError):
                        current = None

                if baseline_path.exists():
                    try:
                        baseline = json.loads(baseline_path.read_text())
                    except (json.JSONDecodeError, OSError, IOError):
                        baseline = None

                if current is not None:
                    merged = merge_settings(baseline, current, incoming)
                else:
                    merged = incoming

                dest_path.write_text(json.dumps(merged, indent=2) + "\n")

                baseline_path.write_text(json.dumps(incoming, indent=2) + "\n")

                return True
            except (json.JSONDecodeError, OSError, IOError):
                return False
