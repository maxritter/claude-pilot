"""Dependencies step - installs required tools and packages."""

from __future__ import annotations

import subprocess
import time
from pathlib import Path
from typing import Any

from installer.context import InstallContext
from installer.platform_utils import command_exists
from installer.steps.base import BaseStep

MAX_RETRIES = 3
RETRY_DELAY = 2


def _run_bash_with_retry(command: str, cwd: Path | None = None) -> bool:
    """Run a bash command with retry logic for transient failures."""
    for attempt in range(MAX_RETRIES):
        try:
            subprocess.run(
                ["bash", "-c", command],
                check=True,
                capture_output=True,
                cwd=cwd,
            )
            return True
        except subprocess.CalledProcessError:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            continue
    return False


def _is_plugin_installed(plugin_name: str, marketplace: str | None = None) -> bool:
    """Check if a Claude plugin is already installed.

    Args:
        plugin_name: The plugin name (e.g., "claude-mem", "context7")
        marketplace: Optional marketplace name (e.g., "customable", "claude-plugins-official")

    Returns:
        True if the plugin is installed, False otherwise.
    """
    import json

    installed_path = Path.home() / ".claude" / "plugins" / "installed_plugins.json"
    if not installed_path.exists():
        return False

    try:
        data = json.loads(installed_path.read_text())
        plugins = data.get("plugins", {})

        if marketplace:
            key = f"{plugin_name}@{marketplace}"
            return key in plugins and len(plugins[key]) > 0

        for key in plugins:
            if key.startswith(f"{plugin_name}@") and len(plugins[key]) > 0:
                return True
        return False
    except (json.JSONDecodeError, OSError):
        return False


def _is_marketplace_installed(marketplace_name: str) -> bool:
    """Check if a Claude marketplace is already installed.

    Args:
        marketplace_name: The marketplace name (e.g., "claude-plugins-official", "customable")

    Returns:
        True if the marketplace is installed, False otherwise.
    """
    import json

    marketplaces_path = Path.home() / ".claude" / "plugins" / "known_marketplaces.json"
    if not marketplaces_path.exists():
        return False

    try:
        data = json.loads(marketplaces_path.read_text())
        return marketplace_name in data
    except (json.JSONDecodeError, OSError):
        return False


def _get_nvm_source_cmd() -> str:
    """Get the command to source NVM for nvm-specific commands.

    Only needed for `nvm install`, `nvm use`, etc. - not for npm/node/claude.
    """
    nvm_locations = [
        Path.home() / ".nvm" / "nvm.sh",
        Path("/usr/local/share/nvm/nvm.sh"),
    ]

    for nvm_path in nvm_locations:
        if nvm_path.exists():
            return f"source {nvm_path} && "

    return ""


def install_nodejs() -> bool:
    """Install Node.js via NVM if not present."""
    if command_exists("node"):
        return True

    nvm_dir = Path.home() / ".nvm"
    if not nvm_dir.exists():
        if not _run_bash_with_retry("curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash"):
            return False

    nvm_src = _get_nvm_source_cmd()
    return _run_bash_with_retry(f"{nvm_src}nvm install 22 && nvm use 22")


def install_uv() -> bool:
    """Install uv package manager if not present."""
    if command_exists("uv"):
        return True

    return _run_bash_with_retry("curl -LsSf https://astral.sh/uv/install.sh | sh")


def install_python_tools() -> bool:
    """Install Python development tools."""
    tools = ["ruff", "basedpyright"]

    try:
        for tool in tools:
            if not command_exists(tool):
                subprocess.run(
                    ["uv", "tool", "install", tool],
                    check=True,
                    capture_output=True,
                )
        return True
    except subprocess.CalledProcessError:
        return False


def _remove_native_claude_binaries() -> None:
    """Remove native-installed Claude Code to avoid conflicts with npm install."""
    import shutil

    native_bin = Path.home() / ".local" / "bin" / "claude"
    native_data = Path.home() / ".local" / "share" / "claude"

    if native_bin.exists() or native_bin.is_symlink():
        try:
            native_bin.unlink()
        except Exception:
            pass

    if native_data.exists():
        shutil.rmtree(native_data, ignore_errors=True)


def _patch_claude_config(config_updates: dict) -> bool:
    """Patch ~/.claude.json with the given config updates.

    Creates the file if it doesn't exist. Merges updates with existing config.
    """
    import json

    config_path = Path.home() / ".claude.json"

    try:
        if config_path.exists():
            config = json.loads(config_path.read_text())
        else:
            config = {}

        config.update(config_updates)
        config_path.write_text(json.dumps(config, indent=2) + "\n")
        return True
    except Exception:
        return False


