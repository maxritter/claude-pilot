"""E2E tests for build.py script."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def temp_project():
    """Create a temporary project directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_dir = Path(tmpdir)
        yield project_dir


@pytest.fixture
def project_root():
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent


def setup_test_rules(test_dir: Path, project_root: Path) -> None:
    """Set up test rule structure."""
    # Create directory structure
    rules_dir = test_dir / ".claude" / "rules"
    rules_dir.mkdir(parents=True)

    # Copy build.py script
    build_script = project_root / ".claude" / "rules" / "build.py"
    (rules_dir / "build.py").write_text(build_script.read_text())
    (rules_dir / "build.py").chmod(0o755)


def run_build(project_dir: Path) -> subprocess.CompletedProcess:
    """Run build.py script."""
    return subprocess.run(
        ["python3", ".claude/rules/build.py"],
        cwd=project_dir,
        capture_output=True,
        text=True,
        check=False,
    )


class TestFlatStructure:
    """Test build with flat rule structure."""

    def test_loads_standard_rules_from_flat_directory(self, temp_project, project_root):
        """Test that standard rules are loaded from flat directory."""
        setup_test_rules(temp_project, project_root)

        # Create standard rules in flat structure
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "coding-standards.md").write_text("## Coding Standards\nContent 1")
        (standard_dir / "tdd-enforcement.md").write_text("## TDD Enforcement\nContent 2")

        result = run_build(temp_project)
        assert result.returncode == 0, f"Build failed: {result.stderr}"
        assert "coding-standards.md" in result.stderr
        assert "tdd-enforcement.md" in result.stderr

    def test_loads_custom_rules_from_flat_directory(self, temp_project, project_root):
        """Test that custom rules are loaded from flat directory."""
        setup_test_rules(temp_project, project_root)

        # Create custom rules in flat structure
        custom_dir = temp_project / ".claude" / "rules" / "custom"
        custom_dir.mkdir(parents=True)
        (custom_dir / "my-custom-rule.md").write_text("## My Custom Rule\nCustom content")

        result = run_build(temp_project)
        assert result.returncode == 0, f"Build failed: {result.stderr}"
        assert "my-custom-rule.md" in result.stderr

    def test_creates_claude_md_in_claude_dir(self, temp_project, project_root):
        """Test that CLAUDE.md is created in .claude directory."""
        setup_test_rules(temp_project, project_root)

        # Create standard rule
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "test-rule.md").write_text("## Test Rule\nContent")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify CLAUDE.md created in .claude directory
        claude_md = temp_project / ".claude" / "CLAUDE.md"
        assert claude_md.exists()

    def test_creates_claude_local_md_at_project_root(self, temp_project, project_root):
        """Test that CLAUDE.local.md is created at project root."""
        setup_test_rules(temp_project, project_root)

        # Create custom rule
        custom_dir = temp_project / ".claude" / "rules" / "custom"
        custom_dir.mkdir(parents=True)
        (custom_dir / "test-rule.md").write_text("## Test Rule\nContent")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify CLAUDE.local.md created at project root
        claude_local = temp_project / "CLAUDE.local.md"
        assert claude_local.exists()

    def test_claude_md_contains_standard_rules(self, temp_project, project_root):
        """Test that CLAUDE.md contains standard rule content."""
        setup_test_rules(temp_project, project_root)

        # Create standard rule
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "test-rule.md").write_text("## Test Rule\nTest content here")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify content
        claude_md = temp_project / ".claude" / "CLAUDE.md"
        content = claude_md.read_text()
        assert "# Claude CodePro Rules" in content
        assert "Auto-generated" in content
        assert "## Test Rule" in content
        assert "Test content here" in content

    def test_claude_local_md_contains_custom_rules(self, temp_project, project_root):
        """Test that CLAUDE.local.md contains custom rule content."""
        setup_test_rules(temp_project, project_root)

        # Create custom rule
        custom_dir = temp_project / ".claude" / "rules" / "custom"
        custom_dir.mkdir(parents=True)
        (custom_dir / "my-rule.md").write_text("## My Rule\nCustom content here")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify content at project root
        claude_local = temp_project / "CLAUDE.local.md"
        content = claude_local.read_text()
        assert "# Custom Rules" in content
        assert "## My Rule" in content
        assert "Custom content here" in content


