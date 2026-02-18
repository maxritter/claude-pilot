"""Dependencies step - installs required tools and packages."""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path
from typing import Any

from installer.context import InstallContext
from installer.platform_utils import command_exists, is_linux_arm64, is_macos_arm64, npm_global_cmd
from installer.steps.base import BaseStep

VEXOR_FORK_URL = "https://github.com/maxritter/vexor.git"
VEXOR_MLX_BRANCH = "mlx-support"

MAX_RETRIES = 3
RETRY_DELAY = 2


def _run_bash_with_retry(command: str, cwd: Path | None = None, timeout: int = 120) -> bool:
    """Run a bash command with retry logic for transient failures."""
    for attempt in range(MAX_RETRIES):
        try:
            subprocess.run(
                ["bash", "-c", command],
                check=True,
                capture_output=True,
                cwd=cwd,
                timeout=timeout,
            )
            return True
        except subprocess.CalledProcessError:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            continue
        except subprocess.TimeoutExpired:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            continue
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

    for tool in tools:
        if not command_exists(tool):
            if not _run_bash_with_retry(f"uv tool install {tool}"):
                return False
    return True


def _get_forced_claude_version() -> str | None:
    """Check ~/.claude/settings.json for FORCE_CLAUDE_VERSION in env section."""
    settings_path = Path.home() / ".claude" / "settings.json"
    if settings_path.exists():
        try:
            settings = json.loads(settings_path.read_text())
            return settings.get("env", {}).get("FORCE_CLAUDE_VERSION")
        except (json.JSONDecodeError, OSError):
            pass
    return None