def _configure_claude_defaults() -> bool:
    """Configure Claude Code with recommended defaults after installation."""
    return _patch_claude_config(
        {
            "installMethod": "npm",
            "theme": "dark-ansi",
            "verbose": True,
            "autoCompactEnabled": False,
            "autoConnectIde": True,
            "respectGitignore": False,
            "autoUpdates": False,
            "claudeInChromeDefaultEnabled": False,
            "attribution": {"commit": "", "pr": ""},
        }
    )


def _get_forced_claude_version(project_dir: Path) -> str | None:
    """Check settings.local.json for FORCE_CLAUDE_VERSION in env section."""
    import json

    settings_path = project_dir / ".claude" / "settings.local.json"
    if settings_path.exists():
        try:
            settings = json.loads(settings_path.read_text())
            return settings.get("env", {}).get("FORCE_CLAUDE_VERSION")
        except (json.JSONDecodeError, OSError):
            pass
    return None


def install_claude_code(project_dir: Path, ui: Any = None) -> tuple[bool, str]:
    """Install/upgrade Claude Code CLI via npm and configure defaults."""
    _remove_native_claude_binaries()

    forced_version = _get_forced_claude_version(project_dir)
    version = forced_version if forced_version else "latest"

    if version != "latest":
        npm_cmd = f"npm install -g @anthropic-ai/claude-code@{version}"
        if ui:
            ui.status(f"Installing Claude Code v{version} via npm...")
    else:
        npm_cmd = "npm install -g @anthropic-ai/claude-code"
        if ui:
            ui.status("Installing Claude Code via npm...")

    if not _run_bash_with_retry(npm_cmd):
        return False, version

    _configure_claude_defaults()
    return True, version


def _ensure_official_marketplace() -> bool:
    """Ensure official Claude plugins marketplace is installed."""
    if _is_marketplace_installed("claude-plugins-official"):
        return True

    try:
        result = subprocess.run(
            ["bash", "-c", "claude plugin marketplace add anthropics/claude-plugins-official"],
            capture_output=True,
            text=True,
        )
        output = (result.stdout + result.stderr).lower()
        return result.returncode == 0 or "already installed" in output
    except Exception:
        return False


def _configure_claude_mem_defaults() -> bool:
    """Configure Claude Mem with recommended defaults."""
    import json

    settings_dir = Path.home() / ".claude-mem"
    settings_path = settings_dir / "settings.json"

    try:
        settings_dir.mkdir(parents=True, exist_ok=True)

        if settings_path.exists():
            settings = json.loads(settings_path.read_text())
        else:
            settings = {}

        settings.update(
            {
                "CLAUDEMD_ENABLED": "false",
                "CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED": "false",
                "RETENTION_ENABLED": "true",
                "CLAUDE_MEM_RETENTION_ENABLED": "true",
                "RETENTION_MAX_COUNT": "1000",
                "MAX_WORKERS": "1",
                "AUTO_SPAWN_WORKERS": "false",
                "CLAUDE_MEM_RETENTION_MAX_COUNT": "1000",
                "CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY": "true",
                "CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE": "true",
                "CLAUDE_MEM_CONTEXT_OBSERVATIONS": "50",
                "CLAUDE_MEM_CONTEXT_SESSION_COUNT": "10",
                "CLAUDE_MEM_CONTEXT_FULL_COUNT": "10",
                "CLAUDE_MEM_CONTEXT_FULL_FIELD": "facts",
                "CLAUDE_MEM_MODEL": "haiku",
            }
        )
        settings_path.write_text(json.dumps(settings, indent=2) + "\n")
        return True
    except Exception:
        return False


def _configure_vexor_defaults() -> bool:
    """Configure Vexor with recommended defaults for semantic search (OpenAI)."""
    import json

    config_dir = Path.home() / ".vexor"
    config_path = config_dir / "config.json"

    try:
        config_dir.mkdir(parents=True, exist_ok=True)

        if config_path.exists():
            config = json.loads(config_path.read_text())
        else:
            config = {}

        config.update(
            {
                "model": "text-embedding-3-small",
                "batch_size": 64,
                "embed_concurrency": 4,
                "extract_concurrency": 4,
                "extract_backend": "auto",
                "provider": "openai",
                "auto_index": True,
                "local_cuda": False,
                "rerank": "bm25",
            }
        )
        config_path.write_text(json.dumps(config, indent=2) + "\n")
        return True
    except Exception:
        return False


