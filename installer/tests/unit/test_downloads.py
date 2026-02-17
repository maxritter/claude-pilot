"""Tests for downloads module."""

from __future__ import annotations

import json
import tempfile
import urllib.error
from pathlib import Path


class TestDownloadConfig:
    """Test DownloadConfig class."""

    def test_download_config_stores_values(self):
        """DownloadConfig stores repository settings."""
        from installer.downloads import DownloadConfig

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="main",
        )
        assert config.repo_url == "https://github.com/test/repo"
        assert config.repo_branch == "main"
        assert config.local_mode is False
        assert config.local_repo_dir is None

    def test_download_config_local_mode(self):
        """DownloadConfig supports local mode."""
        from installer.downloads import DownloadConfig

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="main",
            local_mode=True,
            local_repo_dir=Path("/tmp/repo"),
        )
        assert config.local_mode is True
        assert config.local_repo_dir == Path("/tmp/repo")


class TestDownloadFile:
    """Test download_file function."""

    def test_download_file_creates_parent_dirs(self):
        """download_file creates parent directories."""
        from installer.downloads import DownloadConfig, download_file

        with tempfile.TemporaryDirectory() as tmpdir:
            dest = Path(tmpdir) / "subdir" / "file.txt"
            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )

            source = Path(tmpdir) / "test.txt"
            source.write_text("test content")

            download_file("test.txt", dest, config)
            assert dest.parent.exists()

    def test_download_file_local_mode_copies(self):
        """download_file copies file in local mode."""
        from installer.downloads import DownloadConfig, download_file

        with tempfile.TemporaryDirectory() as tmpdir:
            source_dir = Path(tmpdir) / "source"
            source_dir.mkdir()
            source = source_dir / "test.txt"
            source.write_text("local content")

            dest = Path(tmpdir) / "dest" / "test.txt"
            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=source_dir,
            )

            result = download_file("test.txt", dest, config)
            assert result is True
            assert dest.exists()
            assert dest.read_text() == "local content"

    def test_download_file_returns_false_on_missing_source(self):
        """download_file returns False if source doesn't exist."""
        from installer.downloads import DownloadConfig, download_file

        with tempfile.TemporaryDirectory() as tmpdir:
            dest = Path(tmpdir) / "dest" / "test.txt"
            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )

            result = download_file("nonexistent.txt", dest, config)
            assert result is False


class TestGetRepoFiles:
    """Test get_repo_files function."""

    def test_get_repo_files_local_mode(self):
        """get_repo_files returns FileInfo objects in local mode."""
        from installer.downloads import DownloadConfig, get_repo_files

        with tempfile.TemporaryDirectory() as tmpdir:
            subdir = Path(tmpdir) / "mydir"
            subdir.mkdir()
            (subdir / "file1.txt").write_text("content1")
            (subdir / "file2.txt").write_text("content2")

            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )

            file_infos = get_repo_files("mydir", config)
            assert len(file_infos) == 2
            paths = [f.path for f in file_infos]
            assert "mydir/file1.txt" in paths
            assert "mydir/file2.txt" in paths
            assert all(f.sha is None for f in file_infos)

    def test_get_repo_files_returns_empty_for_missing_dir(self):
        """get_repo_files returns empty list for missing directory."""
        from installer.downloads import DownloadConfig, get_repo_files

        with tempfile.TemporaryDirectory() as tmpdir:
            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )

            files = get_repo_files("nonexistent", config)
            assert files == []


