"""Config files step - installs MCP and other config files."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING, Any

from installer.downloads import DownloadConfig, download_directory, download_file
from installer.steps.base import BaseStep

if TYPE_CHECKING:
    from installer.context import InstallContext

REQUIRED_MCP_SERVERS = {"claude-context", "tavily", "Ref"}


def process_lsp_config(lsp_content: str, install_python: bool) -> str:
    """Process LSP JSON, optionally removing Python language server.

    Args:
        lsp_content: Raw JSON content of the LSP config file
        install_python: Whether Python support is being installed

    Returns:
        Processed JSON string with Python entry removed if install_python=False
    """
    config: dict[str, Any] = json.loads(lsp_content)

    if not install_python:
        config.pop("python", None)

    return json.dumps(config, indent=2) + "\n"


def merge_mcp_config(config_file: Path, new_config: dict[str, Any]) -> int:
    """Merge required MCP servers into existing config, preserving user servers.

    Returns the number of servers added.
    """
    existing_config: dict[str, Any] = {"mcpServers": {}}

    if config_file.exists():
        try:
            existing_config = json.loads(config_file.read_text())
        except json.JSONDecodeError:
            existing_config = {"mcpServers": {}}

    if "mcpServers" not in existing_config:
        existing_config["mcpServers"] = {}

    new_servers = new_config.get("mcpServers", {})
    added_count = 0

    for server_key in REQUIRED_MCP_SERVERS:
        if server_key in new_servers and server_key not in existing_config["mcpServers"]:
            existing_config["mcpServers"][server_key] = new_servers[server_key]
            added_count += 1

    config_file.write_text(json.dumps(existing_config, indent=2) + "\n")
    return added_count


class ConfigFilesStep(BaseStep):
    """Step that installs config files."""

    name = "config_files"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - config files should always be updated."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Install MCP and other config files."""
        ui = ctx.ui

        config = DownloadConfig(
            repo_url="https://github.com/maxritter/claude-codepro",
            repo_branch="main",
            local_mode=ctx.local_mode,
            local_repo_dir=ctx.local_repo_dir,
        )

        nvmrc_file = ctx.project_dir / ".nvmrc"
        nvmrc_file.write_text("22\n")
        if ui:
            ui.success("Created .nvmrc for Node.js 22")

        qlty_dir = ctx.project_dir / ".qlty"
        if not qlty_dir.exists():
            if ui:
                with ui.spinner("Installing .qlty configuration..."):
                    count = download_directory(".qlty", qlty_dir, config)
                ui.success(f"Installed .qlty directory ({count} files)")
            else:
                download_directory(".qlty", qlty_dir, config)

        mcp_file = ctx.project_dir / ".mcp.json"
        added_count = 0
        if ui:
            with ui.spinner("Configuring MCP servers..."):
                with tempfile.TemporaryDirectory() as tmpdir:
                    temp_mcp = Path(tmpdir) / ".mcp.json"
                    if download_file(".mcp.json", temp_mcp, config):
                        try:
                            new_config = json.loads(temp_mcp.read_text())
                            added_count = merge_mcp_config(mcp_file, new_config)
                        except json.JSONDecodeError as e:
                            ui.warning(f"Failed to parse .mcp.json: {e}")
            if added_count > 0:
                ui.success(f"Added {added_count} MCP server(s) to .mcp.json")
            else:
                ui.success("MCP servers already configured")
        else:
            with tempfile.TemporaryDirectory() as tmpdir:
                temp_mcp = Path(tmpdir) / ".mcp.json"
                if download_file(".mcp.json", temp_mcp, config):
                    new_config = json.loads(temp_mcp.read_text())
                    merge_mcp_config(mcp_file, new_config)

        lsp_file = ctx.project_dir / ".lsp.json"
        if ui:
            with ui.spinner("Installing LSP configuration..."):
                success = self._install_lsp_config(lsp_file, config, ctx.install_python)
                if success:
                    ui.success("Installed .lsp.json for language servers")
                else:
                    ui.warning("Failed to install .lsp.json")
        else:
            self._install_lsp_config(lsp_file, config, ctx.install_python)

    def _install_lsp_config(
        self,
        dest_path: Path,
        config: DownloadConfig,
        install_python: bool,
    ) -> bool:
        """Download and process LSP config, removing Python if not needed.

        Args:
            dest_path: Local destination path for .lsp.json
            config: Download configuration
            install_python: Whether Python support is being installed

        Returns:
            True if successful, False otherwise
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_file = Path(tmpdir) / ".lsp.json"
            if not download_file(".lsp.json", temp_file, config):
                return False

            try:
                lsp_content = temp_file.read_text()
                processed_content = process_lsp_config(lsp_content, install_python)
                dest_path.write_text(processed_content)
                return True
            except (json.JSONDecodeError, OSError, IOError):
                return False

    def rollback(self, ctx: InstallContext) -> None:
        """Remove generated config files."""
        pass
