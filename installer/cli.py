"""CLI entry point and step orchestration using argparse."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from installer import __build__
from installer.context import InstallContext
from installer.errors import FatalInstallError, InstallationCancelled
from installer.steps.base import BaseStep
from installer.steps.claude_files import ClaudeFilesStep
from installer.steps.config_files import ConfigFilesStep
from installer.steps.dependencies import DependenciesStep
from installer.steps.finalize import FinalizeStep
from installer.steps.prerequisites import PrerequisitesStep
from installer.steps.shell_config import ShellConfigStep
from installer.steps.vscode_extensions import VSCodeExtensionsStep
from installer.ui import Console


def get_all_steps() -> list[BaseStep]:
    """Get all installation steps in order."""
    return [
        PrerequisitesStep(),
        ClaudeFilesStep(),
        ConfigFilesStep(),
        DependenciesStep(),
        ShellConfigStep(),
        VSCodeExtensionsStep(),
        FinalizeStep(),
    ]


def _validate_license_key(console: Console, project_dir: Path, license_key: str) -> bool:
    """Validate license key using pilot binary."""
    _ = project_dir
    bin_path = Path.home() / ".pilot" / "bin" / "pilot"

    if not bin_path.exists():
        console.warning("Pilot binary not found - skipping license validation")
        console.info("License will be validated on first run")
        return True

    with console.spinner("Validating license key..."):
        result = subprocess.run(
            [str(bin_path), "activate", license_key, "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )

    if result.returncode == 0:
        console.print()
        console.success("License activated successfully!")
        console.print()
        return True
    else:
        console.print()
        error_msg = ""
        if result.stdout:
            try:
                data = json.loads(result.stdout.strip())
                error_msg = data.get("error", "")
            except (json.JSONDecodeError, ValueError):
                pass
        if not error_msg and result.stderr:
            error_msg = result.stderr.strip()
        console.error(f"License validation failed{': ' + error_msg if error_msg else ''}")
        console.print()
        return False


def _start_trial(
    console: Console,
    project_dir: Path,
    local_mode: bool,
    local_repo_dir: Path | None,
) -> int | None:
    """Start a 7-day trial using pilot binary.

    Returns days remaining on success, None on failure.
    """
    _ = project_dir, local_mode, local_repo_dir
    bin_path = Path.home() / ".pilot" / "bin" / "pilot"

    if not bin_path.exists():
        console.error("Pilot binary not found")
        return None

    def _run_trial_start() -> int | None:
        result = subprocess.run(
            [str(bin_path), "trial", "--start", "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            return _get_trial_days_remaining(bin_path)
        output = result.stdout.strip() or result.stderr.strip()
        if output:
            try:
                data = json.loads(output)
                if data.get("error") == "trial_already_used":
                    console.error("Trial has already been used on this machine")
                    console.print("  [cyan]Subscribe at: https://pilot-shell.com[/cyan]")
                else:
                    detail = data.get("detail", data.get("error", "Unknown error"))
                    console.error(f"Failed to start trial: {detail}")
            except json.JSONDecodeError:
                console.error(f"Failed to start trial: {output}")
        else:
            console.error("Failed to start trial")
        return None

    try:
        with console.spinner("Starting trial..."):
            return _run_trial_start()
    except subprocess.TimeoutExpired:
        console.error("Trial start timed out")
        return None
    except Exception as e:
        console.error(f"Failed to start trial: {e}")
        return None


def _get_trial_days_remaining(bin_path: Path) -> int:
    """Get remaining trial days from pilot CLI. Defaults to 7 on failure."""
    try:
        result = subprocess.run(
            [str(bin_path), "trial", "--check", "--json"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout.strip())
            return int(data.get("days_remaining", 7))
    except (subprocess.SubprocessError, json.JSONDecodeError, OSError, ValueError):
        pass
    return 7


def _check_trial_used(
    project_dir: Path,
    local_mode: bool,
    local_repo_dir: Path | None,
) -> tuple[bool | None, bool]:
    """Check if trial has been used via pilot binary."""
    _ = project_dir, local_mode, local_repo_dir
    bin_path = Path.home() / ".pilot" / "bin" / "pilot"

    if not bin_path.exists():
        return None, False

    try:
        result = subprocess.run(
            [str(bin_path), "trial", "--check", "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = result.stdout.strip() or result.stderr.strip()
        if output:
            data = json.loads(output)
            trial_used = data.get("trial_used", False)
            can_reactivate = data.get("can_reactivate", False)
            return trial_used, can_reactivate
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError):
        pass
    return None, False


def _get_license_info(
    project_dir: Path,
    local: bool = False,
    local_repo_dir: Path | None = None,
    console: Console | None = None,
) -> dict | None:
    """Get current license information using pilot binary."""
    _ = project_dir, local, local_repo_dir, console
    bin_path = Path.home() / ".pilot" / "bin" / "pilot"

    if not bin_path.exists():
        return None

    def _run_status() -> dict | None:
        try:
            result = subprocess.run(
                [str(bin_path), "status", "--json"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            output = result.stdout.strip() or result.stderr.strip()
            if output:
                data = json.loads(output)
                if not data.get("success", True) and "expired" in data.get("error", "").lower():
                    data["is_expired"] = True
                return data
        except (subprocess.SubprocessError, json.JSONDecodeError):
            pass
        return None

    if console:
        with console.spinner("Checking license status..."):
            return _run_status()
    else:
        return _run_status()


def run_installation(ctx: InstallContext) -> None:
    """Execute all installation steps."""
    ui = ctx.ui
    steps = get_all_steps()

    if ui:
        ui.set_total_steps(len(steps))

    for step in steps:
        if ui:
            ui.step(step.name.replace("_", " ").title())

        if step.check(ctx):
            if ui:
                ui.info(f"Already complete, skipping")
            continue

        try:
            step.run(ctx)
        except KeyboardInterrupt:
            raise InstallationCancelled(step.name) from None
        ctx.mark_completed(step.name)


def _prompt_license_key(
    console: Console,
    project_dir: Path,
    max_attempts: int = 3,
) -> bool:
    """Prompt user for license key with retry logic."""
    for attempt in range(max_attempts):
        license_key = console.input("Enter your license key").strip()
        if not license_key:
            console.error("License key is required")
            if attempt < max_attempts - 1:
                console.print("  [dim]Please try again.[/dim]")
            continue

        validated = _validate_license_key(console, project_dir, license_key)
        if validated:
            return True
        if attempt < max_attempts - 1:
            console.print()
            console.print("  [dim]Please check your license key and try again.[/dim]")
            console.print("  [dim]Subscribe: https://pilot-shell.com[/dim]")
            console.print()

    console.print()
    console.error(f"License validation failed after {max_attempts} attempts.")
    console.print("  [bold]Subscribe at:[/bold] [cyan]https://pilot-shell.com[/cyan]")
    console.print()
    return False


def _handle_license_flow(
    console: Console,
    project_dir: Path,
    local_mode: bool,
    local_repo_dir: Path | None,
    license_info: dict | None,
    license_acknowledged: bool,
) -> int | None:
    """Handle license verification flow. Returns exit code if should exit, None to continue."""
    if license_acknowledged and license_info:
        tier = license_info.get("tier", "unknown")
        is_expired = license_info.get("is_expired", False)

        if tier == "trial" and is_expired:
            console.print()
            console.print("  [cyan]Subscribe at: https://pilot-shell.com[/cyan]")
            console.print()
            console.print("  [bold]Enter your license key to continue:[/bold]")
            console.print()
            if not _prompt_license_key(console, project_dir):
                return 1
            console.print()
        return None

    console.print()

    with console.spinner("Checking trial eligibility..."):
        trial_used, can_reactivate = _check_trial_used(project_dir, local_mode, local_repo_dir)
    if trial_used is None:
        trial_used = False

    if trial_used and not can_reactivate:
        console.print("  [bold yellow]Trial has expired on this machine.[/bold yellow]")
        console.print("  [cyan]Subscribe at: https://pilot-shell.com[/cyan]")
        console.print()
        console.print("  Please enter a license key to continue.")
        console.print()
        if not _prompt_license_key(console, project_dir):
            return 1
    else:
        days = _start_trial(console, project_dir, local_mode, local_repo_dir)
        if days is not None:
            console.print()
            if days > 0:
                console.success(f"Your {days}-day trial has started!")
                console.print(f"  All features are unlocked for {days} days.")
            else:
                console.success("Your trial is active!")
                console.print("  Trial ends today.")
            console.print()
            console.print("  [bold]Subscribe after trial:[/bold] [cyan]https://pilot-shell.com[/cyan]")
            console.print()
        else:
            console.print()
            console.warning("Could not start trial. Enter a license key to continue.")
            console.print()
            if not _prompt_license_key(console, project_dir):
                return 1

    return None


def cmd_install(args: argparse.Namespace) -> int:
    """Install Pilot Shell."""
    console = Console(non_interactive=args.non_interactive, quiet=args.quiet)

    effective_local_repo_dir = args.local_repo_dir if args.local_repo_dir else (Path.cwd() if args.local else None)
    skip_prompts = args.non_interactive
    project_dir = Path.cwd()

    license_info = _get_license_info(project_dir, args.local, effective_local_repo_dir, console)
    license_acknowledged = license_info is not None and license_info.get("tier") in (
        "trial",
        "solo",
        "team",
        "standard",
        "enterprise",
    )

    console.banner(license_info=license_info)

    if not skip_prompts:
        exit_code = _handle_license_flow(
            console, project_dir, args.local, effective_local_repo_dir, license_info, license_acknowledged
        )
        if exit_code is not None:
            return exit_code

    ctx = InstallContext(
        project_dir=project_dir,
        non_interactive=args.non_interactive,
        skip_env=args.skip_env,
        local_mode=args.local,
        local_repo_dir=effective_local_repo_dir,
        is_local_install=args.local_system,
        target_version=args.target_version,
        ui=console,
    )

    try:
        run_installation(ctx)
    except FatalInstallError as e:
        console.error(f"Installation failed: {e}")
        return 1
    except InstallationCancelled as e:
        console.warning(f"Installation cancelled during: {e.step_name}")
        console.info("Run the installer again to resume from where you left off")
        return 130
    except KeyboardInterrupt:
        console.warning("Installation cancelled")
        return 130

    return 0


def cmd_version(_args: argparse.Namespace) -> int:
    """Show version information."""
    print(f"pilot-installer (build: {__build__})")
    return 0


def find_pilot_binary() -> Path | None:
    """Find the pilot binary in ~/.pilot/bin/."""
    binary_path = Path.home() / ".pilot" / "bin" / "pilot"
    if binary_path.exists():
        return binary_path
    return None


def cmd_launch(args: argparse.Namespace) -> int:
    """Launch Claude Code via pilot binary."""
    claude_args = args.args or []

    pilot_path = find_pilot_binary()
    if pilot_path:
        cmd = [str(pilot_path)] + claude_args
    else:
        cmd = ["claude"] + claude_args

    return subprocess.call(cmd)


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        prog="installer",
        description="Pilot Shell Installer",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    install_parser = subparsers.add_parser("install", help="Install Pilot Shell")
    install_parser.add_argument(
        "-n",
        "--non-interactive",
        action="store_true",
        help="Run without interactive prompts",
    )
    install_parser.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="Minimal output (for updates)",
    )
    install_parser.add_argument(
        "--skip-env",
        action="store_true",
        help="Skip environment setup (API keys)",
    )
    install_parser.add_argument(
        "--local",
        action="store_true",
        help="Use local files instead of downloading",
    )
    install_parser.add_argument(
        "--local-repo-dir",
        type=Path,
        default=None,
        help="Local repository directory",
    )
    install_parser.add_argument(
        "--local-system",
        action="store_true",
        help="Local installation (not in container)",
    )
    install_parser.add_argument(
        "--target-version",
        type=str,
        default=None,
        help="Target version/tag for downloads (e.g., dev-abc1234-20260124)",
    )
    install_parser.add_argument(
        "--restart-ccp",
        action="store_true",
        help=argparse.SUPPRESS,
    )

    subparsers.add_parser("version", help="Show version information")

    launch_parser = subparsers.add_parser("launch", help="Launch Claude Code via pilot binary")
    launch_parser.add_argument(
        "args",
        nargs="*",
        help="Arguments to pass to claude",
    )

    return parser


def main() -> None:
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()

    if args.command == "install":
        sys.exit(cmd_install(args))
    elif args.command == "version":
        sys.exit(cmd_version(args))
    elif args.command == "launch":
        sys.exit(cmd_launch(args))
    else:
        parser.print_help()
        sys.exit(0)


if __name__ == "__main__":
    main()
