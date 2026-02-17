"""Download utilities using urllib with progress tracking."""

from __future__ import annotations

import filecmp
import hashlib
import json
import os
import shutil
import ssl
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

MAX_RETRIES = 3
RETRY_BACKOFF = (1.0, 3.0)

_ssl_context: ssl.SSLContext | None = None


def _get_ssl_context() -> ssl.SSLContext:
    """Create SSL context with CA cert fallbacks for macOS, Linux, and containers."""
    global _ssl_context
    if _ssl_context is not None:
        return _ssl_context

    try:
        import certifi

        _ssl_context = ssl.create_default_context(cafile=certifi.where())
        return _ssl_context
    except ImportError:
        pass

    ctx = ssl.create_default_context()

    for ca_path in (
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/tls/certs/ca-bundle.crt",
        "/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem",
        "/etc/ssl/ca-bundle.pem",
        "/etc/ssl/cert.pem",
        "/etc/ca-certificates/extracted/tls-ca-bundle.pem",
        "/opt/homebrew/etc/ca-certificates/cert.pem",
        "/usr/local/etc/openssl@3/cert.pem",
        "/opt/homebrew/etc/openssl@3/cert.pem",
    ):
        if os.path.isfile(ca_path):
            try:
                ctx.load_verify_locations(ca_path)
                _ssl_context = ctx
                return _ssl_context
            except (ssl.SSLError, OSError):
                continue

    _ssl_context = ctx
    return _ssl_context


@dataclass
class DownloadConfig:
    """Configuration for download operations."""

    repo_url: str
    repo_branch: str
    local_mode: bool = False
    local_repo_dir: Path | None = None


@dataclass
class FileInfo:
    """File information including path and optional SHA hash."""

    path: str
    sha: str | None = None


def compute_git_blob_sha(file_path: Path) -> str:
    """Compute git blob SHA1 hash for a file (same algorithm git uses)."""
    content = file_path.read_bytes()
    header = f"blob {len(content)}\0".encode()
    return hashlib.sha1(header + content).hexdigest()


def get_cache_path() -> Path:
    """Get path to the tree cache file."""
    return Path.home() / ".pilot" / "cache" / "tree-cache.json"


def load_tree_cache(cache_path: Path | None = None) -> dict:
    """Load cached tree data from disk."""
    if cache_path is None:
        cache_path = get_cache_path()
    if not cache_path.exists():
        return {}
    try:
        return json.loads(cache_path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def save_tree_cache(cache_path: Path | None, cache_data: dict) -> None:
    """Save tree cache data to disk."""
    if cache_path is None:
        cache_path = get_cache_path()
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache_data, indent=2))


def download_file(
    repo_path: str | FileInfo,
    dest_path: Path,
    config: DownloadConfig,
    progress_callback: Callable[[int, int], None] | None = None,
) -> bool:
    """Download a file from the repository or copy in local mode.

    Skips download if destination file exists and has matching content/hash.
    """
    if isinstance(repo_path, FileInfo):
        file_sha = repo_path.sha
        repo_path = repo_path.path
    else:
        file_sha = None

    dest_path.parent.mkdir(parents=True, exist_ok=True)

    if config.local_mode and config.local_repo_dir:
        source_file = config.local_repo_dir / repo_path
        if source_file.is_file():
            try:
                if source_file.resolve() == dest_path.resolve():
                    return True
                if dest_path.exists() and filecmp.cmp(source_file, dest_path, shallow=False):
                    return True
                shutil.copy2(source_file, dest_path)
                return True
            except (OSError, IOError):
                return False
        return False

    if file_sha and dest_path.exists():
        try:
            local_sha = compute_git_blob_sha(dest_path)
            if local_sha == file_sha:
                return True
        except (OSError, IOError):
            pass

    file_url = f"{config.repo_url}/raw/{config.repo_branch}/{repo_path}"
    for attempt in range(MAX_RETRIES):
        try:
            request = urllib.request.Request(file_url)
            with urllib.request.urlopen(request, timeout=30.0, context=_get_ssl_context()) as response:
                if response.status != 200:
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)])
                        continue
                    return False

                total = int(response.headers.get("content-length", 0))
                downloaded = 0

                with open(dest_path, "wb") as f:
                    while True:
                        chunk = response.read(8192)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback and total > 0:
                            progress_callback(downloaded, total)

            return True
        except (urllib.error.URLError, OSError, TimeoutError):
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)])
                continue
            return False
    return False


