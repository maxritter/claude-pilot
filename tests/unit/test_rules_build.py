"""Unit tests for .claude/rules/build.py."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import pytest

# Import the module under test
sys.path.insert(0, str(Path(__file__).parent.parent.parent / ".claude" / "rules"))
from build import (
    RuleBuilderConfig,
    build_claude_local_md,
    build_claude_md,
    load_rules,
    log_info,
    log_success,
    log_warning,
)


class TestRuleBuilderConfigNamedTuple:
    """Test RuleBuilderConfig NamedTuple."""

    def test_config_creation_with_path_objects_creates_config(self):
        """Test that RuleBuilderConfig can be created with Path objects."""
        project_root = Path("/test")
        claude_dir = Path("/test/.claude")
        rules_dir = Path("/test/.claude/rules")

        config = RuleBuilderConfig(
            project_root=project_root,
            claude_dir=claude_dir,
            rules_dir=rules_dir,
        )

        assert config.project_root == project_root
        assert config.claude_dir == claude_dir
        assert config.rules_dir == rules_dir


class TestLogFunctions:
    """Test logging functions."""

    def test_log_info_outputs_message_with_blue_color_to_stderr(self, capsys):
        """Test that log_info outputs colored message to stderr."""
        log_info("Test message")

        captured = capsys.readouterr()
        assert "Test message" in captured.err
        assert "\033[0;36m" in captured.err  # Blue color code
        assert "\033[0m" in captured.err  # Reset code

    def test_log_success_outputs_message_with_green_checkmark_to_stderr(self, capsys):
        """Test that log_success outputs colored message with checkmark to stderr."""
        log_success("Success message")

        captured = capsys.readouterr()
        assert "Success message" in captured.err
        assert "\u2713" in captured.err  # Checkmark
        assert "\033[0;32m" in captured.err  # Green color code
        assert "\033[0m" in captured.err  # Reset code

    def test_log_warning_outputs_message_with_yellow_warning_to_stderr(self, capsys):
        """Test that log_warning outputs colored message with warning symbol to stderr."""
        log_warning("Warning message")

        captured = capsys.readouterr()
        assert "Warning message" in captured.err
        assert "\u26a0" in captured.err  # Warning symbol
        assert "\033[1;33m" in captured.err  # Yellow color code
        assert "\033[0m" in captured.err  # Reset code


@pytest.fixture
def temp_rules_dir():
    """Create a temporary rules directory structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        rules_dir = Path(tmpdir)
        yield rules_dir


@pytest.fixture
def config_with_rules(temp_rules_dir):
    """Create a RuleBuilderConfig with temporary directories."""
    claude_dir = temp_rules_dir.parent
    project_root = claude_dir.parent

    return RuleBuilderConfig(
        project_root=project_root,
        claude_dir=claude_dir,
        rules_dir=temp_rules_dir,
    )