class TestSeparateFiles:
    """Test that standard and custom rules go to separate files."""

    def test_standard_rules_only_in_claude_md(self, temp_project, project_root):
        """Test that standard rules are only in CLAUDE.md."""
        setup_test_rules(temp_project, project_root)

        # Create standard rule
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "standard-rule.md").write_text("## Standard Rule\nStandard content")

        # Create custom rule
        custom_dir = temp_project / ".claude" / "rules" / "custom"
        custom_dir.mkdir(parents=True)
        (custom_dir / "custom-rule.md").write_text("## Custom Rule\nCustom content")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify CLAUDE.md contains only standard rules
        claude_md = temp_project / ".claude" / "CLAUDE.md"
        content = claude_md.read_text()
        assert "Standard content" in content
        assert "Custom content" not in content

    def test_custom_rules_only_in_claude_local_md(self, temp_project, project_root):
        """Test that custom rules are only in CLAUDE.local.md."""
        setup_test_rules(temp_project, project_root)

        # Create standard rule
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "standard-rule.md").write_text("## Standard Rule\nStandard content")

        # Create custom rule
        custom_dir = temp_project / ".claude" / "rules" / "custom"
        custom_dir.mkdir(parents=True)
        (custom_dir / "custom-rule.md").write_text("## Custom Rule\nCustom content")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify CLAUDE.local.md contains only custom rules
        claude_local = temp_project / "CLAUDE.local.md"
        content = claude_local.read_text()
        assert "Custom content" in content
        assert "Standard content" not in content

    def test_rules_sorted_alphabetically_in_each_file(self, temp_project, project_root):
        """Test that rules appear in alphabetical order in each file."""
        setup_test_rules(temp_project, project_root)

        # Create rules in non-alphabetical order
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "zebra.md").write_text("## Zebra")
        (standard_dir / "alpha.md").write_text("## Alpha")
        (standard_dir / "beta.md").write_text("## Beta")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify alphabetical order in CLAUDE.md
        claude_md = temp_project / ".claude" / "CLAUDE.md"
        content = claude_md.read_text()
        alpha_pos = content.find("## Alpha")
        beta_pos = content.find("## Beta")
        zebra_pos = content.find("## Zebra")
        assert alpha_pos < beta_pos < zebra_pos


class TestEmptyDirectories:
    """Test handling of empty or missing directories."""

    def test_handles_empty_standard_directory(self, temp_project, project_root):
        """Test that empty standard directory creates empty CLAUDE.md."""
        setup_test_rules(temp_project, project_root)

        # Create empty standard directory
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)

        # Create custom rule
        custom_dir = temp_project / ".claude" / "rules" / "custom"
        custom_dir.mkdir(parents=True)
        (custom_dir / "custom-rule.md").write_text("## Custom Rule")

        result = run_build(temp_project)
        assert result.returncode == 0

        # CLAUDE.md should exist with header only
        claude_md = temp_project / ".claude" / "CLAUDE.md"
        assert claude_md.exists()

        # CLAUDE.local.md should have custom rules
        claude_local = temp_project / "CLAUDE.local.md"
        content = claude_local.read_text()
        assert "## Custom Rule" in content

    def test_handles_missing_custom_directory(self, temp_project, project_root):
        """Test that missing custom directory creates empty CLAUDE.local.md."""
        setup_test_rules(temp_project, project_root)

        # Create only standard rule (no custom directory)
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "test-rule.md").write_text("## Test Rule")

        result = run_build(temp_project)
        assert result.returncode == 0

        # CLAUDE.md should have standard rules
        claude_md = temp_project / ".claude" / "CLAUDE.md"
        content = claude_md.read_text()
        assert "## Test Rule" in content

        # CLAUDE.local.md should exist with header only
        claude_local = temp_project / "CLAUDE.local.md"
        assert claude_local.exists()

    def test_handles_no_rules_at_all(self, temp_project, project_root):
        """Test that no rules creates both files with headers only."""
        setup_test_rules(temp_project, project_root)

        # Create empty directories
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        custom_dir = temp_project / ".claude" / "rules" / "custom"
        custom_dir.mkdir(parents=True)

        result = run_build(temp_project)
        assert result.returncode == 0
        assert "0 rules" in result.stderr

        # Both files should exist
        assert (temp_project / ".claude" / "CLAUDE.md").exists()
        assert (temp_project / "CLAUDE.local.md").exists()


class TestBuildOutput:
    """Test build script output and logging."""

    def test_shows_rule_count(self, temp_project, project_root):
        """Test that build shows total rule count."""
        setup_test_rules(temp_project, project_root)

        # Create 3 standard rules
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "rule1.md").write_text("## Rule 1")
        (standard_dir / "rule2.md").write_text("## Rule 2")
        (standard_dir / "rule3.md").write_text("## Rule 3")

        result = run_build(temp_project)
        assert result.returncode == 0
        assert "3" in result.stderr
        assert "standard" in result.stderr.lower()

    def test_shows_build_complete_message(self, temp_project, project_root):
        """Test that build shows completion message."""
        setup_test_rules(temp_project, project_root)

        # Create minimal rule
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "test.md").write_text("## Test")

        result = run_build(temp_project)
        assert result.returncode == 0
        assert "Complete" in result.stderr

    def test_shows_both_generated_files(self, temp_project, project_root):
        """Test that build shows both generated file messages."""
        setup_test_rules(temp_project, project_root)

        # Create minimal rule
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "test.md").write_text("## Test")

        result = run_build(temp_project)
        assert result.returncode == 0
        assert "CLAUDE.md" in result.stderr
        assert "CLAUDE.local.md" in result.stderr


class TestFileContent:
    """Test content of generated files."""

    def test_handles_utf8_content(self, temp_project, project_root):
        """Test that UTF-8 content is handled correctly."""
        setup_test_rules(temp_project, project_root)

        # Create rule with unicode content
        standard_dir = temp_project / ".claude" / "rules" / "standard"
        standard_dir.mkdir(parents=True)
        (standard_dir / "unicode.md").write_text("## Unicode Test\n\nEmoji: \U0001f680\nGreek: \u03b1\u03b2\u03b3")

        result = run_build(temp_project)
        assert result.returncode == 0

        # Verify content preserved in CLAUDE.md
        claude_md = temp_project / ".claude" / "CLAUDE.md"
        content = claude_md.read_text(encoding="utf-8")
        assert "\U0001f680" in content
        assert "\u03b1\u03b2\u03b3" in content
