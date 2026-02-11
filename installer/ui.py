"""UI abstraction layer - Rich wrapper with simple input prompts."""

from __future__ import annotations

import getpass
import sys
from contextlib import contextmanager
from typing import Any, Iterator, TextIO

from rich.console import Console as RichConsole
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TaskID,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)
from rich.rule import Rule
from rich.text import Text
from rich.theme import Theme

PILOT_THEME = Theme(
    {
        "info": "cyan",
        "success": "green",
        "warning": "yellow",
        "error": "red bold",
        "step": "bold magenta",
        "highlight": "bold cyan",
        "dim": "dim white",
    }
)


class ProgressTask:
    """Wrapper for Rich progress task."""

    def __init__(self, progress: Progress, task_id: TaskID):
        self._progress = progress
        self._task_id = task_id

    def advance(self, amount: int = 1) -> None:
        """Advance the progress bar."""
        self._progress.advance(self._task_id, advance=amount)

    def update(self, completed: int) -> None:
        """Update the progress to a specific value."""
        self._progress.update(self._task_id, completed=completed)


def _get_tty_input() -> TextIO:
    """Get a file handle for TTY input, even when stdin is piped.

    When running via 'curl | bash', stdin is consumed by the pipe.
    This function opens /dev/tty directly to get interactive input.
    Falls back to sys.stdin if /dev/tty is not available.
    """
    if sys.stdin.isatty():
        return sys.stdin

    try:
        return open("/dev/tty", "r")
    except OSError:
        return sys.stdin


