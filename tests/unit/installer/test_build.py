"""Tests for installer build script."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest


class TestBuildHelpers:
    """Test build script helper functions."""

    def test_get_platform_suffix_returns_string(self):
        """get_platform_suffix returns a string."""
        from installer.build import get_platform_suffix

        result = get_platform_suffix()
        assert isinstance(result, str)
        assert "-" in result

    @patch("platform.system", return_value="Linux")
    @patch("platform.machine", return_value="x86_64")
    def test_get_platform_suffix_linux_x86_64(self, mock_machine, mock_system):
        """get_platform_suffix returns linux-x86_64."""
        from installer.build import get_platform_suffix

        result = get_platform_suffix()
        assert result == "linux-x86_64"

    @patch("platform.system", return_value="Darwin")
    @patch("platform.machine", return_value="arm64")
    def test_get_platform_suffix_darwin_arm64(self, mock_machine, mock_system):
        """get_platform_suffix returns darwin-arm64."""
        from installer.build import get_platform_suffix

        result = get_platform_suffix()
        assert result == "darwin-arm64"


class TestBuildTimestamp:
    """Test build timestamp functions."""

    def test_set_build_timestamp_returns_version_and_timestamp(self):
        """set_build_timestamp returns (version, timestamp) tuple."""
        from installer.build import set_build_timestamp

        version, timestamp = set_build_timestamp()
        assert isinstance(version, str)
        assert isinstance(timestamp, str)
        # Timestamp should contain UTC
        assert "UTC" in timestamp

    def test_reset_build_timestamp_sets_dev(self):
        """reset_build_timestamp resets to dev."""
        from installer import __build__
        from installer.build import reset_build_timestamp, set_build_timestamp

        # Set a timestamp first
        set_build_timestamp()

        # Reset it
        reset_build_timestamp()

        # Re-import to get updated value
        import importlib

        import installer

        importlib.reload(installer)
        assert installer.__build__ == "dev"


class TestBuildWithPyinstaller:
    """Test PyInstaller build function."""

    def test_build_with_pyinstaller_exists(self):
        """build_with_pyinstaller function exists."""
        from installer.build import build_with_pyinstaller

        assert callable(build_with_pyinstaller)