def _configure_vexor_local() -> bool:
    """Configure Vexor for local embeddings (no API key needed)."""
    import json

    config_dir = Path.home() / ".vexor"
    config_path = config_dir / "config.json"

    try:
        config_dir.mkdir(parents=True, exist_ok=True)

        if config_path.exists():
            config = json.loads(config_path.read_text())
        else:
            config = {}

        config.update(
            {
                "model": "intfloat/multilingual-e5-small",
                "batch_size": 64,
                "embed_concurrency": 4,
                "extract_concurrency": 4,
                "extract_backend": "auto",
                "provider": "local",
                "auto_index": True,
                "local_cuda": False,
                "rerank": "bm25",
            }
        )
        config_path.write_text(json.dumps(config, indent=2) + "\n")
        return True
    except Exception:
        return False


def _setup_vexor_local_model(ui: Any = None) -> bool:
    """Download and setup the local embedding model for Vexor."""
    try:
        if ui:
            with ui.spinner("Downloading local embedding model..."):
                result = subprocess.run(
                    ["vexor", "local", "--setup", "--model", "intfloat/multilingual-e5-small"],
                    capture_output=True,
                    text=True,
                )
            return result.returncode == 0
        else:
            result = subprocess.run(
                ["vexor", "local", "--setup", "--model", "intfloat/multilingual-e5-small"],
                capture_output=True,
                text=True,
            )
            return result.returncode == 0
    except Exception:
        return False


def install_vexor(use_local: bool = False, ui: Any = None) -> bool:
    """Install Vexor semantic search tool and configure defaults."""
    if use_local:
        if not _run_bash_with_retry("uv pip install 'vexor[local]'"):
            return False
        _configure_vexor_local()
        return _setup_vexor_local_model(ui)
    else:
        if command_exists("vexor"):
            _configure_vexor_defaults()
            return True
        _configure_vexor_defaults()
        return True


def _ensure_maxritter_marketplace() -> bool:
    """Ensure claude-mem marketplace points to maxritter repo.

    Checks known_marketplaces.json for customable entry. If it exists
    with maxritter URL, returns True. If it exists with wrong URL, removes it.
    """
    import json

    marketplaces_path = Path.home() / ".claude" / "plugins" / "known_marketplaces.json"

    if marketplaces_path.exists():
        try:
            data = json.loads(marketplaces_path.read_text())
            customable = data.get("customable", {})
            source = customable.get("source", {})
            url = source.get("url", "")

            if customable and "maxritter" in url:
                return True

            if customable and "maxritter" not in url:
                subprocess.run(
                    ["bash", "-c", "claude plugin marketplace rm customable"],
                    capture_output=True,
                )
        except (json.JSONDecodeError, KeyError):
            pass

    try:
        result = subprocess.run(
            ["bash", "-c", "claude plugin marketplace add https://github.com/maxritter/claude-mem.git"],
            capture_output=True,
            text=True,
        )
        output = (result.stdout + result.stderr).lower()
        return result.returncode == 0 or "already installed" in output
    except Exception:
        return False


def install_claude_mem() -> bool:
    """Install claude-mem plugin via claude plugin marketplace.

    If already installed, updates marketplace and plugin to latest version.
    """
    marketplace_existed = _is_marketplace_installed("customable")

    if not _ensure_maxritter_marketplace():
        return False

    if marketplace_existed:
        subprocess.run(
            ["bash", "-c", "claude plugin marketplace update customable"],
            capture_output=True,
        )

    if _is_plugin_installed("claude-mem", "customable"):
        subprocess.run(
            ["bash", "-c", "claude plugin update claude-mem"],
            capture_output=True,
        )
    else:
        if not _run_bash_with_retry("claude plugin install claude-mem"):
            return False

    _configure_claude_mem_defaults()
    return True


def _is_claude_mem_deps_installed() -> bool:
    """Check if claude-mem bun dependencies are already installed."""
    import json

    plugin_dir = Path.home() / ".claude" / "plugins" / "marketplaces" / "customable"
    node_modules = plugin_dir / "node_modules"
    marker_file = plugin_dir / ".install-version"

    if not node_modules.exists():
        return False

    if not marker_file.exists():
        return False

    try:
        pkg_path = plugin_dir / "package.json"
        if not pkg_path.exists():
            return False

        pkg = json.loads(pkg_path.read_text())
        marker = json.loads(marker_file.read_text())

        return pkg.get("version") == marker.get("version")
    except (json.JSONDecodeError, OSError):
        return False