class TestTreeCaching:
    """Test ETag caching for tree API responses."""

    def test_get_cache_path_returns_path_in_pilot_dir(self):
        """get_cache_path returns path under ~/.pilot/cache."""
        from installer.downloads import get_cache_path

        cache_path = get_cache_path()
        assert cache_path.parent.name == "cache"
        assert cache_path.parent.parent.name == ".pilot"

    def test_load_tree_cache_returns_empty_when_no_cache(self):
        """load_tree_cache returns empty dict when cache file doesn't exist."""
        from installer.downloads import load_tree_cache

        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = Path(tmpdir) / "nonexistent.json"
            cache = load_tree_cache(cache_path)
            assert cache == {}

    def test_save_and_load_tree_cache(self):
        """save_tree_cache and load_tree_cache round-trip correctly."""
        from installer.downloads import load_tree_cache, save_tree_cache

        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = Path(tmpdir) / "cache.json"
            cache_data = {
                "main": {
                    "etag": '"abc123"',
                    "files": [{"path": "pilot/test.py", "sha": "def456"}],
                }
            }
            save_tree_cache(cache_path, cache_data)
            loaded = load_tree_cache(cache_path)
            assert loaded == cache_data

    def test_get_repo_files_uses_cached_response_on_304(self):
        """get_repo_files returns cached files when API returns 304."""
        from unittest.mock import patch

        from installer.downloads import DownloadConfig, get_repo_files

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="main",
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = Path(tmpdir) / "cache.json"
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text('{"main": {"etag": "\\"cached-etag\\"", "files": [{"path": "pilot/test.py", "sha": "abc123"}]}}')

            def side_effect(request, *_args, **_kwargs):
                url = request.full_url if hasattr(request, 'full_url') else str(request)
                if 'tree.json' in url:
                    raise urllib.error.HTTPError(url, 404, "Not Found", {}, None)  # type: ignore[arg-type]
                raise urllib.error.HTTPError(url, 304, "Not Modified", {}, None)  # type: ignore[arg-type]

            with patch("installer.downloads.get_cache_path", return_value=cache_path):
                with patch("urllib.request.urlopen", side_effect=side_effect):
                    files = get_repo_files("pilot", config)

        assert len(files) == 1
        assert files[0].path == "pilot/test.py"
        assert files[0].sha == "abc123"


class TestDownloadFileRetry:
    """Test retry logic for remote file downloads."""

    def test_download_file_retries_on_network_error(self):
        """download_file retries up to MAX_RETRIES on transient network errors."""
        from unittest.mock import MagicMock, patch

        from installer.downloads import DownloadConfig, download_file

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="main",
        )

        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.headers.get.return_value = "0"
        mock_response.read.return_value = b""
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=None)

        call_count = 0

        def side_effect(*_args, **_kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise urllib.error.URLError("Connection reset")
            return mock_response

        with tempfile.TemporaryDirectory() as tmpdir:
            dest = Path(tmpdir) / "file.txt"
            with patch("urllib.request.urlopen", side_effect=side_effect), patch("time.sleep"):
                result = download_file("test.txt", dest, config)

        assert result is True
        assert call_count == 3

    def test_download_file_fails_after_max_retries(self):
        """download_file returns False after exhausting all retries."""
        from unittest.mock import patch

        from installer.downloads import MAX_RETRIES, DownloadConfig, download_file

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="main",
        )

        call_count = 0

        def side_effect(*_args, **_kwargs):
            nonlocal call_count
            call_count += 1
            raise urllib.error.URLError("Connection refused")

        with tempfile.TemporaryDirectory() as tmpdir:
            dest = Path(tmpdir) / "file.txt"
            with patch("urllib.request.urlopen", side_effect=side_effect), patch("time.sleep"):
                result = download_file("test.txt", dest, config)

        assert result is False
        assert call_count == MAX_RETRIES

    def test_download_file_no_retry_in_local_mode(self):
        """download_file does not retry in local mode (no network involved)."""
        from installer.downloads import DownloadConfig, download_file

        with tempfile.TemporaryDirectory() as tmpdir:
            dest = Path(tmpdir) / "dest" / "missing.txt"
            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=Path(tmpdir),
            )
            result = download_file("nonexistent.txt", dest, config)
            assert result is False