class TestLoadRules:
    """Test load_rules function."""

    def test_load_rules_with_no_directory_returns_empty_dict(self, temp_rules_dir):
        """Test that load_rules returns empty dict when directory doesn't exist."""
        rules = load_rules(temp_rules_dir, "standard")

        assert rules == {}

    def test_load_rules_with_empty_directory_returns_empty_dict(self, temp_rules_dir):
        """Test that load_rules returns empty dict when directory is empty."""
        (temp_rules_dir / "standard").mkdir()

        rules = load_rules(temp_rules_dir, "standard")

        assert rules == {}

    def test_load_rules_with_standard_rules_returns_rules_dict(self, temp_rules_dir):
        """Test that load_rules loads standard rules from flat directory."""
        standard_dir = temp_rules_dir / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "test-rule.md").write_text("# Test Rule\n\nTest content")

        rules = load_rules(temp_rules_dir, "standard")

        assert "test-rule" in rules
        assert rules["test-rule"] == "# Test Rule\n\nTest content"

    def test_load_rules_with_custom_rules_returns_rules_dict(self, temp_rules_dir):
        """Test that load_rules loads custom rules from flat directory."""
        custom_dir = temp_rules_dir / "custom"
        custom_dir.mkdir(parents=True)
        (custom_dir / "custom-rule.md").write_text("# Custom Rule")

        rules = load_rules(temp_rules_dir, "custom")

        assert "custom-rule" in rules
        assert rules["custom-rule"] == "# Custom Rule"

    def test_load_rules_with_multiple_rules_returns_all_rules(self, temp_rules_dir):
        """Test that load_rules loads all markdown files in directory."""
        standard_dir = temp_rules_dir / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "rule1.md").write_text("Rule 1")
        (standard_dir / "rule2.md").write_text("Rule 2")
        (standard_dir / "rule3.md").write_text("Rule 3")

        rules = load_rules(temp_rules_dir, "standard")

        assert len(rules) == 3
        assert "rule1" in rules
        assert "rule2" in rules
        assert "rule3" in rules

    def test_load_rules_ignores_non_markdown_files(self, temp_rules_dir):
        """Test that load_rules only loads .md files."""
        standard_dir = temp_rules_dir / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "rule.md").write_text("Markdown")
        (standard_dir / "config.yaml").write_text("yaml: true")
        (standard_dir / "script.py").write_text("print('hello')")
        (standard_dir / ".gitkeep").write_text("")

        rules = load_rules(temp_rules_dir, "standard")

        assert len(rules) == 1
        assert "rule" in rules

    def test_load_rules_returns_sorted_order(self, temp_rules_dir):
        """Test that load_rules returns rules in sorted order."""
        standard_dir = temp_rules_dir / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "zebra.md").write_text("Z")
        (standard_dir / "alpha.md").write_text("A")
        (standard_dir / "beta.md").write_text("B")

        rules = load_rules(temp_rules_dir, "standard")

        # Check that keys are sorted
        assert list(rules.keys()) == ["alpha", "beta", "zebra"]


class TestBuildClaudeMd:
    """Test build_claude_md function."""

    def test_build_claude_md_creates_file_in_claude_dir(self, config_with_rules):
        """Test that build_claude_md creates CLAUDE.md in .claude directory."""
        standard_rules = {"test": "# Test"}

        build_claude_md(config_with_rules, standard_rules)

        output_file = config_with_rules.claude_dir / "CLAUDE.md"
        assert output_file.exists()

    def test_build_claude_md_includes_header(self, config_with_rules):
        """Test that build_claude_md includes auto-generated header."""
        standard_rules = {"test": "# Test"}

        build_claude_md(config_with_rules, standard_rules)

        content = (config_with_rules.claude_dir / "CLAUDE.md").read_text()
        assert "# Claude CodePro Rules" in content
        assert "Auto-generated - DO NOT EDIT" in content
        assert "Regenerated on every `ccp` startup" in content

    def test_build_claude_md_includes_standard_rules(self, config_with_rules):
        """Test that build_claude_md includes standard rules content."""
        standard_rules = {"coding-standards": "## Coding Standards\n\nWrite clean code."}

        build_claude_md(config_with_rules, standard_rules)

        content = (config_with_rules.claude_dir / "CLAUDE.md").read_text()
        assert "## Coding Standards" in content
        assert "Write clean code." in content

    def test_build_claude_md_rules_separated_by_dividers(self, config_with_rules):
        """Test that rules are separated by horizontal dividers."""
        standard_rules = {"rule1": "## Rule 1", "rule2": "## Rule 2"}

        build_claude_md(config_with_rules, standard_rules)

        content = (config_with_rules.claude_dir / "CLAUDE.md").read_text()
        assert content.count("---") >= 3  # Header divider + at least 2 rule dividers

    def test_build_claude_md_handles_empty_rules(self, config_with_rules):
        """Test that build_claude_md handles empty rules dict."""
        standard_rules = {}

        build_claude_md(config_with_rules, standard_rules)

        output_file = config_with_rules.claude_dir / "CLAUDE.md"
        assert output_file.exists()
        content = output_file.read_text()
        assert "# Claude CodePro Rules" in content

    def test_build_claude_md_strips_whitespace(self, config_with_rules):
        """Test that build_claude_md strips trailing whitespace from rules."""
        standard_rules = {"rule": "## Rule\n\nContent\n\n\n"}

        build_claude_md(config_with_rules, standard_rules)

        content = (config_with_rules.claude_dir / "CLAUDE.md").read_text()
        assert "Content\n\n\n\n" not in content

    def test_build_claude_md_uses_utf8_encoding(self, config_with_rules):
        """Test that build_claude_md handles UTF-8 content correctly."""
        standard_rules = {"unicode": "## Unicode Test\n\nEmoji: \U0001f680 Greek: \u03b1\u03b2\u03b3"}

        build_claude_md(config_with_rules, standard_rules)

        content = (config_with_rules.claude_dir / "CLAUDE.md").read_text(encoding="utf-8")
        assert "\U0001f680" in content
        assert "\u03b1\u03b2\u03b3" in content