def preinstall_claude_mem_deps(ui: Any = None) -> bool:
    """Pre-install bun dependencies for claude-mem to speed up first start.

    This runs `bun install` in the plugin directory and creates the version
    marker file, so the smart-install.js hook skips installation on first start.
    """
    import datetime
    import json

    plugin_dir = Path.home() / ".claude" / "plugins" / "marketplaces" / "customable"

    if not plugin_dir.exists():
        return False

    if _is_claude_mem_deps_installed():
        return True

    if not command_exists("bun"):
        return False

    if ui:
        ui.print("  [dim]Pre-installing claude-mem dependencies...[/dim]")

    try:
        process = subprocess.Popen(
            ["bun", "install"],
            cwd=plugin_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        if process.stdout:
            for line in process.stdout:
                line = line.rstrip()
                if line and ui:
                    if any(kw in line.lower() for kw in ["install", "package", "done", "+"]):
                        ui.print(f"  {line}")

        process.wait()

        if process.returncode != 0:
            return False

        pkg_path = plugin_dir / "package.json"
        marker_path = plugin_dir / ".install-version"

        if pkg_path.exists():
            pkg = json.loads(pkg_path.read_text())

            bun_version = None
            try:
                result = subprocess.run(
                    ["bun", "--version"],
                    capture_output=True,
                    text=True,
                )
                if result.returncode == 0:
                    bun_version = result.stdout.strip()
            except Exception:
                pass

            marker_data = {
                "version": pkg.get("version"),
                "bun": bun_version,
                "installedAt": datetime.datetime.now().isoformat(),
            }
            marker_path.write_text(json.dumps(marker_data))

        return True
    except Exception:
        return False


def install_context7() -> bool:
    """Install context7 plugin via claude plugin."""
    if _is_plugin_installed("context7", "claude-plugins-official"):
        return True

    if not _ensure_official_marketplace():
        return False

    return _run_bash_with_retry("claude plugin install context7")


def install_mcp_cli() -> bool:
    """Install mcp-cli via bun for MCP server interaction."""
    if not command_exists("bun"):
        return False

    return _run_bash_with_retry("bun install -g https://github.com/philschmid/mcp-cli")


def _is_agent_browser_ready() -> bool:
    """Check if agent-browser is installed and Chromium is available."""
    if not command_exists("agent-browser"):
        return False

    cache_dir = Path.home() / ".cache" / "ms-playwright"
    if not cache_dir.exists():
        return False

    for chromium_dir in cache_dir.glob("chromium-*"):
        if (chromium_dir / "chrome-linux" / "chrome").exists():
            return True
        if (chromium_dir / "chrome-mac" / "Chromium.app").exists():
            return True
        if (chromium_dir / "chrome-linux" / "headless_shell").exists():
            return True
        if (chromium_dir / "chrome-headless-shell-linux").exists():
            return True

    for headless_dir in cache_dir.glob("chromium-headless-shell-*"):
        if any(headless_dir.iterdir()):
            return True

    return False


def install_agent_browser(ui: Any = None) -> bool:
    """Install agent-browser CLI for headless browser automation.

    Shows verbose output during installation with download progress.
    Skips verbose output if already installed.
    """
    if _is_agent_browser_ready():
        return True

    if not _run_bash_with_retry("npm install -g agent-browser"):
        return False

    if _is_agent_browser_ready():
        return True

    try:
        if ui:
            with ui.spinner("Downloading Chromium browser..."):
                result = subprocess.run(
                    ["bash", "-c", "echo 'y' | agent-browser install --with-deps"],
                    capture_output=True,
                    text=True,
                )
            return result.returncode == 0
        else:
            result = subprocess.run(
                ["bash", "-c", "echo 'y' | agent-browser install --with-deps"],
                capture_output=True,
                text=True,
            )
            return result.returncode == 0
    except Exception:
        return False


def _install_with_spinner(ui: Any, name: str, install_fn: Any, *args: Any) -> bool:
    """Run an installation function with a spinner."""
    if ui:
        with ui.spinner(f"Installing {name}..."):
            result = install_fn(*args) if args else install_fn()
        if result:
            ui.success(f"{name} installed")
        else:
            ui.warning(f"Could not install {name} - please install manually")
        return result
    else:
        return install_fn(*args) if args else install_fn()


def _install_claude_mem_with_deps(ui: Any) -> bool:
    """Install claude-mem plugin and pre-install bun dependencies."""
    if not _install_with_spinner(ui, "claude-mem plugin", install_claude_mem):
        return False

    if ui:
        ui.status("Pre-installing claude-mem dependencies...")
    if preinstall_claude_mem_deps(ui):
        if ui:
            ui.success("claude-mem dependencies ready")
    else:
        if ui:
            ui.warning("Could not pre-install claude-mem deps - will install on first start")

    return True


def _install_claude_code_with_ui(ui: Any, project_dir: Path) -> bool:
    """Install Claude Code with UI feedback."""
    if ui:
        ui.status("Installing Claude Code via npm...")
        success, version = install_claude_code(project_dir, ui)
        if success:
            if version != "latest":
                ui.success(f"Claude Code installed (pinned to v{version})")
                ui.info(f"Version {version} is the last stable release tested with CCP")
                ui.info("To change: edit FORCE_CLAUDE_VERSION in .claude/settings.local.json")
            else:
                ui.success("Claude Code installed (latest)")
            ui.success("Claude Code config defaults applied")
        else:
            ui.warning("Could not install Claude Code - please install manually")
        return success
    else:
        success, _ = install_claude_code(project_dir)
        return success


def _install_agent_browser_with_ui(ui: Any) -> bool:
    """Install agent-browser with UI feedback."""
    if ui:
        ui.status("Installing agent-browser...")
    if install_agent_browser(ui):
        if ui:
            ui.success("agent-browser installed")
        return True
    else:
        if ui:
            ui.warning("Could not install agent-browser - please install manually")
        return False


def _install_vexor_with_ui(ui: Any) -> bool:
    """Install Vexor with local embeddings (GPU auto-detected)."""
    from installer.platform_utils import has_nvidia_gpu

    use_cuda = has_nvidia_gpu()
    mode_str = "CUDA" if use_cuda else "CPU"

    if ui:
        ui.status(f"Installing Vexor with local embeddings ({mode_str})...")

    if install_vexor(use_local=True, ui=ui):
        if ui:
            ui.success(f"Vexor installed with local embeddings ({mode_str})")
        return True
    else:
        if ui:
            ui.warning("Could not install Vexor - please install manually")
        return False


def _configure_web_mcp_servers(ui: Any) -> None:
    """Configure open-websearch and fetcher-mcp in ~/.claude.json."""
    import json

    claude_config_path = Path.home() / ".claude.json"

    try:
        if claude_config_path.exists():
            config = json.loads(claude_config_path.read_text())
        else:
            config = {}

        if "mcpServers" not in config:
            config["mcpServers"] = {}

        config["mcpServers"]["web-search"] = {
            "command": "npx",
            "args": ["-y", "open-websearch@latest"],
            "env": {
                "MODE": "stdio",
                "DEFAULT_SEARCH_ENGINE": "duckduckgo",
                "ALLOWED_SEARCH_ENGINES": "duckduckgo,bing,exa",
            },
        }

        config["mcpServers"]["web-fetch"] = {
            "command": "npx",
            "args": ["-y", "fetcher-mcp"],
        }

        claude_config_path.write_text(json.dumps(config, indent=2))

        if ui:
            ui.success("Web MCP servers configured (open-websearch, fetcher-mcp)")
    except Exception as e:
        if ui:
            ui.warning(f"Could not configure web MCP servers: {e}")


class DependenciesStep(BaseStep):
    """Step that installs all required dependencies."""

    name = "dependencies"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - dependencies should always be checked."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Install all required dependencies."""
        ui = ctx.ui
        installed: list[str] = []

        if _install_with_spinner(ui, "Node.js", install_nodejs):
            installed.append("nodejs")

        if _install_with_spinner(ui, "uv", install_uv):
            installed.append("uv")

        if ctx.enable_python:
            if _install_with_spinner(ui, "Python tools", install_python_tools):
                installed.append("python_tools")

        if _install_claude_code_with_ui(ui, ctx.project_dir):
            installed.append("claude_code")

        if _install_claude_mem_with_deps(ui):
            installed.append("claude_mem")

        if _install_with_spinner(ui, "Context7 plugin", install_context7):
            installed.append("context7")

        if _install_with_spinner(ui, "mcp-cli", install_mcp_cli):
            installed.append("mcp_cli")

        if ctx.enable_agent_browser:
            if _install_agent_browser_with_ui(ui):
                installed.append("agent_browser")

        if _install_vexor_with_ui(ui):
            installed.append("vexor")

        _configure_web_mcp_servers(ui)

        ctx.config["installed_dependencies"] = installed
