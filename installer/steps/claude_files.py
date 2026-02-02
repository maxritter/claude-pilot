"""Claude files installation step - installs pilot directory files."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from installer.context import InstallContext
from installer.downloads import DownloadConfig, FileInfo, download_file, get_repo_files
from installer.steps.base import BaseStep

SETTINGS_FILE = "settings.json"

REPO_URL_PRIMARY = "https://github.com/maxritter/claude-pilot"
REPO_URL_FALLBACK = "https://github.com/maxritter/claude-codepro"

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


def process_settings(
    settings_content: str,
    enable_python: bool,
    enable_typescript: bool,
    enable_golang: bool,
) -> str:
    """Process settings JSON, optionally removing Python/TypeScript/Go-specific hooks."""
    config: dict[str, Any] = json.loads(settings_content)

    files_to_remove: list[str] = []
    if not enable_python:
        files_to_remove.append("file_checker_python.py")
    if not enable_typescript:
        files_to_remove.append("file_checker_ts.py")
    if not enable_golang:
        files_to_remove.append("file_checker_go.py")

    if files_to_remove:
        try:
            for hook_group in config["hooks"]["PostToolUse"]:
                hook_group["hooks"] = [
                    h for h in hook_group["hooks"] if not any(f in h.get("command", "") for f in files_to_remove)
                ]
        except (KeyError, TypeError, AttributeError):
            pass

    return json.dumps(config, indent=2) + "\n"


def _should_skip_file(file_path: str, ctx: InstallContext, hooks_to_skip: list[str]) -> bool:
    """Check if a file should be skipped during installation."""
    if not file_path:
        return True

    if "/hooks/" in file_path and any(h in file_path for h in hooks_to_skip):
        return True

    if any(pattern in file_path for pattern in SKIP_PATTERNS):
        return True

    if file_path.endswith(SKIP_EXTENSIONS):
        return True
    if Path(file_path).name == ".gitignore":
        return True

    if not ctx.enable_python:
        if "file_checker_python.py" in file_path or "python-rules.md" in file_path:
            return True

    if not ctx.enable_typescript:
        if "file_checker_ts.py" in file_path or "typescript-rules.md" in file_path:
            return True

    if not ctx.enable_golang:
        if "file_checker_go.py" in file_path or "golang-rules.md" in file_path:
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

        self._cleanup_old_directories(ctx, config, categories, ui)

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
        """Try primary repo, fallback to secondary if release not found."""
        import urllib.error
        import urllib.request

        for repo_url in [REPO_URL_PRIMARY, REPO_URL_FALLBACK]:
            repo = repo_url.replace("https://github.com/", "")
            api_url = f"https://api.github.com/repos/{repo}/git/refs/tags/{branch}"

            try:
                req = urllib.request.Request(api_url)
                req.add_header("User-Agent", "pilot-installer")
                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status == 200:
                        return repo_url
            except (urllib.error.URLError, TimeoutError, Exception):
                continue

        return REPO_URL_PRIMARY

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

        hooks_to_skip: list[str] = []
        if not ctx.enable_python:
            hooks_to_skip.append("file_checker_python.py")
        if not ctx.enable_typescript:
            hooks_to_skip.append("file_checker_ts.py")
        if not ctx.enable_golang:
            hooks_to_skip.append("file_checker_go.py")

        for file_info in pilot_files:
            file_path = file_info.path
            if _should_skip_file(file_path, ctx, hooks_to_skip):
                continue

            category = _categorize_file(file_path)
            categories[category].append(file_info)

        return categories

    def _cleanup_old_directories(
        self,
        ctx: InstallContext,
        config: DownloadConfig,
        categories: dict[str, list[FileInfo]],
        ui: Any,
    ) -> None:
        """Clean up old installation directories."""
        home_claude_dir = Path.home() / ".claude"
        home_pilot_plugin_dir = home_claude_dir / "pilot"

        source_is_destination = (
            config.local_mode and config.local_repo_dir and config.local_repo_dir.resolve() == ctx.project_dir.resolve()
        )
        if source_is_destination:
            return

        if categories["commands"]:
            _clear_directory_safe(
                home_claude_dir / "commands",
                ui,
                "Failed to clear global commands directory",
            )

        if categories["rules"]:
            _clear_directory_safe(
                home_claude_dir / "rules",
                ui,
                "Failed to clear global rules directory",
            )

        if categories["pilot_plugin"]:
            _clear_directory_contents(home_pilot_plugin_dir)

        self._cleanup_legacy_project_dirs(ctx)

    def _cleanup_legacy_project_dirs(self, ctx: InstallContext) -> None:
        """Remove legacy project-level directories."""
        project_claude_dir = ctx.project_dir / ".claude"

        _clear_directory_safe(project_claude_dir / "rules" / "standard")

        old_commands_dir = project_claude_dir / "commands"
        if old_commands_dir.exists():
            standard_commands = {"spec", "sync", "plan", "implement", "verify", "learn"}
            for cmd_file in old_commands_dir.iterdir():
                if cmd_file.is_file() and cmd_file.suffix == ".md":
                    if cmd_file.stem in standard_commands:
                        try:
                            cmd_file.unlink()
                        except (OSError, IOError):
                            pass
            if old_commands_dir.exists() and not any(old_commands_dir.iterdir()):
                try:
                    old_commands_dir.rmdir()
                except (OSError, IOError):
                    pass

        for old_dir_name in ["pilot", "hooks", "skills", "scripts", "plugin", "ccp"]:
            _clear_directory_safe(project_claude_dir / old_dir_name)

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
            for file_info in file_infos:
                file_path = file_info.path
                dest_file = self._get_dest_path(category, file_path, ctx)

                if category == "settings":
                    success = self._install_settings(
                        file_path,
                        dest_file,
                        config,
                        ctx.enable_python,
                        ctx.enable_typescript,
                        ctx.enable_golang,
                    )
                else:
                    success = download_file(file_info, dest_file, config)

                if success:
                    installed.append(str(dest_file))
                else:
                    failed.append(file_path)

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
            return home_claude_dir / "settings.json"
        else:
            return ctx.project_dir / file_path

    def _post_install_processing(self, ctx: InstallContext, ui: Any) -> None:
        """Run post-installation processing tasks."""
        home_pilot_plugin_dir = Path.home() / ".claude" / "pilot"

        self._make_scripts_executable(home_pilot_plugin_dir)

        self._update_lsp_config(home_pilot_plugin_dir, ctx)

        if not ctx.local_mode:
            self._update_hooks_config(home_pilot_plugin_dir, ctx)

        self._ensure_project_rules_dir(ctx)

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

    def _update_lsp_config(self, plugin_dir: Path, ctx: InstallContext) -> None:
        """Remove disabled languages from LSP config."""
        lsp_config_path = plugin_dir / ".lsp.json"
        if not lsp_config_path.exists():
            return

        try:
            lsp_config = json.loads(lsp_config_path.read_text())
            if not ctx.enable_python and "python" in lsp_config:
                del lsp_config["python"]
            if not ctx.enable_typescript and "typescript" in lsp_config:
                del lsp_config["typescript"]
            if not ctx.enable_golang and "go" in lsp_config:
                del lsp_config["go"]
            lsp_config_path.write_text(json.dumps(lsp_config, indent=2) + "\n")
        except (json.JSONDecodeError, OSError, IOError):
            pass

    def _update_hooks_config(self, plugin_dir: Path, ctx: InstallContext) -> None:
        """Remove disabled language hooks from hooks.json."""
        hooks_json_path = plugin_dir / "hooks" / "hooks.json"
        if not hooks_json_path.exists():
            return

        files_to_remove: list[str] = []
        if not ctx.enable_python:
            files_to_remove.append("file_checker_python.py")
        if not ctx.enable_typescript:
            files_to_remove.append("file_checker_ts.py")
        if not ctx.enable_golang:
            files_to_remove.append("file_checker_go.py")

        hooks_dir = plugin_dir / "hooks"
        for hook_file in files_to_remove:
            hook_path = hooks_dir / hook_file
            if hook_path.exists():
                try:
                    hook_path.unlink()
                except (OSError, IOError):
                    pass

        try:
            hooks_content = hooks_json_path.read_text()
            hooks_content = patch_claude_paths(hooks_content)
            hooks_config = json.loads(hooks_content)

            if files_to_remove:
                hooks_section = hooks_config.get("hooks", {})
                if "PostToolUse" in hooks_section:
                    for hook_group in hooks_section["PostToolUse"]:
                        if "hooks" in hook_group:
                            hook_group["hooks"] = [
                                h
                                for h in hook_group["hooks"]
                                if not any(f in h.get("command", "") for f in files_to_remove)
                            ]

            hooks_json_path.write_text(json.dumps(hooks_config, indent=2) + "\n")
        except (json.JSONDecodeError, OSError, IOError):
            pass

    def _ensure_project_rules_dir(self, ctx: InstallContext) -> None:
        """Ensure project rules directory exists."""
        project_rules_dir = ctx.project_dir / ".claude" / "rules"
        if not project_rules_dir.exists():
            project_rules_dir.mkdir(parents=True, exist_ok=True)
            (project_rules_dir / ".gitkeep").touch()

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
        install_python: bool,
        install_typescript: bool,
        install_golang: bool,
    ) -> bool:
        """Download and process settings file."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            temp_file = Path(tmpdir) / "settings.json"
            if not download_file(source_path, temp_file, config):
                return False

            try:
                settings_content = temp_file.read_text()
                processed_content = process_settings(
                    settings_content, install_python, install_typescript, install_golang
                )
                processed_content = patch_claude_paths(processed_content)
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.write_text(processed_content)
                return True
            except (json.JSONDecodeError, OSError, IOError):
                return False
