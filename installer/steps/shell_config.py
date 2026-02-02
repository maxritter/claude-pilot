"""Shell config step - configures shell with claude alias."""

from __future__ import annotations

from pathlib import Path

from installer.context import InstallContext
from installer.platform_utils import get_shell_config_files
from installer.steps.base import BaseStep

OLD_CCP_MARKER = "# Claude CodePro alias"
CLAUDE_ALIAS_MARKER = "# Claude Pilot"
PILOT_BIN = "$HOME/.pilot/bin/pilot"


def get_alias_lines(shell_type: str) -> str:
    """Get both claude and ccp alias lines for the given shell type."""
    _ = shell_type
    return f'{CLAUDE_ALIAS_MARKER}\nalias claude="{PILOT_BIN}"\nalias ccp="{PILOT_BIN}"'


def alias_exists_in_file(config_file: Path) -> bool:
    """Check if claude alias already exists in config file."""
    if not config_file.exists():
        return False
    content = config_file.read_text()
    return (
        CLAUDE_ALIAS_MARKER in content
        or OLD_CCP_MARKER in content
        or "alias ccp" in content
        or "alias claude" in content
    )


def remove_old_alias(config_file: Path) -> bool:
    """Remove old ccp/claude alias from config file to allow clean update."""
    if not config_file.exists():
        return False

    content = config_file.read_text()
    has_old = (
        OLD_CCP_MARKER in content
        or CLAUDE_ALIAS_MARKER in content
        or "alias ccp" in content
        or "alias claude" in content
        or "ccp()" in content
        or "claude()" in content
        or "function ccp" in content
        or "function claude" in content
    )
    if not has_old:
        return False

    lines = content.split("\n")
    new_lines = []
    inside_function = False
    brace_count = 0

    for line in lines:
        stripped = line.strip()

        if OLD_CCP_MARKER in line or CLAUDE_ALIAS_MARKER in line:
            continue

        if (
            stripped.startswith("alias ccp=")
            or stripped.startswith("alias claude=")
            or stripped.startswith("alias ccp ")
            or stripped.startswith("alias claude ")
        ):
            continue

        if stripped.startswith("ccp()") or stripped == "ccp () {":
            inside_function = True
            brace_count = 0
        elif stripped.startswith("claude()") or stripped == "claude () {":
            inside_function = True
            brace_count = 0

        if inside_function:
            brace_count += line.count("{") - line.count("}")
            if brace_count <= 0:
                inside_function = False
            continue

        if stripped.startswith("function ccp") or stripped.startswith("function claude"):
            inside_function = True
            continue

        if inside_function and stripped == "end":
            inside_function = False
            continue

        if not inside_function:
            new_lines.append(line)

    final_lines = []
    prev_blank = False
    for line in new_lines:
        is_blank = line.strip() == ""
        if is_blank and prev_blank:
            continue
        final_lines.append(line)
        prev_blank = is_blank

    config_file.write_text("\n".join(final_lines))
    return True


class ShellConfigStep(BaseStep):
    """Step that configures shell with claude alias."""

    name = "shell_config"

    def check(self, ctx: InstallContext) -> bool:
        """Always return False to ensure alias is updated on every install."""
        _ = ctx
        return False

    def run(self, ctx: InstallContext) -> None:
        """Configure shell with claude alias."""
        ui = ctx.ui
        config_files = get_shell_config_files()
        modified_files: list[str] = []
        needs_reload = False

        if ui:
            ui.status("Configuring shell alias...")

        for config_file in config_files:
            if not config_file.exists():
                continue

            alias_existed = alias_exists_in_file(config_file)
            if alias_existed:
                remove_old_alias(config_file)

            shell_type = "fish" if "fish" in config_file.name else "bash"
            alias_lines = get_alias_lines(shell_type)

            try:
                with open(config_file, "a") as f:
                    f.write(f"\n{alias_lines}\n")
                modified_files.append(str(config_file))
                if ui:
                    if alias_existed:
                        ui.success(f"Updated alias in {config_file.name}")
                    else:
                        ui.success(f"Added alias to {config_file.name}")
                        needs_reload = True
            except (OSError, IOError) as e:
                if ui:
                    ui.warning(f"Could not modify {config_file.name}: {e}")

        ctx.config["modified_shell_configs"] = modified_files

        if ui and needs_reload and not ui.quiet:
            ui.print()
            ui.status("To use the 'claude' command, reload your shell:")
            ui.print("  source ~/.bashrc  # or ~/.zshrc")
