"""Download utilities using httpx with progress tracking."""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import httpx


@dataclass
class DownloadConfig:
    """Configuration for download operations."""

    repo_url: str
    repo_branch: str
    local_mode: bool = False
    local_repo_dir: Path | None = None


def verify_network(timeout: float = 5.0) -> bool:
    """Quick connectivity check."""
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get("https://api.github.com")
            return response.status_code == 200
    except (httpx.HTTPError, httpx.TimeoutException):
        return False


def download_file(
    repo_path: str,
    dest_path: Path,
    config: DownloadConfig,
    progress_callback: Callable[[int, int], None] | None = None,
) -> bool:
    """Download a file from the repository or copy in local mode."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    if config.local_mode and config.local_repo_dir:
        source_file = config.local_repo_dir / repo_path
        if source_file.is_file():
            try:
                if source_file.resolve() == dest_path.resolve():
                    return True
                shutil.copy2(source_file, dest_path)
                return True
            except (OSError, IOError):
                return False
        return False

    file_url = f"{config.repo_url}/raw/{config.repo_branch}/{repo_path}"
    try:
        with httpx.Client(follow_redirects=True, timeout=30.0) as client:
            with client.stream("GET", file_url) as response:
                if response.status_code != 200:
                    return False

                total = int(response.headers.get("content-length", 0))
                downloaded = 0

                with open(dest_path, "wb") as f:
                    for chunk in response.iter_bytes(chunk_size=8192):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback and total > 0:
                            progress_callback(downloaded, total)

        return True
    except (httpx.HTTPError, httpx.TimeoutException, OSError):
        return False


def get_repo_files(dir_path: str, config: DownloadConfig) -> list[str]:
    """Get all files from a repository directory."""
    if config.local_mode and config.local_repo_dir:
        source_dir = config.local_repo_dir / dir_path
        if source_dir.is_dir():
            files = []
            for file_path in source_dir.rglob("*"):
                if file_path.is_file():
                    rel_path = file_path.relative_to(config.local_repo_dir)
                    files.append(str(rel_path))
            return files
        return []

    try:
        repo_path = config.repo_url.replace("https://github.com/", "")
        tree_url = f"https://api.github.com/repos/{repo_path}/git/trees/{config.repo_branch}?recursive=true"

        with httpx.Client(timeout=30.0) as client:
            response = client.get(tree_url)
            if response.status_code != 200:
                return []

            data = response.json()
            files = []
            if "tree" in data:
                for item in data["tree"]:
                    if item.get("type") == "blob":
                        path = item.get("path", "")
                        if path.startswith(dir_path):
                            files.append(path)
            return files
    except (httpx.HTTPError, json.JSONDecodeError):
        return []


def download_directory(
    repo_dir: str,
    dest_dir: Path,
    config: DownloadConfig,
    exclude_patterns: list[str] | None = None,
    progress_callback: Callable[[int, int], None] | None = None,
) -> int:
    """Download an entire directory from the repository."""
    if exclude_patterns is None:
        exclude_patterns = []

    files = get_repo_files(repo_dir, config)
    count = 0
    total = len(files)

    for i, file_path in enumerate(files):
        if any(pattern.replace("*", "") in file_path for pattern in exclude_patterns):
            continue

        rel_path = Path(file_path).relative_to(repo_dir)
        dest_path = dest_dir / rel_path

        if download_file(file_path, dest_path, config):
            count += 1

        if progress_callback:
            progress_callback(i + 1, total)

    return count


def download_with_retry(
    repo_path: str,
    dest_path: Path,
    config: DownloadConfig,
    max_retries: int = 3,
) -> bool:
    """Download a file with retry logic for transient failures."""
    for _ in range(max_retries):
        if download_file(repo_path, dest_path, config):
            return True
    return False
