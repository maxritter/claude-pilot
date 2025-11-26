#!/usr/bin/env python3
"""
Rule Builder - Assembles CLAUDE.md and CLAUDE.local.md from rules

Generates two files:
- .claude/CLAUDE.md - Standard rules (from .claude/rules/standard/)
- CLAUDE.local.md - Custom rules at project root (from .claude/rules/custom/)

Both files are auto-generated on every `ccp` startup and should be git-ignored.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import NamedTuple


class RuleBuilderConfig(NamedTuple):
    """Configuration paths for rule builder."""

    project_root: Path
    claude_dir: Path
    rules_dir: Path


BLUE = "\033[0;36m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
NC = "\033[0m"


def log_info(message: str) -> None:
    """Log info message."""
    print(f"{BLUE}{message}{NC}", file=sys.stderr)


def log_success(message: str) -> None:
    """Log success message."""
    print(f"{GREEN}✓ {message}{NC}", file=sys.stderr)


def log_warning(message: str) -> None:
    """Log warning message."""
    print(f"{YELLOW}⚠ {message}{NC}", file=sys.stderr)


def load_rules(rules_dir: Path, source: str) -> dict[str, str]:
    """
    Load rules from flat directory (standard/ or custom/).

    Args:
        rules_dir: Base rules directory
        source: Either "standard" or "custom"

    Returns:
        Dict mapping rule_id (filename stem) to content
    """
    rules: dict[str, str] = {}
    source_dir = rules_dir / source

    if not source_dir.exists():
        return rules

    for md_file in sorted(source_dir.glob("*.md")):
        rule_id = md_file.stem
        try:
            rules[rule_id] = md_file.read_text(encoding="utf-8")
            log_success(f"  {source}/{md_file.name}")
        except Exception as e:
            log_warning(f"Failed to read {md_file.name}: {e}")

    return rules


def build_claude_md(config: RuleBuilderConfig, standard_rules: dict[str, str]) -> None:
    """
    Build CLAUDE.md with standard rules.

    Args:
        config: Rule builder configuration
        standard_rules: Dict of standard rules
    """
    content: list[str] = [
        "# Claude CodePro Rules",
        "",
        "**Auto-generated - DO NOT EDIT**",
        "",
        "**Regenerated on every `ccp` startup**",
        "",
        "---",
        "",
    ]

    if standard_rules:
        for rule_id in sorted(standard_rules.keys()):
            content.append(standard_rules[rule_id].strip())
            content.append("")
            content.append("")
            content.append("---")
            content.append("")

    output_file = config.claude_dir / "CLAUDE.md"
    output_file.write_text("\n".join(content), encoding="utf-8")
    log_success(f"Generated CLAUDE.md ({len(standard_rules)} standard rules)")


def build_claude_local_md(config: RuleBuilderConfig, custom_rules: dict[str, str]) -> None:
    """
    Build CLAUDE.local.md with custom rules at project root.

    Args:
        config: Rule builder configuration
        custom_rules: Dict of custom rules
    """
    content: list[str] = [
        "# Custom Rules",
        "",
        "**Auto-generated - DO NOT EDIT**",
        "",
        "**Regenerated on every `ccp` startup**",
        "",
        "---",
        "",
    ]

    if custom_rules:
        for rule_id in sorted(custom_rules.keys()):
            content.append(custom_rules[rule_id].strip())
            content.append("")
            content.append("")
            content.append("---")
            content.append("")

    output_file = config.project_root / "CLAUDE.local.md"
    output_file.write_text("\n".join(content), encoding="utf-8")
    log_success(f"Generated CLAUDE.local.md ({len(custom_rules)} custom rules)")


def main() -> None:
    """Main entry point."""
    script_dir = Path(__file__).parent.resolve()
    claude_dir = script_dir.parent
    project_root = claude_dir.parent

    config = RuleBuilderConfig(
        project_root=project_root,
        claude_dir=claude_dir,
        rules_dir=script_dir,
    )

    log_info("═══════════════════════════════════════════════════════")
    log_info("  Claude CodePro Rule Builder")
    log_info("═══════════════════════════════════════════════════════")
    log_info("")

    if not config.rules_dir.exists():
        print(f"Error: Rules directory not found at {config.rules_dir}")
        sys.exit(1)

    log_info("Loading rules...")
    log_info("")

    log_info("  📦 Standard Rules:")
    standard_rules = load_rules(config.rules_dir, "standard")

    log_info("")
    log_info("  🎨 Custom Rules:")
    custom_rules = load_rules(config.rules_dir, "custom")

    total = len(standard_rules) + len(custom_rules)
    log_info("")
    log_info(f"Total: {total} rules ({len(standard_rules)} standard, {len(custom_rules)} custom)")

    log_info("")
    log_info("Building rule files...")
    build_claude_md(config, standard_rules)
    build_claude_local_md(config, custom_rules)

    log_info("")
    log_info("═══════════════════════════════════════════════════════")
    log_success("Claude CodePro Build Complete!")
    log_info(f"   Standard: {len(standard_rules)} rules → .claude/CLAUDE.md")
    log_info(f"   Custom:   {len(custom_rules)} rules → CLAUDE.local.md")
    log_info("═══════════════════════════════════════════════════════")


if __name__ == "__main__":
    main()
