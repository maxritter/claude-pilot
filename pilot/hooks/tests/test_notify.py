"""Tests for notification module."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))
import notify
from notify import send_notification


class TestSendNotification:
    def setup_method(self):
        """Reset module-level state before each test."""
        notify._warning_shown = False

    @patch("notify._play_sound")
    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.subprocess.run")
    @patch("notify.ThreadPoolExecutor")
    def test_sends_notification_on_macos(self, mock_executor, mock_run, mock_which, mock_platform, _mock_sound):
        """Should call osascript with sound on macOS."""
        mock_platform.return_value = "Darwin"
        mock_which.return_value = "/usr/bin/osascript"

        mock_future = MagicMock()
        mock_future.result.return_value = None
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification("Test Title", "Test Message")

        assert mock_executor.return_value.__enter__.return_value.submit.called
        call_args = mock_executor.return_value.__enter__.return_value.submit.call_args

        submitted_func = call_args[0][0]
        submitted_func()

        mock_run.assert_called_once()
        cmd = mock_run.call_args[0][0]
        assert cmd[0] == "osascript"
        assert cmd[1] == "-e"
        assert "display notification" in cmd[2]
        assert "Test Message" in cmd[2]
        assert "Test Title" in cmd[2]
        assert 'sound name "Glass"' in cmd[2]

    @patch("notify._play_sound")
    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.subprocess.run")
    @patch("notify.ThreadPoolExecutor")
    def test_sends_notification_on_linux(self, mock_executor, mock_run, mock_which, mock_platform, _mock_sound):
        """Should call notify-send with urgency on Linux."""
        mock_platform.return_value = "Linux"
        mock_which.return_value = "/usr/bin/notify-send"

        mock_future = MagicMock()
        mock_future.result.return_value = None
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification("Test Title", "Test Message")

        assert mock_executor.return_value.__enter__.return_value.submit.called
        call_args = mock_executor.return_value.__enter__.return_value.submit.call_args

        submitted_func = call_args[0][0]
        submitted_func()

        mock_run.assert_called_once()
        cmd = mock_run.call_args[0][0]
        assert cmd[0] == "notify-send"
        assert "--urgency=critical" in cmd
        assert "Test Title" in cmd
        assert "Test Message" in cmd

    @patch("notify.platform.system")
    def test_returns_silently_on_unsupported_platform(self, mock_platform):
        """Should return silently on Windows or other unsupported platforms."""
        mock_platform.return_value = "Windows"

        send_notification("Test", "Message")

    @patch("notify._play_sound")
    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("sys.stderr")
    def test_warns_when_command_not_found(self, mock_stderr, mock_which, mock_platform, _mock_sound):
        """Should print one-time warning when command not available."""
        mock_platform.return_value = "Darwin"
        mock_which.return_value = None

        send_notification("Test", "Message")

        assert mock_stderr.write.called
        stderr_output = "".join([call[0][0] for call in mock_stderr.write.call_args_list])
        assert "Notifications disabled" in stderr_output
        assert "osascript" in stderr_output

    @patch("notify._play_sound")
    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("sys.stderr")
    def test_warns_only_once_when_command_not_found(self, mock_stderr, mock_which, mock_platform, _mock_sound):
        """Should print warning only on first call, not subsequent calls."""
        mock_platform.return_value = "Darwin"
        mock_which.return_value = None

        send_notification("Test", "First")

        mock_stderr.reset_mock()
        send_notification("Test", "Second")

        assert mock_stderr.write.call_count == 0 or all(
            "Notifications disabled" not in str(call) for call in mock_stderr.write.call_args_list
        )

    @patch("notify._play_sound")
    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.ThreadPoolExecutor")
    def test_timeout_protection(self, mock_executor, mock_which, mock_platform, _mock_sound):
        """Should use thread-based timeout to prevent hanging."""
        mock_platform.return_value = "Darwin"
        mock_which.return_value = "/usr/bin/osascript"

        mock_future = MagicMock()
        mock_future.result.side_effect = TimeoutError("Timeout")
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification("Test", "Message")

        mock_future.result.assert_called_once_with(timeout=3)

    @patch("notify._play_sound")
    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.ThreadPoolExecutor")
    def test_handles_unexpected_exception_gracefully(self, mock_executor, mock_which, mock_platform, _mock_sound):
        """Should handle non-timeout exceptions without raising."""
        mock_platform.return_value = "Darwin"
        mock_which.return_value = "/usr/bin/osascript"

        mock_future = MagicMock()
        mock_future.result.side_effect = RuntimeError("Unexpected error")
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification("Test", "Message")

    @patch("notify._play_sound")
    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.subprocess.run")
    @patch("notify.ThreadPoolExecutor")
    def test_escapes_quotes_in_applescript(self, mock_executor, mock_run, mock_which, mock_platform, _mock_sound):
        """Should escape quotes in title/message to prevent AppleScript injection."""
        mock_platform.return_value = "Darwin"
        mock_which.return_value = "/usr/bin/osascript"

        mock_future = MagicMock()
        mock_future.result.return_value = None
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification('Title with "quotes"', 'Message with "quotes"')

        call_args = mock_executor.return_value.__enter__.return_value.submit.call_args
        submitted_func = call_args[0][0]
        submitted_func()

        cmd = mock_run.call_args[0][0]
        assert '\\"quotes\\"' in cmd[2]

    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.subprocess.Popen")
    @patch("notify.subprocess.run")
    @patch("notify.ThreadPoolExecutor")
    def test_skips_afplay_on_macos_because_osascript_plays_sound(
        self, mock_executor, mock_run, mock_popen, mock_which, mock_platform
    ):
        """Should NOT play sound via afplay on macOS — osascript handles it."""
        mock_platform.return_value = "Darwin"
        mock_which.return_value = "/usr/bin/osascript"

        mock_future = MagicMock()
        mock_future.result.return_value = None
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification("Test", "Message")

        mock_popen.assert_not_called()

    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.subprocess.Popen")
    @patch("notify.subprocess.run")
    @patch("notify.ThreadPoolExecutor")
    def test_plays_sound_via_paplay_on_linux(self, mock_executor, mock_run, mock_popen, mock_which, mock_platform):
        """Should play sound via paplay on Linux if available."""
        mock_platform.return_value = "Linux"

        def which_side_effect(name):
            return {
                "notify-send": "/usr/bin/notify-send",
                "paplay": "/usr/bin/paplay",
            }.get(name)

        mock_which.side_effect = which_side_effect

        mock_future = MagicMock()
        mock_future.result.return_value = None
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification("Test", "Message")

        mock_popen.assert_called_once()
        popen_cmd = mock_popen.call_args[0][0]
        assert popen_cmd[0] == "paplay"

    @patch("notify.platform.system")
    @patch("notify.shutil.which")
    @patch("notify.subprocess.Popen")
    @patch("notify.subprocess.run")
    @patch("notify.ThreadPoolExecutor")
    def test_no_sound_on_linux_without_paplay(self, mock_executor, mock_run, mock_popen, mock_which, mock_platform):
        """Should skip sound on Linux when paplay is not available."""
        mock_platform.return_value = "Linux"

        def which_side_effect(name):
            if name == "notify-send":
                return "/usr/bin/notify-send"
            return None

        mock_which.side_effect = which_side_effect

        mock_future = MagicMock()
        mock_future.result.return_value = None
        mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future

        send_notification("Test", "Message")

        mock_popen.assert_not_called()
