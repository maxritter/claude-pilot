"""Tests for _util.py model config helper functions."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestReadModelFromConfig:
    """Tests for _read_model_from_config()."""

    def test_returns_model_from_config(self, tmp_path: Path) -> None:
        from _util import _read_model_from_config

        config = tmp_path / ".pilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"model": "opus[1m]"}))

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _read_model_from_config()

        assert result == "opus[1m]"

    def test_returns_sonnet_default_when_config_missing(self, tmp_path: Path) -> None:
        from _util import _read_model_from_config

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _read_model_from_config()

        assert result == "sonnet"

    def test_returns_sonnet_for_unknown_model(self, tmp_path: Path) -> None:
        from _util import _read_model_from_config

        config = tmp_path / ".pilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"model": "gpt-4"}))

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _read_model_from_config()

        assert result == "sonnet"


class TestGetMaxContextTokens:
    """Tests for _get_max_context_tokens()."""

    def test_returns_200k_for_sonnet(self, tmp_path: Path) -> None:
        from _util import _get_max_context_tokens

        config = tmp_path / ".pilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"model": "sonnet"}))

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _get_max_context_tokens()

        assert result == 200_000

    def test_returns_1m_for_sonnet_1m(self, tmp_path: Path) -> None:
        from _util import _get_max_context_tokens

        config = tmp_path / ".pilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"model": "sonnet[1m]"}))

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _get_max_context_tokens()

        assert result == 1_000_000

    def test_returns_1m_for_opus_1m(self, tmp_path: Path) -> None:
        from _util import _get_max_context_tokens

        config = tmp_path / ".pilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"model": "opus[1m]"}))

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _get_max_context_tokens()

        assert result == 1_000_000

    def test_returns_200k_when_config_missing(self, tmp_path: Path) -> None:
        from _util import _get_max_context_tokens

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _get_max_context_tokens()

        assert result == 200_000


class TestGetCompactionThresholdPct:
    """Tests for _get_compaction_threshold_pct()."""

    def test_returns_83_5_for_200k_model(self, tmp_path: Path) -> None:
        from _util import _get_compaction_threshold_pct

        config = tmp_path / ".pilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"model": "opus"}))

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _get_compaction_threshold_pct()

        assert abs(result - 83.5) < 0.1

    def test_returns_96_7_for_1m_model(self, tmp_path: Path) -> None:
        from _util import _get_compaction_threshold_pct

        config = tmp_path / ".pilot" / "config.json"
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"model": "opus[1m]"}))

        with patch("pathlib.Path.home", return_value=tmp_path):
            result = _get_compaction_threshold_pct()

        assert abs(result - 96.7) < 0.1


class TestJsonHelpers:
    """Tests for JSON response helper functions."""

    def test_post_tool_use_block(self) -> None:
        from _util import post_tool_use_block

        result = json.loads(post_tool_use_block("Fix lint errors"))
        assert result == {"decision": "block", "reason": "Fix lint errors"}

    def test_post_tool_use_context(self) -> None:
        from _util import post_tool_use_context

        result = json.loads(post_tool_use_context("Context at 80%"))
        assert result == {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": "Context at 80%",
            }
        }

    def test_pre_tool_use_deny(self) -> None:
        from _util import pre_tool_use_deny

        result = json.loads(pre_tool_use_deny("Use MCP instead"))
        assert result == {"permissionDecision": "deny", "reason": "Use MCP instead"}

    def test_pre_tool_use_context(self) -> None:
        from _util import pre_tool_use_context

        result = json.loads(pre_tool_use_context("Try vexor first"))
        assert result == {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": "Try vexor first",
            }
        }

    def test_stop_block(self) -> None:
        from _util import stop_block

        result = json.loads(stop_block("Spec workflow in progress"))
        assert result == {"decision": "block", "reason": "Spec workflow in progress"}

    def test_helpers_handle_special_chars(self) -> None:
        from _util import post_tool_use_block

        msg = 'File "test.py" has\nnewlines & "quotes"'
        result = json.loads(post_tool_use_block(msg))
        assert result["reason"] == msg


class TestCheckFileLength:
    """Tests for check_file_length returning string."""

    def test_returns_empty_for_normal_file(self, tmp_path: Path) -> None:
        from _util import check_file_length

        f = tmp_path / "small.py"
        f.write_text("\n".join(f"line {i}" for i in range(100)))
        assert check_file_length(f) == ""

    def test_returns_warning_for_long_file(self, tmp_path: Path) -> None:
        from _util import check_file_length

        f = tmp_path / "growing.py"
        f.write_text("\n".join(f"line {i}" for i in range(350)))
        result = check_file_length(f)
        assert "growing.py" in result
        assert "350" in result
        assert "300" in result

    def test_returns_critical_for_very_long_file(self, tmp_path: Path) -> None:
        from _util import check_file_length

        f = tmp_path / "huge.py"
        f.write_text("\n".join(f"line {i}" for i in range(550)))
        result = check_file_length(f)
        assert "huge.py" in result
        assert "550" in result
        assert "500" in result

    def test_returns_empty_for_nonexistent_file(self, tmp_path: Path) -> None:
        from _util import check_file_length

        result = check_file_length(tmp_path / "nope.py")
        assert result == ""

    def test_no_ansi_codes_in_output(self, tmp_path: Path) -> None:
        from _util import check_file_length

        f = tmp_path / "big.py"
        f.write_text("\n".join(f"line {i}" for i in range(550)))
        result = check_file_length(f)
        assert "\033[" not in result
