"""Custom exception hierarchy for installer."""

from __future__ import annotations


class InstallError(Exception):
    """Base exception for recoverable installation errors."""

    pass


class FatalInstallError(InstallError):
    """Fatal error that requires abort and rollback."""

    pass


class PreflightError(FatalInstallError):
    """Pre-flight check failed."""

    def __init__(self, message: str, check_name: str | None = None):
        super().__init__(message)
        self.check_name = check_name


class ConfigError(InstallError):
    """Configuration error."""

    pass
