"""Finalize step - runs final cleanup tasks and displays success."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

from installer import __version__
from installer.context import InstallContext
from installer.steps.base import BaseStep


def _get_pilot_version() -> str:
    """Get version from Pilot binary, fallback to installer version."""
    pilot_path = Path.home() / ".pilot" / "bin" / "pilot"
    if pilot_path.exists():
        try:
            result = subprocess.run(
                [str(pilot_path), "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                match = re.search(r"Pilot v(.+)$", result.stdout.strip())
                if match:
                    return match.group(1)
        except Exception:
            pass
    return __version__


class FinalizeStep(BaseStep):
    """Step that runs final cleanup tasks and displays success panel."""

    name = "finalize"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - finalize always runs."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Run final cleanup tasks and display success."""
        self._display_success(ctx)

    def _display_success(self, ctx: InstallContext) -> None:
        """Display success panel with next steps."""
        ui = ctx.ui

        if not ui:
            return

        if ui.quiet:
            ui.print(f"  [green]✓[/green] Update complete (v{_get_pilot_version()})")
            return

        steps: list[tuple[str, str]] = []

        if ctx.is_local_install and ctx.config.get("shell_needs_reload"):
            modified = ctx.config.get("modified_shell_configs", [])
            reload_cmds = []
            for f in modified:
                if ".zshrc" in f:
                    reload_cmds.append("source ~/.zshrc")
                elif ".bashrc" in f:
                    reload_cmds.append("source ~/.bashrc")
                elif "fish" in f:
                    reload_cmds.append("source ~/.config/fish/config.fish")

            if reload_cmds:
                cmd_str = " or ".join(reload_cmds)
                steps.append(
                    (
                        "Reload your shell",
                        f"Run: {cmd_str} (or restart terminal)",
                    )
                )
        else:
            project_slug = ctx.project_dir.name.lower().replace(" ", "-").replace("_", "-")
            steps.append(
                (
                    "Connect to dev container",
                    f"Option A: Use VS Code's integrated terminal (required for image pasting)\n"
                    f"     Option B: Use your favorite terminal (iTerm, Warp, etc.) and run:\n"
                    f'     docker exec -it $(docker ps --filter "name={project_slug}" -q) zsh',
                )
            )

        steps.extend(
            [
                ("Start Claude Pilot", "Run: pilot (in your project folder)"),
                ("Connect IDE", "Run: /ide → Enables real-time diagnostics"),
            ]
        )

        steps.append(
            (
                "Custom MCP Servers (Optional)",
                "Add lightweight servers to .mcp.json (instructions load into context)\n"
                "     Add heavy servers to mcp_servers.json (zero context cost via mcp-cli)\n"
                "     Then run /sync to generate documentation.",
            )
        )

        if ctx.is_local_install:
            steps.append(
                (
                    "Claude Pilot Console",
                    "Open http://localhost:41777 → Browse specifications, memories, sessions and search",
                )
            )
        else:
            steps.append(
                (
                    "Claude Pilot Console",
                    "Open http://localhost:41777 → Browse specifications, memories, sessions and search\n"
                    "     (Check VS Code Ports tab if 41777 is unavailable - may be another port)",
                )
            )

        steps.extend(
            [
                (
                    "Spec-Driven Mode",
                    '/spec "your task" → For new features with planning and verification',
                ),
                (
                    "Quick Mode",
                    "Just chat → For bug fixes and small changes without a spec",
                ),
                (
                    "Multi-Session",
                    "Run multiple pilot sessions in the same project — each session is isolated",
                ),
                (
                    "Team Vault (Optional)",
                    "/vault → Share rules, commands, and skills via a private Git repository",
                ),
            ]
        )

        ui.next_steps(steps)

        if not ui.quiet:
            ui.rule()
            ui.print()
            ui.print("  [bold yellow]⭐ Star this repo:[/bold yellow] https://github.com/maxritter/claude-pilot")
            ui.print()
            ui.print(f"  [dim]Installed version: {_get_pilot_version()}[/dim]")
            ui.print()
