"""
Shell Configuration Functions - Aliases and shell environment setup

Manages shell RC files and aliases across bash, zsh, and fish
"""

from __future__ import annotations

import re
from pathlib import Path

from . import ui


def add_shell_alias(
    shell_file: Path,
    alias_cmd: str,
    shell_name: str,
    alias_name: str,
    project_dir: Path,
) -> None:
    """
    Add or update alias in a shell configuration file.

    Args:
        shell_file: Shell configuration file path (e.g., ~/.bashrc)
        alias_cmd: Alias command to add
        shell_name: Shell name for display (e.g., ".bashrc")
        alias_name: Alias name (e.g., "ccp")
        project_dir: Project directory path (for unique marker)
    """
    if not shell_file.exists():
        return

    content = shell_file.read_text()
    marker = f"# Claude CodePro alias - {project_dir}"
    alias_pattern = re.compile(rf"^alias {re.escape(alias_name)}=", re.MULTILINE)

    if marker in content:
        # Update existing marker section
        lines = content.split("\n")
        new_lines = []
        in_section = False

        for line in lines:
            if line == marker:
                in_section = True
                new_lines.append(marker)
                new_lines.append(alias_cmd)
            elif in_section and alias_pattern.match(line):
                in_section = False
                continue
            else:
                new_lines.append(line)

        shell_file.write_text("\n".join(new_lines))
        ui.print_success(f"Updated alias '{alias_name}' in {shell_name}")

    elif alias_pattern.search(content):
        # Replace existing alias (not created by us) with our marker + alias
        lines = content.split("\n")
        new_lines = []

        for line in lines:
            if alias_pattern.match(line):
                new_lines.append(marker)
                new_lines.append(alias_cmd)
            else:
                new_lines.append(line)

        shell_file.write_text("\n".join(new_lines))
        ui.print_success(f"Updated existing alias '{alias_name}' in {shell_name}")

    else:
        # No existing alias, add new one
        with open(shell_file, "a") as f:
            f.write(f"\n{marker}\n{alias_cmd}\n")
        ui.print_success(f"Added alias '{alias_name}' to {shell_name}")


def add_cc_alias(project_dir: Path) -> None:
    """
    Add 'ccp' alias to all detected shells.

    Creates an alias that:
    - Changes to project directory
    - Loads NVM
    - Builds rules
    - Starts Claude Code with dotenvx

    Args:
        project_dir: Project directory path
    """
    alias_name = "ccp"

    ui.print_status(f"Configuring shell for NVM and '{alias_name}' alias...")
    home = Path.home()
    bash_alias = (
        f"alias {alias_name}=\"cd '{project_dir}' && "
        f'nvm use 22 && python3 .claude/rules/build.py &>/dev/null && clear && dotenvx run -- claude"'
    )

    add_shell_alias(home / ".bashrc", bash_alias, ".bashrc", alias_name, project_dir)
    add_shell_alias(home / ".zshrc", bash_alias, ".zshrc", alias_name, project_dir)

    # Fish shell uses different syntax
    fish_config = home / ".config" / "fish" / "config.fish"
    fish_alias = (
        f"alias {alias_name}=\"cd '{project_dir}'; and "
        f'nvm use 22; and python3 .claude/rules/build.py &>/dev/null; and clear; and dotenvx run -- claude"'
    )
    add_shell_alias(fish_config, fish_alias, "config.fish", alias_name, project_dir)

    print("")
    ui.print_success(f"Alias '{alias_name}' configured!")
    print(f"   Run '{alias_name}' from anywhere to start Claude Code for this project")