def _get_trial_time_str(days: int | None, expires_at: str | None) -> str:
    """Get human-readable time remaining for trial."""
    if days is not None and days > 0:
        return f"{days}d"
    if days == 0 and expires_at:
        from datetime import datetime, timezone

        try:
            expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            remaining = expires_dt - datetime.now(timezone.utc)
            hours = int(remaining.total_seconds() // 3600)
            return f"{hours}h" if hours > 0 else "<1h"
        except (ValueError, AttributeError):
            pass
    return "<1d" if days == 0 else "trial"


class Console:
    """Console wrapper for Rich with simple input prompts."""

    def __init__(self, non_interactive: bool = False, quiet: bool = False):
        self._console = RichConsole(theme=PILOT_THEME)
        self._non_interactive = non_interactive
        self._quiet = quiet
        self._current_step = 0
        self._total_steps = 0
        self._tty: TextIO | None = None

    def _get_input_stream(self) -> TextIO:
        """Get the input stream for interactive prompts."""
        if self._tty is None:
            self._tty = _get_tty_input()
        return self._tty

    def close(self) -> None:
        """Close TTY handle if opened."""
        if self._tty is not None and self._tty is not sys.stdin:
            self._tty.close()
            self._tty = None

    @property
    def non_interactive(self) -> bool:
        """Check if running in non-interactive mode."""
        return self._non_interactive

    @property
    def quiet(self) -> bool:
        """Check if running in quiet mode (minimal output)."""
        return self._quiet

    def banner(self, license_info: dict[str, Any] | None = None) -> None:
        """Print the Claude Pilot banner with feature highlights.

        Args:
            license_info: Current license info dict (tier, email, etc.) or None if not yet checked.
        """
        if self._quiet:
            return

        logo = """
[bold blue]   ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗    ██████╗ ██╗██╗      ██████╗ ████████╗[/bold blue]
[bold blue]  ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝    ██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝[/bold blue]
[bold blue]  ██║     ██║     ███████║██║   ██║██║  ██║█████╗      ██████╔╝██║██║     ██║   ██║   ██║[/bold blue]
[bold blue]  ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝      ██╔═══╝ ██║██║     ██║   ██║   ██║[/bold blue]
[bold blue]  ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗    ██║     ██║███████╗╚██████╔╝   ██║[/bold blue]
[bold blue]   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝[/bold blue]
"""
        self._console.print(logo)

        tagline = Text()
        tagline.append("  ✈ ", style="cyan")
        tagline.append("Claude Code is powerful. Pilot makes it reliable.", style="bold white")
        self._console.print(tagline)
        self._console.print()

        self._console.print("  [bold white]What You're Getting[/bold white]")
        self._console.print()
        self._console.print(
            "    [yellow]♾️[/yellow]  [bold green]Endless Mode[/bold green] [white]— Seamless continuity across sessions[/white]"
        )
        self._console.print(
            "    [yellow]📋[/yellow] [bold green]Two Dev Modes[/bold green] [white]— /spec for planning, Quick Mode for fixes[/white]"
        )
        self._console.print(
            "    [yellow]💡[/yellow] [bold green]Rules System[/bold green] [white]— Standards + custom rules as project memory[/white]"
        )
        self._console.print(
            "    [yellow]🛠️[/yellow]  [bold green]Quality Hooks[/bold green] [white]— TDD, linting, type checking, context monitor[/white]"
        )
        self._console.print(
            "    [yellow]🔌[/yellow] [bold green]Capabilities[/bold green] [white]— Vexor, Context7, web-search, mcp-cli[/white]"
        )
        self._console.print()

        tier = license_info.get("tier") if license_info else None

        if tier in ("solo", "team", "standard", "enterprise"):
            tier_map = {"solo": "Solo", "standard": "Solo", "team": "Team", "enterprise": "Team"}
            tier_display = tier_map.get(tier, tier.title())
            email = license_info.get("email", "") if license_info else ""
            license_text = Text()
            license_text.append("  ✓ ", style="green")
            license_text.append(f"{tier_display} License", style="bold green")
            if email:
                license_text.append(f" — {email}", style="dim white")
            self._console.print(license_text)
        elif tier == "trial":
            days = license_info.get("days_remaining") if license_info else None
            is_expired = license_info.get("is_expired", False) if license_info else False
            license_text = Text()
            if is_expired:
                license_text.append("  ⚠ ", style="red")
                license_text.append("Trial Expired", style="bold red")
                license_text.append(" — Subscribe: ", style="dim white")
                license_text.append("https://claude-pilot.com", style="cyan")
            else:
                expires_at = license_info.get("expires_at") if license_info else None
                time_str = _get_trial_time_str(days, expires_at)
                license_text.append("  ⏳ ", style="yellow")
                license_text.append(f"Trial ({time_str} remaining)", style="bold yellow")
                license_text.append(" — Subscribe: ", style="dim white")
                license_text.append("https://claude-pilot.com", style="cyan")
            self._console.print(license_text)
            self._console.print()

    def set_total_steps(self, total: int) -> None:
        """Set total number of installation steps."""
        self._total_steps = total
        self._current_step = 0

    def step(self, name: str) -> None:
        """Print a step indicator with progress."""
        self._current_step += 1
        if self._quiet:
            self._console.print(f"  [{self._current_step}/{self._total_steps}] {name}...")
            return
        step_text = Text()
        step_text.append(f"[{self._current_step}/{self._total_steps}] ", style="bold magenta")
        step_text.append(name, style="bold white")
        self._console.print()
        self._console.print(Rule(step_text, style="magenta"))

    def status(self, message: str) -> None:
        """Print a status message in cyan with arrow."""
        if self._quiet:
            return
        self._console.print(f"  [cyan]→[/cyan] {message}")

    def success(self, message: str) -> None:
        """Print a success message in green with checkmark."""
        if self._quiet:
            return
        self._console.print(f"  [green]✓[/green] [green]{message}[/green]")

    def warning(self, message: str) -> None:
        """Print a warning message in yellow with warning symbol."""
        if self._quiet:
            return
        self._console.print(f"  [yellow]⚠[/yellow] [yellow]{message}[/yellow]")

    def error(self, message: str) -> None:
        """Print an error message in red with X symbol."""
        self._console.print(f"  [red bold]✗[/red bold] [red]{message}[/red]")

    def info(self, message: str) -> None:
        """Print an info message with info icon."""
        if self._quiet:
            return
        self._console.print(f"  [dim]ℹ[/dim] [dim]{message}[/dim]")

    def next_steps(self, steps: list[tuple[str, str]]) -> None:
        """Print a styled next steps guide."""
        if self._quiet:
            return

        self._console.print()
        self._console.print(Rule("[bold cyan]📋 Next Steps[/bold cyan]", style="cyan"))
        self._console.print()

        for i, (title, description) in enumerate(steps, 1):
            self._console.print(f"  [bold magenta]{i}.[/bold magenta] [bold]{title}[/bold]")
            self._console.print(f"     [dim]{description}[/dim]")
            self._console.print()

    @contextmanager
    def progress(self, total: int, description: str = "Processing") -> Iterator[ProgressTask]:
        """Context manager for progress bar display with time tracking."""
        with Progress(
            SpinnerColumn("dots"),
            TextColumn("[bold blue]{task.description}"),
            BarColumn(bar_width=40, style="cyan", complete_style="green"),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TextColumn("•"),
            TimeElapsedColumn(),
            TextColumn("•"),
            TimeRemainingColumn(),
            console=self._console,
            transient=True,
        ) as progress:
            task_id = progress.add_task(description, total=total)
            yield ProgressTask(progress, task_id)

    @contextmanager
    def spinner(self, message: str) -> Iterator[None]:
        """Context manager for a simple spinner."""
        with self._console.status(f"[cyan]{message}[/cyan]", spinner="dots"):
            yield

    def confirm(self, message: str, default: bool = True) -> bool:
        """Prompt for yes/no confirmation."""
        if self._non_interactive:
            return default

        default_str = "Y/n" if default else "y/N"
        self._console.print()
        self._console.print(f"  [bold cyan]?[/bold cyan] {message} \\[{default_str}]: ", end="")

        try:
            tty = self._get_input_stream()
            response = tty.readline().strip().lower()
        except (EOFError, KeyboardInterrupt, OSError):
            self._console.print()
            return default

        if not response:
            return default
        return response in ("y", "yes", "true", "1")

    def select(self, message: str, choices: list[str]) -> str:
        """Prompt for single selection from choices."""
        if self._non_interactive:
            return choices[0] if choices else ""

        self._console.print()
        self._console.print(f"  [bold cyan]?[/bold cyan] {message}")
        for i, choice in enumerate(choices, 1):
            self._console.print(f"    [bold magenta]{i}.[/bold magenta] {choice}")

        while True:
            self._console.print(f"  Enter choice [1-{len(choices)}]: ", end="")

            try:
                tty = self._get_input_stream()
                response = tty.readline().strip()
            except (EOFError, KeyboardInterrupt, OSError):
                self._console.print()
                raise SystemExit(1)

            if not response:
                continue

            try:
                idx = int(response) - 1
                if 0 <= idx < len(choices):
                    return choices[idx]
            except ValueError:
                pass

            self._console.print(f"  [yellow]Please enter a number between 1 and {len(choices)}[/yellow]")

    def input(self, message: str, default: str = "") -> str:
        """Prompt for text input."""
        if self._non_interactive:
            return default

        self._console.print()
        prompt = f"  [bold cyan]?[/bold cyan] {message}"
        if default:
            prompt += f" [{default}]"
        prompt += ": "
        self._console.print(prompt, end="")

        try:
            tty = self._get_input_stream()
            response = tty.readline().strip()
        except (EOFError, KeyboardInterrupt, OSError):
            self._console.print()
            return default

        return response if response else default

    def password(self, message: str) -> str:
        """Prompt for hidden password input."""
        if self._non_interactive:
            return ""

        self._console.print()
        self._console.print(f"  [bold cyan]?[/bold cyan] {message}: ", end="")

        try:
            tty = self._get_input_stream()
            return getpass.getpass(prompt="", stream=tty)
        except (EOFError, KeyboardInterrupt, OSError):
            self._console.print()
            return ""

    def print(self, message: str = "") -> None:
        """Print a plain message."""
        self._console.print(message)

    def rule(self, title: str = "", style: str = "dim") -> None:
        """Print a horizontal rule."""
        self._console.print(Rule(title, style=style))

    def newline(self, count: int = 1) -> None:
        """Print one or more newlines."""
        for _ in range(count):
            self._console.print()