def _clean_npm_stale_dirs() -> None:
    """Remove stale .claude-code-* temp dirs that cause npm ENOTEMPTY errors."""
    import shutil

    if not command_exists("npm"):
        return

    try:
        result = subprocess.run(
            ["npm", "root", "-g"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return

        node_modules_dir = Path(result.stdout.strip())
        anthropic_dir = node_modules_dir / "@anthropic-ai"
        if not anthropic_dir.exists():
            return

        for stale_dir in anthropic_dir.glob(".claude-code-*"):
            if stale_dir.is_dir():
                shutil.rmtree(stale_dir, ignore_errors=True)
    except Exception:
        pass


def _get_installed_claude_version() -> str | None:
    """Probe the actual installed Claude Code version via claude --version."""
    try:
        result = subprocess.run(
            ["claude", "--version"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def install_claude_code(ui: Any = None) -> tuple[bool, str]:
    """Install/upgrade Claude Code CLI via npm and configure defaults."""
    _clean_npm_stale_dirs()

    forced_version = _get_forced_claude_version()
    version = forced_version if forced_version else "latest"

    if version != "latest":
        npm_cmd = npm_global_cmd(f"npm install -g @anthropic-ai/claude-code@{version}")
        if ui:
            ui.status(f"Installing Claude Code v{version}...")
    else:
        npm_cmd = npm_global_cmd("npm install -g @anthropic-ai/claude-code")
        if ui:
            ui.status("Installing Claude Code...")

    if not _run_bash_with_retry(npm_cmd):
        if command_exists("claude"):
            actual_version = _get_installed_claude_version()
            return True, actual_version or version
        return False, version

    return True, version


def _configure_vexor_defaults() -> bool:
    """Configure Vexor with recommended defaults for semantic search (OpenAI)."""

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


def _is_vexor_local_model_installed() -> bool:
    """Check if the local embedding model is already downloaded."""
    cache_dirs = [
        Path.home() / ".vexor" / "models",
        Path.home() / ".cache" / "huggingface" / "hub",
        Path.home() / ".cache" / "torch" / "sentence_transformers",
    ]
    model_name = "intfloat--multilingual-e5-small"

    for cache_dir in cache_dirs:
        if cache_dir.exists():
            for model_dir in cache_dir.glob(f"*{model_name}*"):
                if model_dir.is_dir():
                    return True
            for model_dir in cache_dir.glob(f"models--{model_name}*"):
                if model_dir.is_dir():
                    return True
    return False


def _is_vexor_mlx_installed() -> bool:
    """Check if vexor is installed with MLX support (not the CPU-only version).

    Uses uv to inspect vexor's tool environment — no python3 assumption needed.
    """
    if not command_exists("vexor"):
        return False

    try:
        dir_result = subprocess.run(
            ["uv", "tool", "dir"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if dir_result.returncode != 0:
            return False
        vexor_env = Path(dir_result.stdout.strip()) / "vexor"
        if not vexor_env.exists():
            return False

        result = subprocess.run(
            ["uv", "pip", "show", "mlx-embedding-models", "--python", str(vexor_env)],
            capture_output=True,
            text=True,
            timeout=15,
        )
        return result.returncode == 0
    except Exception:
        return False


def _clone_vexor_fork() -> Path | None:
    """Clone the vexor fork with MLX support to ~/.pilot/vexor."""
    vexor_dir = Path.home() / ".pilot" / "vexor"

    if vexor_dir.exists():
        try:
            subprocess.run(
                ["git", "fetch", "origin", VEXOR_MLX_BRANCH],
                capture_output=True,
                cwd=vexor_dir,
                timeout=60,
            )
            subprocess.run(
                ["git", "checkout", VEXOR_MLX_BRANCH],
                capture_output=True,
                cwd=vexor_dir,
                timeout=30,
            )
            subprocess.run(
                ["git", "pull", "origin", VEXOR_MLX_BRANCH],
                capture_output=True,
                cwd=vexor_dir,
                timeout=60,
            )
            return vexor_dir
        except Exception:
            return None

    try:
        vexor_dir.parent.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            ["git", "clone", "--branch", VEXOR_MLX_BRANCH, "--single-branch", VEXOR_FORK_URL, str(vexor_dir)],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            return vexor_dir
    except Exception:
        pass
    return None


def _install_vexor_from_local(vexor_dir: Path, extra: str = "local-mlx") -> bool:
    """Install vexor from a local clone with the specified extra."""
    cmd = f'uv tool install "{vexor_dir}[{extra}]" --reinstall'
    return _run_bash_with_retry(cmd, timeout=300)


def _setup_vexor_local_model(ui: Any = None) -> bool:
    """Download and setup the local embedding model for Vexor."""
    if _is_vexor_local_model_installed():
        return True

    cmd = ["vexor", "local", "--setup", "--model", "intfloat/multilingual-e5-small"]
    for attempt in range(MAX_RETRIES):
        try:
            if ui:
                with ui.spinner("Downloading local embedding model..."):
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            else:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                return True
        except Exception:
            pass
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_DELAY)
    return False


def install_vexor(use_local: bool = False, ui: Any = None) -> bool:
    """Install Vexor semantic search tool and configure defaults.

    On macOS arm64, installs from fork with MLX support for Apple Silicon GPU.
    On other platforms, installs the standard CPU-based local embeddings.
    """
    if use_local:
        if is_macos_arm64():
            return _install_vexor_mlx(ui)

        if command_exists("vexor") and _is_vexor_local_model_installed():
            _configure_vexor_local()
            return True
        if not command_exists("vexor"):
            if not _run_bash_with_retry("uv tool install 'vexor[local]'"):
                return False
        _configure_vexor_local()
        return _setup_vexor_local_model(ui)
    else:
        if command_exists("vexor"):
            _configure_vexor_defaults()
            return True
        _configure_vexor_defaults()
        return True


def _install_vexor_mlx(ui: Any = None) -> bool:
    """Install Vexor with MLX support from fork for macOS Apple Silicon."""
    if _is_vexor_mlx_installed() and _is_vexor_local_model_installed():
        _configure_vexor_local()
        return True

    vexor_dir = _clone_vexor_fork()
    if vexor_dir is None:
        if ui:
            ui.warning("Could not clone MLX fork — falling back to CPU embeddings")
        if not command_exists("vexor"):
            if not _run_bash_with_retry("uv tool install 'vexor[local]'"):
                return False
        _configure_vexor_local()
        return _setup_vexor_local_model(ui)

    if not _install_vexor_from_local(vexor_dir, extra="local-mlx"):
        if ui:
            ui.warning("MLX install failed — falling back to CPU embeddings")
        if not _run_bash_with_retry("uv tool install 'vexor[local]'"):
            return False
        _configure_vexor_local()
        return _setup_vexor_local_model(ui)

    _configure_vexor_local()
    return _setup_vexor_local_model(ui)


def install_mcp_cli() -> bool:
    """Install mcp-cli for MCP server interaction.

    Checks if already installed (via npm or bun) before attempting install.
    Prefers bun for installation, falls back to npm.
    """
    if command_exists("mcp-cli"):
        return True

    if command_exists("bun"):
        return _run_bash_with_retry("bun install -g https://github.com/philschmid/mcp-cli")

    return _run_bash_with_retry(npm_global_cmd("npm install -g mcp-cli"))


def install_sx() -> bool:
    """Install sx (sleuth.io skills exchange) for team asset sharing."""
    if not command_exists("sx"):
        if not _run_bash_with_retry("curl -fsSL https://raw.githubusercontent.com/sleuth-io/sx/main/install.sh | bash"):
            return False

    return True


def update_sx() -> bool:
    """Update sx to the latest version."""
    if not command_exists("sx"):
        return False

    return _run_bash_with_retry("sx update")


def _is_vtsls_installed() -> bool:
    """Check if vtsls is already installed globally."""
    try:
        result = subprocess.run(
            ["npm", "list", "-g", "@vtsls/language-server"],
            capture_output=True,
            text=True,
        )
        return result.returncode == 0 and "@vtsls/language-server" in result.stdout
    except Exception:
        return False


def install_typescript_lsp() -> bool:
    """Install TypeScript language server and compiler globally."""
    if _is_vtsls_installed():
        return True
    return _run_bash_with_retry(npm_global_cmd("npm install -g @vtsls/language-server typescript"))


def install_prettier() -> bool:
    """Install prettier code formatter globally for TypeScript/JavaScript files."""
    if command_exists("prettier"):
        return True
    return _run_bash_with_retry(npm_global_cmd("npm install -g prettier"))


def install_golangci_lint() -> bool:
    """Install golangci-lint for comprehensive Go code linting.

    Skips if Go is not installed, since golangci-lint requires it.
    Uses the official install script to place the binary in $(go env GOPATH)/bin.
    """
    if command_exists("golangci-lint"):
        return True
    if not command_exists("go"):
        return False
    install_cmd = (
        "curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh"
        " | sh -s -- -b $(go env GOPATH)/bin"
    )
    return _run_bash_with_retry(install_cmd, timeout=120)


def _is_ccusage_installed() -> bool:
    """Check if ccusage is installed globally."""
    try:
        result = subprocess.run(
            ["npm", "list", "-g", "ccusage"],
            capture_output=True,
            text=True,
        )
        return result.returncode == 0 and "ccusage" in result.stdout
    except Exception:
        return False


def install_ccusage() -> bool:
    """Install ccusage globally for usage tracking."""
    if _is_ccusage_installed():
        return True
    return _run_bash_with_retry(npm_global_cmd("npm install -g ccusage@latest"))


def _get_playwright_cache_dirs() -> list[Path]:
    """Get possible Playwright cache directories for the current platform."""
    import platform

    dirs = []
    if platform.system() == "Darwin":
        dirs.append(Path.home() / "Library" / "Caches" / "ms-playwright")
    dirs.append(Path.home() / ".cache" / "ms-playwright")
    return dirs


def _is_playwright_cli_ready() -> bool:
    """Check if playwright-cli is installed and Chromium is available."""
    if not command_exists("playwright-cli"):
        return False

    for cache_dir in _get_playwright_cache_dirs():
        if not cache_dir.exists():
            continue

        for chromium_dir in cache_dir.glob("chromium-*"):
            if (chromium_dir / "INSTALLATION_COMPLETE").exists():
                return True

        for chromium_dir in cache_dir.glob("chromium_headless_shell-*"):
            if (chromium_dir / "INSTALLATION_COMPLETE").exists():
                return True

    return False


def _install_playwright_system_deps(ui: Any = None) -> bool:
    """Install OS-level system dependencies required by Playwright browsers.

    Runs 'npx playwright install-deps' which installs system libraries
    (libglib, libatk, etc.) needed by Chromium. Required on Linux/devcontainers,
    no-op on macOS.
    """
    cmd = ["npx", "-y", "playwright", "install-deps"]
    for attempt in range(MAX_RETRIES):
        try:
            if ui:
                with ui.spinner("Installing browser system dependencies..."):
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            else:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                return True
        except Exception:
            pass
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_DELAY)
    return False


def install_playwright_cli(ui: Any = None) -> bool:
    """Install playwright-cli for headless browser automation.

    Shows verbose output during installation with download progress.
    Skips verbose output if already installed.
    On Linux ARM64, installs chromium specifically (Chrome has no ARM64 builds).
    """
    if _is_playwright_cli_ready():
        return True

    if not _run_bash_with_retry(npm_global_cmd("npm install -g @playwright/cli@latest")):
        return False

    if _is_playwright_cli_ready():
        _install_playwright_system_deps(ui)
        return True

    install_cmd = ["playwright-cli", "install", "chromium"] if is_linux_arm64() else ["playwright-cli", "install"]

    for attempt in range(MAX_RETRIES):
        try:
            if ui:
                with ui.spinner("Downloading Chromium browser..."):
                    result = subprocess.run(install_cmd, capture_output=True, text=True, timeout=300)
            else:
                result = subprocess.run(install_cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                break
        except Exception:
            pass
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_DELAY)
            continue
        return False

    _install_playwright_system_deps(ui)
    return True


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


def _install_plugin_dependencies(_project_dir: Path, ui: Any = None) -> bool:
    """Install plugin dependencies by running bun/npm install in the plugin folder.

    This installs all Node.js dependencies defined in plugin/package.json,
    which includes runtime dependencies for MCP servers and hooks.
    """
    plugin_dir = Path.home() / ".claude" / "pilot"

    if not plugin_dir.exists():
        if ui:
            ui.warning("Plugin directory not found - skipping plugin dependencies")
        return False

    package_json = plugin_dir / "package.json"
    if not package_json.exists():
        if ui:
            ui.warning("No package.json in plugin directory - skipping")
        return False

    success = False

    if command_exists("bun"):
        if _run_bash_with_retry("bun install", cwd=plugin_dir):
            success = True

    return success


def _setup_pilot_memory(ui: Any) -> bool:
    """Setup pilot-memory (no-op, kept for compatibility)."""
    return True


def _install_claude_code_with_ui(ui: Any) -> bool:
    """Install Claude Code with UI feedback."""
    if ui:
        ui.status("Installing Claude Code via npm...")
        success, version = install_claude_code(ui)
        if success:
            if version != "latest":
                ui.success(f"Claude Code installed (pinned to v{version})")
                ui.info(f"Version {version} is the last stable release tested with Pilot")
                ui.info("To change: edit FORCE_CLAUDE_VERSION in ~/.claude/settings.json")
            else:
                ui.success("Claude Code installed (latest)")
        else:
            ui.warning("Could not install Claude Code - please install manually")
        return success
    else:
        success, _ = install_claude_code()
        return success


def _install_playwright_cli_with_ui(ui: Any) -> bool:
    """Install playwright-cli with UI feedback."""
    if ui:
        ui.status("Installing playwright-cli...")
    if install_playwright_cli(ui):
        if ui:
            ui.success("playwright-cli installed")
        return True
    else:
        if ui:
            ui.warning("Could not install playwright-cli - please install manually")
        return False


def _install_vexor_with_ui(ui: Any) -> bool:
    """Install Vexor with local embeddings (GPU auto-detected)."""
    from installer.platform_utils import has_nvidia_gpu

    if is_macos_arm64():
        mode_str = "MLX"
    elif has_nvidia_gpu():
        mode_str = "CUDA"
    else:
        mode_str = "CPU"

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


def _extract_npx_package_name(package: str) -> str:
    """Extract npm package name without version/tag suffix.

    Examples: "fetcher-mcp" → "fetcher-mcp",
    "open-websearch@latest" → "open-websearch",
    "@upstash/context7-mcp" → "@upstash/context7-mcp",
    "@scope/pkg@1.0" → "@scope/pkg"
    """
    if package.startswith("@"):
        parts = package[1:].split("@", 1)
        return "@" + parts[0]
    return package.split("@", 1)[0]


def _is_npx_package_cached(package: str) -> bool:
    """Check if an npx package is already cached in ~/.npm/_npx/."""
    npx_cache = Path.home() / ".npm" / "_npx"
    if not npx_cache.exists():
        return False
    pkg_name = _extract_npx_package_name(package)
    for hash_dir in npx_cache.iterdir():
        candidate = hash_dir / "node_modules" / pkg_name
        if candidate.is_dir():
            return True
    return False


def _kill_proc(proc: subprocess.Popen[Any]) -> None:
    """Terminate a process, escalating to kill if needed."""
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=2)


def _precache_npx_mcp_servers(_ui: Any) -> bool:
    """Pre-cache npx-based MCP server packages so Claude Code can start them instantly.

    Reads .mcp.json from the plugin directory, finds servers that use npx,
    and installs each package into the npx cache using --package + -c "true".
    This ensures packages are fully installed (including all dependencies)
    before returning, avoiding the race condition of launching the actual
    server and killing it mid-install.
    """
    mcp_config_path = Path.home() / ".claude" / "pilot" / ".mcp.json"
    if not mcp_config_path.exists():
        return True

    try:
        config = json.loads(mcp_config_path.read_text())
    except (json.JSONDecodeError, OSError):
        return False

    servers = config.get("mcpServers", {})
    npx_packages: list[str] = []

    for server_config in servers.values():
        cmd = server_config.get("command", "")
        args = server_config.get("args", [])
        if cmd == "npx" and len(args) >= 2 and args[0] == "-y":
            npx_packages.append(args[1])

    uncached = [p for p in npx_packages if not _is_npx_package_cached(p)]
    if not uncached:
        return True

    procs: list[tuple[str, subprocess.Popen[Any]]] = []
    for package in uncached:
        try:
            proc = subprocess.Popen(
                ["npx", "-y", "--package", package, "-c", "true"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
            )
            procs.append((package, proc))
        except Exception:
            continue

    if not procs:
        return True

    max_wait = 120
    for _, proc in procs:
        try:
            proc.wait(timeout=max_wait)
        except subprocess.TimeoutExpired:
            _kill_proc(proc)

    return True


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

        if _install_with_spinner(ui, "Python tools", install_python_tools):
            installed.append("python_tools")

        if _install_claude_code_with_ui(ui):
            installed.append("claude_code")

        if _setup_pilot_memory(ui):
            installed.append("pilot_memory")

        if _install_with_spinner(ui, "Plugin dependencies", _install_plugin_dependencies, ctx.project_dir, ui):
            installed.append("plugin_deps")

        if _install_with_spinner(ui, "mcp-cli", install_mcp_cli):
            installed.append("mcp_cli")

        if _install_with_spinner(ui, "vtsls (TypeScript LSP server)", install_typescript_lsp):
            installed.append("typescript_lsp")

        if _install_with_spinner(ui, "prettier (TypeScript formatter)", install_prettier):
            installed.append("prettier")

        if _install_with_spinner(ui, "golangci-lint (Go linter)", install_golangci_lint):
            installed.append("golangci_lint")

        if _install_with_spinner(ui, "ccusage (usage tracking)", install_ccusage):
            installed.append("ccusage")

        if _install_playwright_cli_with_ui(ui):
            installed.append("playwright_cli")

        if _install_vexor_with_ui(ui):
            installed.append("vexor")

        if _install_with_spinner(ui, "sx (team assets)", install_sx):
            installed.append("sx")
            _install_with_spinner(ui, "sx update", update_sx)

        if _install_with_spinner(ui, "MCP server packages", _precache_npx_mcp_servers, ui):
            installed.append("mcp_npx_cache")

        ctx.config["installed_dependencies"] = installed