class TestBuildClaudeLocalMd:
    """Test build_claude_local_md function."""

    def test_build_claude_local_md_creates_file_at_project_root(self, config_with_rules):
        """Test that build_claude_local_md creates CLAUDE.local.md at project root."""
        custom_rules = {"test": "# Test"}

        build_claude_local_md(config_with_rules, custom_rules)

        output_file = config_with_rules.project_root / "CLAUDE.local.md"
        assert output_file.exists()

    def test_build_claude_local_md_includes_header(self, config_with_rules):
        """Test that build_claude_local_md includes auto-generated header."""
        custom_rules = {"test": "# Test"}

        build_claude_local_md(config_with_rules, custom_rules)

        content = (config_with_rules.project_root / "CLAUDE.local.md").read_text()
        assert "# Custom Rules" in content
        assert "Auto-generated - DO NOT EDIT" in content
        assert "Regenerated on every `ccp` startup" in content

    def test_build_claude_local_md_includes_custom_rules(self, config_with_rules):
        """Test that build_claude_local_md includes custom rules content."""
        custom_rules = {"my-rule": "## My Rule\n\nCustom content."}

        build_claude_local_md(config_with_rules, custom_rules)

        content = (config_with_rules.project_root / "CLAUDE.local.md").read_text()
        assert "## My Rule" in content
        assert "Custom content." in content

    def test_build_claude_local_md_rules_separated_by_dividers(self, config_with_rules):
        """Test that rules are separated by horizontal dividers."""
        custom_rules = {"rule1": "## Rule 1", "rule2": "## Rule 2"}

        build_claude_local_md(config_with_rules, custom_rules)

        content = (config_with_rules.project_root / "CLAUDE.local.md").read_text()
        assert content.count("---") >= 3

    def test_build_claude_local_md_handles_empty_rules(self, config_with_rules):
        """Test that build_claude_local_md handles empty rules dict."""
        custom_rules = {}

        build_claude_local_md(config_with_rules, custom_rules)

        output_file = config_with_rules.project_root / "CLAUDE.local.md"
        assert output_file.exists()
        content = output_file.read_text()
        assert "# Custom Rules" in content

    def test_build_claude_local_md_strips_whitespace(self, config_with_rules):
        """Test that build_claude_local_md strips trailing whitespace from rules."""
        custom_rules = {"rule": "## Rule\n\nContent\n\n\n"}

        build_claude_local_md(config_with_rules, custom_rules)

        content = (config_with_rules.project_root / "CLAUDE.local.md").read_text()
        assert "Content\n\n\n\n" not in content

    def test_build_claude_local_md_uses_utf8_encoding(self, config_with_rules):
        """Test that build_claude_local_md handles UTF-8 content correctly."""
        custom_rules = {"unicode": "## Unicode\n\nEmoji: \U0001f680"}

        build_claude_local_md(config_with_rules, custom_rules)

        content = (config_with_rules.project_root / "CLAUDE.local.md").read_text(encoding="utf-8")
        assert "\U0001f680" in content