class TestDownloadFilesParallel:
    """Test parallel download functionality."""

    def test_download_files_parallel_downloads_all_files(self):
        """download_files_parallel downloads all files concurrently."""
        from installer.downloads import (
            DownloadConfig,
            FileInfo,
            download_files_parallel,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            source_dir = Path(tmpdir) / "source"
            source_dir.mkdir()

            for i in range(5):
                (source_dir / f"file{i}.txt").write_text(f"content{i}")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=source_dir,
            )

            file_infos = [FileInfo(path=f"file{i}.txt") for i in range(5)]
            dest_paths = [dest_dir / f"file{i}.txt" for i in range(5)]

            results = download_files_parallel(file_infos, dest_paths, config)

            assert len(results) == 5
            assert all(results)
            for i in range(5):
                assert dest_paths[i].exists()
                assert dest_paths[i].read_text() == f"content{i}"

    def test_download_files_parallel_returns_partial_results_on_failure(self):
        """download_files_parallel returns False for failed downloads."""
        from installer.downloads import (
            DownloadConfig,
            FileInfo,
            download_files_parallel,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            source_dir = Path(tmpdir) / "source"
            source_dir.mkdir()

            (source_dir / "exists.txt").write_text("content")

            dest_dir = Path(tmpdir) / "dest"
            dest_dir.mkdir()

            config = DownloadConfig(
                repo_url="https://github.com/test/repo",
                repo_branch="main",
                local_mode=True,
                local_repo_dir=source_dir,
            )

            file_infos = [
                FileInfo(path="exists.txt"),
                FileInfo(path="missing.txt"),
            ]
            dest_paths = [
                dest_dir / "exists.txt",
                dest_dir / "missing.txt",
            ]

            results = download_files_parallel(file_infos, dest_paths, config)

            assert results[0] is True
            assert results[1] is False

    def test_download_files_parallel_empty_list(self):
        """download_files_parallel handles empty input."""
        from installer.downloads import (
            DownloadConfig,
            download_files_parallel,
        )

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="main",
            local_mode=True,
            local_repo_dir=Path("/tmp"),
        )

        results = download_files_parallel([], [], config)
        assert results == []

    def test_download_files_parallel_mismatched_lengths_raises(self):
        """download_files_parallel raises ValueError for mismatched input lengths."""
        import pytest

        from installer.downloads import (
            DownloadConfig,
            FileInfo,
            download_files_parallel,
        )

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="main",
        )

        with pytest.raises(ValueError, match="same length"):
            download_files_parallel(
                [FileInfo(path="a.txt"), FileInfo(path="b.txt")],
                [Path("/tmp/a.txt")],
                config,
            )


class TestTreeJsonFallback:
    """Test tree.json release asset fallback for get_repo_files."""

    def test_get_repo_files_uses_tree_json_from_release_assets(self):
        """get_repo_files tries tree.json from release assets before API."""
        from unittest.mock import MagicMock, patch

        from installer.downloads import DownloadConfig, get_repo_files

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="v6.6.0",
        )

        tree_json_data = {
            "tree": [
                {"path": "pilot/test.py", "type": "blob", "sha": "abc123"},
                {"path": "installer/test.py", "type": "blob", "sha": "def456"},
            ]
        }

        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps(tree_json_data).encode()
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None

        with patch("urllib.request.urlopen", return_value=mock_response) as mock_urlopen:
            files = get_repo_files("pilot", config)

        assert mock_urlopen.call_count == 1, "Should only call urlopen once (tree.json), not fall through to API"
        first_call_request = mock_urlopen.call_args_list[0][0][0]
        first_call_url = first_call_request.full_url if hasattr(first_call_request, 'full_url') else str(first_call_request)
        assert "releases/download/v6.6.0/tree.json" in first_call_url

        assert len(files) == 1
        assert files[0].path == "pilot/test.py"
        assert files[0].sha == "abc123"

    def test_get_repo_files_falls_back_to_api_when_tree_json_unavailable(self):
        """get_repo_files falls back to API when tree.json returns 404."""
        from unittest.mock import MagicMock, patch

        from installer.downloads import DownloadConfig, get_repo_files

        config = DownloadConfig(
            repo_url="https://github.com/test/repo",
            repo_branch="v6.0.0",
        )

        api_data = {
            "tree": [
                {"path": "pilot/test.py", "type": "blob", "sha": "xyz789"},
            ]
        }

        def side_effect(request, *_args, **_kwargs):
            url = request.full_url if hasattr(request, 'full_url') else str(request)
            if "tree.json" in url:
                raise urllib.error.HTTPError(url, 404, "Not Found", {}, None)  # type: ignore[arg-type]
            else:
                mock_response = MagicMock()
                mock_response.status = 200
                mock_response.headers.get.return_value = None
                mock_response.read.return_value = json.dumps(api_data).encode()
                mock_response.__enter__.return_value = mock_response
                mock_response.__exit__.return_value = None
                return mock_response

        with patch("urllib.request.urlopen", side_effect=side_effect) as mock_urlopen:
            files = get_repo_files("pilot", config)

        assert mock_urlopen.call_count == 2

        assert len(files) == 1
        assert files[0].path == "pilot/test.py"
        assert files[0].sha == "xyz789"
