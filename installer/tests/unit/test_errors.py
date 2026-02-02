"""Tests for custom exception hierarchy."""

from __future__ import annotations


class TestInstallationCancelled:
    """Test InstallationCancelled exception."""

    def test_installation_cancelled_stores_step_name(self):
        """InstallationCancelled stores the step name that was interrupted."""
        from installer.errors import InstallationCancelled

        exc = InstallationCancelled("dependencies")
        assert exc.step_name == "dependencies"

    def test_installation_cancelled_str_includes_step_name(self):
        """InstallationCancelled string representation includes step name."""
        from installer.errors import InstallationCancelled

        exc = InstallationCancelled("environment")
        assert "environment" in str(exc)

    def test_installation_cancelled_is_install_error(self):
        """InstallationCancelled inherits from InstallError."""
        from installer.errors import InstallError, InstallationCancelled

        exc = InstallationCancelled("test_step")
        assert isinstance(exc, InstallError)
