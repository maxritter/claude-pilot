"""
File Management Functions - Install and manage Claude CodePro files

Provides file installation and configuration merging capabilities.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from . import downloads, ui


def install_directory(
    repo_dir: str,
    dest_base: Path,
    config: downloads.DownloadConfig,
) -> int:
    """
    Install all files from a repository directory.

    Args:
        repo_dir: Repository directory path (e.g., ".claude")
        dest_base: Destination base directory
        config: Download configuration

    Returns:
        Number of files installed
    """
    ui.print_status(f"Installing {repo_dir} files...")

    file_count = 0
    files = downloads.get_repo_files(repo_dir, config)

    for file_path in files:
        if not file_path:
            continue

        dest_file = dest_base / file_path

        if downloads.download_file(file_path, dest_file, config):
            file_count += 1
            print(f"   ✓ {Path(file_path).name}")

    ui.print_success(f"Installed {file_count} files")
    return file_count


def install_file(
    repo_file: str,
    dest_file: Path,
    config: downloads.DownloadConfig,
) -> bool:
    """
    Install a single file from repository.

    Args:
        repo_file: Repository file path
        dest_file: Destination file path
        config: Download configuration

    Returns:
        True on success, False on failure
    """
    if downloads.download_file(repo_file, dest_file, config):
        ui.print_success(f"Installed {repo_file}")
        return True
    else:
        ui.print_warning(f"Failed to install {repo_file}")
        return False


def merge_mcp_config(
    repo_file: str,
    dest_file: Path,
    config: downloads.DownloadConfig,
    temp_dir: Path,
) -> bool:
    """
    Merge MCP configuration files.

    Preserves existing server configurations while adding new ones.

    Args:
        repo_file: Repository file path (e.g., ".mcp.json")
        dest_file: Destination file path
        config: Download configuration
        temp_dir: Temporary directory for downloads

    Returns:
        True on success, False on failure
    """
    ui.print_status("Installing MCP configuration...")

    temp_file = temp_dir / "mcp-temp.json"

    if not downloads.download_file(repo_file, temp_file, config):
        ui.print_warning(f"Failed to download {repo_file}")
        return False

    if not dest_file.exists():
        _ = shutil.copy2(temp_file, dest_file)
        ui.print_success(f"Created {repo_file}")
        return True

    try:
        with open(dest_file, "r") as f:
            existing_config = json.load(f)

        with open(temp_file, "r") as f:
            new_config = json.load(f)

        server_key = None
        if "mcpServers" in existing_config:
            server_key = "mcpServers"
        elif "servers" in existing_config:
            server_key = "servers"
        elif "mcpServers" in new_config:
            server_key = "mcpServers"
        elif "servers" in new_config:
            server_key = "servers"

        if server_key:
            existing_servers = existing_config.get(server_key, {})
            new_servers = new_config.get(server_key, {})

            merged_servers = {**new_servers, **existing_servers}

            merged_config = {**new_config, **existing_config}
            merged_config[server_key] = merged_servers
        else:
            merged_config = {**new_config, **existing_config}

        with open(dest_file, "w") as f:
            json.dump(merged_config, f, indent=2)
            _ = f.write("\n")

        ui.print_success("Merged MCP servers (preserved existing configuration)")
        return True

    except Exception as e:
        ui.print_warning(f"Failed to merge MCP configuration: {e}, preserving existing")
        return False
