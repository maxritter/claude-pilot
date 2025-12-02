"""Config files step - generates settings and merges MCP configs."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING, Any

from installer.downloads import DownloadConfig, download_directory, download_file
from installer.steps.base import BaseStep

if TYPE_CHECKING:
    from installer.context import InstallContext

PYTHON_PERMISSIONS = [
    "Bash(basedpyright:*)",
    "Bash(mypy:*)",
    "Bash(python tests:*)",
    "Bash(python:*)",
    "Bash(pyright:*)",
    "Bash(pytest:*)",
    "Bash(ruff check:*)",
    "Bash(ruff format:*)",
    "Bash(uv add:*)",
    "Bash(uv pip show:*)",
    "Bash(uv pip:*)",
    "Bash(uv run:*)",
]


def merge_mcp_config(config_file: Path, new_config: dict[str, Any]) -> None:
    """Merge new MCP config with existing, preserving existing servers."""
    existing: dict[str, Any] = {}

    if config_file.exists():
        try:
            existing = json.loads(config_file.read_text())
        except json.JSONDecodeError:
            existing = {}

    if "mcpServers" not in existing:
        existing["mcpServers"] = {}

    for server_name, server_config in new_config.get("mcpServers", {}).items():
        if server_name not in existing["mcpServers"]:
            existing["mcpServers"][server_name] = server_config

    config_file.write_text(json.dumps(existing, indent=2) + "\n")


def remove_python_settings(settings: dict[str, Any]) -> None:
    """Remove Python-specific hooks and permissions from settings."""
    if "hooks" in settings and "PostToolUse" in settings["hooks"]:
        for hook_group in settings["hooks"]["PostToolUse"]:
            if "hooks" in hook_group:
                hook_group["hooks"] = [
                    h for h in hook_group["hooks"] if "file_checker_python.py" not in h.get("command", "")
                ]

    if "permissions" in settings and "allow" in settings["permissions"]:
        settings["permissions"]["allow"] = [p for p in settings["permissions"]["allow"] if p not in PYTHON_PERMISSIONS]


class ConfigFilesStep(BaseStep):
    """Step that generates config files and merges MCP configs."""

    name = "config_files"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - settings should always be regenerated from template."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Generate settings and merge MCP configs."""
        ui = ctx.ui
        claude_dir = ctx.project_dir / ".claude"

        template_file = claude_dir / "settings.local.template.json"
        settings_file = claude_dir / "settings.local.json"

        if template_file.exists():
            if ui:
                ui.status("Generating settings.local.json from template...")

            template_content = template_file.read_text()
            settings_content = template_content.replace("{{PROJECT_DIR}}", str(ctx.project_dir))

            try:
                settings = json.loads(settings_content)

                if not ctx.install_python:
                    remove_python_settings(settings)

                settings_file.write_text(json.dumps(settings, indent=2) + "\n")
                if ui:
                    ui.success("Generated settings.local.json")
            except json.JSONDecodeError as e:
                if ui:
                    ui.error(f"Invalid template JSON: {e}")
        else:
            if ui:
                ui.warning("settings.local.template.json not found")

        nvmrc_file = ctx.project_dir / ".nvmrc"
        nvmrc_file.write_text("22\n")
        if ui:
            ui.success("Created .nvmrc for Node.js 22")

        cipher_dir = ctx.project_dir / ".cipher"
        if not cipher_dir.exists():
            if ui:
                ui.status("Installing .cipher configuration...")
            config = DownloadConfig(
                repo_url="https://github.com/maxritter/claude-codepro",
                repo_branch="main",
                local_mode=ctx.local_mode,
                local_repo_dir=ctx.local_repo_dir,
            )
            count = download_directory(".cipher", cipher_dir, config)
            if ui:
                ui.success(f"Installed .cipher directory ({count} files)")

        qlty_dir = ctx.project_dir / ".qlty"
        if not qlty_dir.exists():
            if ui:
                ui.status("Installing .qlty configuration...")
            config = DownloadConfig(
                repo_url="https://github.com/maxritter/claude-codepro",
                repo_branch="main",
                local_mode=ctx.local_mode,
                local_repo_dir=ctx.local_repo_dir,
            )
            count = download_directory(".qlty", qlty_dir, config)
            if ui:
                ui.success(f"Installed .qlty directory ({count} files)")

        config = DownloadConfig(
            repo_url="https://github.com/maxritter/claude-codepro",
            repo_branch="main",
            local_mode=ctx.local_mode,
            local_repo_dir=ctx.local_repo_dir,
        )

        mcp_file = ctx.project_dir / ".mcp.json"
        if ui:
            ui.status("Installing MCP configuration...")
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_mcp = Path(tmpdir) / ".mcp.json"
            if download_file(".mcp.json", temp_mcp, config):
                try:
                    new_config = json.loads(temp_mcp.read_text())
                    merge_mcp_config(mcp_file, new_config)
                    if ui:
                        ui.success("Installed .mcp.json")
                except json.JSONDecodeError as e:
                    if ui:
                        ui.warning(f"Failed to parse .mcp.json: {e}")

        funnel_file = ctx.project_dir / ".mcp-funnel.json"
        if not funnel_file.exists():
            if ui:
                ui.status("Installing MCP Funnel configuration...")
            with tempfile.TemporaryDirectory() as tmpdir:
                temp_funnel = Path(tmpdir) / ".mcp-funnel.json"
                if download_file(".mcp-funnel.json", temp_funnel, config):
                    try:
                        funnel_file.write_text(temp_funnel.read_text())
                        if ui:
                            ui.success("Installed .mcp-funnel.json")
                    except Exception as e:
                        if ui:
                            ui.warning(f"Failed to install .mcp-funnel.json: {e}")
        else:
            if ui:
                ui.success(".mcp-funnel.json already exists, skipping")

    def rollback(self, ctx: InstallContext) -> None:
        """Remove generated config files."""
        settings_file = ctx.project_dir / ".claude" / "settings.local.json"
        if settings_file.exists():
            settings_file.unlink()