def download_files_parallel(
    file_infos: list[FileInfo],
    dest_paths: list[Path],
    config: DownloadConfig,
    max_workers: int = 8,
) -> list[bool]:
    """Download multiple files in parallel using ThreadPoolExecutor.

    Returns a list of booleans indicating success/failure for each file,
    in the same order as the input lists.
    """
    if len(file_infos) != len(dest_paths):
        raise ValueError("file_infos and dest_paths must have the same length")

    if not file_infos:
        return []

    results: list[bool | None] = [None] * len(file_infos)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_index = {
            executor.submit(download_file, file_info, dest_path, config): i
            for i, (file_info, dest_path) in enumerate(zip(file_infos, dest_paths))
        }

        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                results[index] = future.result()
            except Exception:
                results[index] = False

    return [r if r is not None else False for r in results]


def _files_from_cache(cached_files: list[dict], dir_path: str) -> list[FileInfo]:
    """Convert cached file dicts to FileInfo objects, filtering by dir_path."""
    return [FileInfo(path=f["path"], sha=f.get("sha")) for f in cached_files if f.get("path", "").startswith(dir_path)]


def get_repo_files(dir_path: str, config: DownloadConfig) -> list[FileInfo]:
    """Get all files from a repository directory.

    Returns FileInfo objects. Remote mode includes SHA hashes for skip-if-unchanged.
    Local mode has sha=None (uses filecmp for comparison instead).
    Uses ETag caching to avoid re-fetching unchanged data from GitHub API.
    """
    if config.local_mode and config.local_repo_dir:
        source_dir = config.local_repo_dir / dir_path
        if source_dir.is_dir():
            result: list[FileInfo] = []
            for file_path in source_dir.rglob("*"):
                if file_path.is_file():
                    rel_path = file_path.relative_to(config.local_repo_dir)
                    result.append(FileInfo(path=str(rel_path), sha=None))
            return result
        return []

    cache_path = get_cache_path()
    cache = load_tree_cache(cache_path)
    branch_cache = cache.get(config.repo_branch, {})
    cached_etag = branch_cache.get("etag")
    cached_files = branch_cache.get("files", [])

    tree_json_url = f"{config.repo_url}/releases/download/{config.repo_branch}/tree.json"
    try:
        request = urllib.request.Request(tree_json_url)
        with urllib.request.urlopen(request, timeout=30.0, context=_get_ssl_context()) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                remote_files: list[FileInfo] = []
                if "tree" in data:
                    for item in data["tree"]:
                        if item.get("type") == "blob":
                            path = item.get("path", "")
                            sha = item.get("sha")
                            if path.startswith(dir_path):
                                remote_files.append(FileInfo(path=path, sha=sha))
                return remote_files
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        pass

    try:
        repo_path = config.repo_url.replace("https://github.com/", "")
        tree_url = f"https://api.github.com/repos/{repo_path}/git/trees/{config.repo_branch}?recursive=true"

        request = urllib.request.Request(tree_url)
        if cached_etag:
            request.add_header("If-None-Match", cached_etag)

        with urllib.request.urlopen(request, timeout=30.0, context=_get_ssl_context()) as response:
            if response.status != 200:
                return []

            new_etag = response.headers.get("ETag")
            data = json.loads(response.read().decode("utf-8"))

            all_files: list[dict] = []
            remote_files = []
            if "tree" in data:
                for item in data["tree"]:
                    if item.get("type") == "blob":
                        path = item.get("path", "")
                        sha = item.get("sha")
                        all_files.append({"path": path, "sha": sha})
                        if path.startswith(dir_path):
                            remote_files.append(FileInfo(path=path, sha=sha))

            if new_etag and all_files:
                cache[config.repo_branch] = {"etag": new_etag, "files": all_files}
                save_tree_cache(cache_path, cache)

            return remote_files
    except urllib.error.HTTPError as e:
        if e.code == 304 and cached_files:
            return _files_from_cache(cached_files, dir_path)
        return []
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        return []
