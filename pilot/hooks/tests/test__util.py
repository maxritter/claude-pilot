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
