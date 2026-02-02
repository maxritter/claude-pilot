#!/bin/bash

set -e

REPO_PRIMARY="maxritter/claude-pilot"
REPO_FALLBACK="maxritter/claude-codepro"
REPO="$REPO_PRIMARY"

VERSION="${VERSION:-}"
VERSION="${VERSION#v}"

INSTALLER_ARGS=""
RESTART_PILOT=false
SKIP_VERSION_CHECK=false
USE_LOCAL_INSTALLER=false

while [ $# -gt 0 ]; do
	case "$1" in
	--restart-pilot)
		RESTART_PILOT=true
		shift
		;;
	--skip-version-check)
		SKIP_VERSION_CHECK=true
		shift
		;;
	--local)
		USE_LOCAL_INSTALLER=true
		SKIP_VERSION_CHECK=true
		shift
		;;
	*)
		if [ -z "$INSTALLER_ARGS" ]; then
			INSTALLER_ARGS="$1"
		else
			INSTALLER_ARGS="$INSTALLER_ARGS $1"
		fi
		shift
		;;
	esac
done

get_latest_release() {
	local repo="$1"
	local api_url="https://api.github.com/repos/${repo}/releases/latest"
	local version=""

	if command -v curl >/dev/null 2>&1; then
		version=$(curl -fsSL "$api_url" 2>/dev/null | grep -m1 '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/') || true
	elif command -v wget >/dev/null 2>&1; then
		version=$(wget -qO- "$api_url" 2>/dev/null | grep -m1 '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/') || true
	fi

	if [ -n "$version" ]; then
		echo "$version"
		return 0
	fi
	return 1
}

check_repo_exists() {
	local repo="$1"
	local version="$2"
	local api_url

	case "$version" in
	dev-*) api_url="https://api.github.com/repos/${repo}/releases/tags/${version}" ;;
	*) api_url="https://api.github.com/repos/${repo}/releases/tags/v${version}" ;;
	esac

	if command -v curl >/dev/null 2>&1; then
		curl -fsSL "$api_url" >/dev/null 2>&1 && return 0
	elif command -v wget >/dev/null 2>&1; then
		wget -q --spider "$api_url" 2>/dev/null && return 0
	fi
	return 1
}

if [ -z "$VERSION" ]; then
	echo "  [..] Fetching latest version..."
	VERSION=$(get_latest_release "$REPO_PRIMARY") || true
	if [ -z "$VERSION" ]; then
		VERSION=$(get_latest_release "$REPO_FALLBACK") || true
		if [ -n "$VERSION" ]; then
			REPO="$REPO_FALLBACK"
		fi
	fi
	if [ -z "$VERSION" ]; then
		echo "  [!!] Failed to fetch latest version from GitHub."
		echo "  [!!] Please specify a version: VERSION=5.4.12 curl ... | bash"
		exit 1
	fi
	echo "  [OK] Latest version: $VERSION"
else
	echo "  Using specified version: $VERSION"
	if [ "$SKIP_VERSION_CHECK" = true ]; then
		echo "  [..] Skipping version check (--skip-version-check)"
		# Default to fallback repo for dev versions when skipping check
		REPO="$REPO_FALLBACK"
	elif ! check_repo_exists "$REPO_PRIMARY" "$VERSION"; then
		if check_repo_exists "$REPO_FALLBACK" "$VERSION"; then
			REPO="$REPO_FALLBACK"
			echo "  [..] Using fallback repository: $REPO_FALLBACK"
		else
			echo "  [!!] Version $VERSION not found in either repository."
			echo "  [!!] Please verify the version exists at:"
			echo "       https://github.com/${REPO_PRIMARY}/releases"
			echo "  [!!] If you're rate-limited, try: --skip-version-check"
			exit 1
		fi
	fi
fi

case "$VERSION" in
dev-*)
	REPO_RAW="https://raw.githubusercontent.com/${REPO}/${VERSION}"
	;;
*)
	REPO_RAW="https://raw.githubusercontent.com/${REPO}/v${VERSION}"
	;;
esac

is_in_container() {
	[ -f "/.dockerenv" ] || [ -f "/run/.containerenv" ]
}

get_saved_install_mode() {
	local config_file="$HOME/.pilot/config.json"
	if [ -f "$config_file" ]; then
		sed -n 's/.*"install_mode"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$config_file" 2>/dev/null
	fi
}

save_install_mode() {
	local mode="$1"
	local config_file="$HOME/.pilot/config.json"
	mkdir -p "$(dirname "$config_file")"

	if command -v python3 >/dev/null 2>&1; then
		python3 -c "
import json
import os

config_file = os.path.expanduser('$config_file')
config = {}

if os.path.exists(config_file):
    try:
        with open(config_file) as f:
            config = json.load(f)
    except (json.JSONDecodeError, IOError):
        pass

config['install_mode'] = '$mode'

with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)
"
	else
		echo "{\"install_mode\": \"$mode\"}" >"$config_file"
	fi
}

download_file() {
	local path="$1"
	local dest="$2"
	local url="${REPO_RAW}/${path}"

	mkdir -p "$(dirname "$dest")"
	if command -v curl >/dev/null 2>&1; then
		curl -fsSL "$url" -o "$dest"
	elif command -v wget >/dev/null 2>&1; then
		wget -q "$url" -O "$dest"
	else
		echo "Error: Neither curl nor wget found."
		exit 1
	fi
}

check_uv() {
	command -v uv >/dev/null 2>&1
}

install_uv() {
	echo "  [..] Installing uv..."
	if command -v curl >/dev/null 2>&1; then
		curl -LsSf https://astral.sh/uv/install.sh | sh
	elif command -v wget >/dev/null 2>&1; then
		wget -qO- https://astral.sh/uv/install.sh | sh
	fi

	export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

	if ! check_uv; then
		echo "  [!!] Failed to install uv"
		exit 1
	fi
	echo "  [OK] uv installed"
}

show_macos_gatekeeper_warning() {
	echo ""
	echo "  ⚠️  macOS Gatekeeper is blocking the pilot binary"
	echo ""
	echo "  The installer requires pilot to verify your license."
	echo "  Please follow these steps to unblock it:"
	echo ""
	echo "    1. Open System Settings → Privacy & Security"
	echo "    2. Scroll down to find a message about 'pilot' being blocked"
	echo "    3. Click 'Allow Anyway'"
	echo "    4. Re-run this installer"
	echo ""
	echo "  Or run this command to remove the quarantine flag:"
	echo "    xattr -cr $HOME/.pilot/bin"
	echo ""
}

confirm_local_install() {
	echo ""
	echo "  Local installation will:"
	echo "    • Install Homebrew packages: python, node, nvm, pnpm, bun, uv, go, gopls, git, gh"
	echo "    • Add 'claude' command to your shell config (~/.bashrc, ~/.zshrc, fish)"
	echo "    • Configure Claude Code (~/.claude.json) according to Pilot best-practices"
	echo ""
	confirm=""
	if [ -t 0 ]; then
		printf "  Continue? [Y/n]: "
		read -r confirm
	elif [ -e /dev/tty ]; then
		printf "  Continue? [Y/n]: "
		read -r confirm </dev/tty
	else
		echo "  No interactive terminal available, continuing with defaults."
		confirm="y"
	fi
	case "$confirm" in
	[Nn] | [Nn][Oo])
		echo "  Cancelled. Run again to choose Dev Container instead."
		exit 0
		;;
	esac
}

setup_devcontainer() {
	if [ -d ".devcontainer" ]; then
		echo "  [OK] .devcontainer already exists"
	else
		echo "  [..] Downloading dev container configuration..."
		download_file ".devcontainer/Dockerfile" ".devcontainer/Dockerfile"
		download_file ".devcontainer/devcontainer.json" ".devcontainer/devcontainer.json"

		PROJECT_NAME="$(basename "$(pwd)")"
		PROJECT_SLUG="$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '-')"
		if [ -f ".devcontainer/devcontainer.json" ]; then
			sed -i.bak 's/"claude-pilot"/"'"${PROJECT_SLUG}"'"/g' ".devcontainer/devcontainer.json"
			sed -i.bak 's|/workspaces/claude-pilot|/workspaces/'"${PROJECT_SLUG}"'|g' ".devcontainer/devcontainer.json"
			rm -f ".devcontainer/devcontainer.json.bak"
		fi

		echo "  [OK] Dev container configuration installed"
	fi

	if [ ! -f ".vscode/extensions.json" ]; then
		echo "  [..] Downloading VS Code extensions recommendations..."
		download_file ".vscode/extensions.json" ".vscode/extensions.json"
		echo "  [OK] VS Code extensions recommendations installed"
	else
		echo "  [OK] .vscode/extensions.json already exists"
	fi

	echo ""
	echo "  Next steps:"
	echo "    1. Open this folder in VS Code"
	echo "    2. Install the 'Dev Containers' extension"
	echo "    3. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)"
	echo "    4. Run: 'Dev Containers: Reopen in Container'"
	echo "    5. Once inside the container, run this installer again"
	echo ""
	echo "======================================================================"
	echo ""
	exit 0
}

download_installer() {
	local installer_dir="$HOME/.pilot/installer"

	echo "  [..] Downloading installer..."

	rm -rf "$installer_dir"
	mkdir -p "$installer_dir/installer"

	local tag_ref=""
	case "$VERSION" in
	dev-*) tag_ref="$VERSION" ;;
	*) tag_ref="v${VERSION}" ;;
	esac
	local api_url="https://api.github.com/repos/${REPO}/git/trees/${tag_ref}?recursive=true"
	local tree_json=""

	if command -v curl >/dev/null 2>&1; then
		tree_json=$(curl -fsSL "$api_url" 2>/dev/null) || true
	elif command -v wget >/dev/null 2>&1; then
		tree_json=$(wget -qO- "$api_url" 2>/dev/null) || true
	fi

	if [ -z "$tree_json" ]; then
		echo "  [!!] Failed to fetch file list from GitHub API"
		exit 1
	fi

	echo "$tree_json" | grep -oE '"path": ?"installer/[^"]*\.py"' | sed 's/"path": *"//g; s/"$//g' | while IFS= read -r file_path; do
		case "$file_path" in
		*__pycache__* | *dist/* | *build/* | *tests/*) continue ;;
		esac

		local dest_file="$installer_dir/$file_path"
		mkdir -p "$(dirname "$dest_file")"
		download_file "$file_path" "$dest_file"
	done

	download_file "pyproject.toml" "$installer_dir/pyproject.toml"

	echo "  [OK] Installer downloaded"
}

get_platform_suffix() {
	local os_name=""
	local arch=""

	case "$(uname -s)" in
	Linux) os_name="linux" ;;
	Darwin) os_name="darwin" ;;
	*) return 1 ;;
	esac

	case "$(uname -m)" in
	x86_64 | amd64) arch="x86_64" ;;
	arm64 | aarch64) arch="arm64" ;;
	*) return 1 ;;
	esac

	echo "${os_name}-${arch}"
}

get_local_so_name() {
	local platform_tag=""
	case "$(uname -s)" in
	Linux)
		case "$(uname -m)" in
		x86_64 | amd64) platform_tag="x86_64-linux-gnu" ;;
		arm64 | aarch64) platform_tag="aarch64-linux-gnu" ;;
		esac
		;;
	Darwin) platform_tag="darwin" ;;
	esac

	echo "pilot.cpython-312-${platform_tag}.so"
}

download_pilot_binary() {
	local bin_dir="$HOME/.pilot/bin"
	local platform_suffix
	local so_name
	local base_url

	platform_suffix=$(get_platform_suffix) || {
		echo "  [!!] Unsupported platform for Pilot binary"
		return 1
	}

	so_name=$(get_local_so_name)

	case "$VERSION" in
	dev-*) base_url="https://github.com/${REPO}/releases/download/${VERSION}" ;;
	*) base_url="https://github.com/${REPO}/releases/download/v${VERSION}" ;;
	esac

	if [ -d "$bin_dir" ]; then
		rm -rf "$bin_dir"
	fi
	mkdir -p "$bin_dir"

	echo "  [..] Downloading Pilot binary (${platform_suffix})..."

	local so_url="${base_url}/pilot-${platform_suffix}.so"
	local so_path="${bin_dir}/${so_name}"

	if command -v curl >/dev/null 2>&1; then
		if ! curl -fsSL "$so_url" -o "$so_path" 2>/dev/null; then
			echo "  [!!] Failed to download pilot module"
			return 1
		fi
	elif command -v wget >/dev/null 2>&1; then
		if ! wget -q "$so_url" -O "$so_path" 2>/dev/null; then
			echo "  [!!] Failed to download pilot module"
			return 1
		fi
	fi

	chmod +x "$so_path"

	local wrapper_url="${base_url}/pilot"
	local wrapper_path="${bin_dir}/pilot"

	if command -v curl >/dev/null 2>&1; then
		if ! curl -fsSL "$wrapper_url" -o "$wrapper_path" 2>/dev/null; then
			echo "  [!!] Failed to download pilot wrapper"
			rm -f "$so_path"
			return 1
		fi
	elif command -v wget >/dev/null 2>&1; then
		if ! wget -q "$wrapper_url" -O "$wrapper_path" 2>/dev/null; then
			echo "  [!!] Failed to download pilot wrapper"
			rm -f "$so_path"
			return 1
		fi
	fi

	chmod +x "$wrapper_path"

	echo "  [..] Verifying pilot binary..."
	local pilot_version
	pilot_version=$("$wrapper_path" --version 2>/dev/null) || true

	if [ -z "$pilot_version" ] && [ "$(uname -s)" = "Darwin" ]; then
		echo "  [..] Removing macOS quarantine attributes..."
		xattr -cr "$bin_dir" 2>/dev/null || true
		spctl --add "$wrapper_path" 2>/dev/null || true
		spctl --add "$so_path" 2>/dev/null || true
		pilot_version=$("$wrapper_path" --version 2>/dev/null) || true
	fi

	if [ -z "$pilot_version" ]; then
		if [ "$(uname -s)" = "Darwin" ]; then
			show_macos_gatekeeper_warning
			exit 1
		else
			echo "  [!!] Pilot binary failed to execute"
			return 1
		fi
	fi

	local installed_version
	installed_version=$(echo "$pilot_version" | sed -n 's/.*Pilot v\(.*\)/\1/p')

	if [ -z "$installed_version" ]; then
		echo "  [!!] Could not determine pilot version"
		return 1
	fi

	echo "  [OK] Pilot binary ready (v${installed_version})"
}

run_installer() {
	local installer_dir="$HOME/.pilot/installer"
	local saved_mode
	saved_mode=$(get_saved_install_mode)

	echo ""

	export PYTHONPATH="$installer_dir:${PYTHONPATH:-}"

	local version_arg="--target-version $VERSION"
	local local_arg=""
	if [ "$USE_LOCAL_INSTALLER" = true ]; then
		local_arg="--local --local-repo-dir $(pwd)"
	fi

	if ! is_in_container && [ "$saved_mode" = "local" ]; then
		uv run --python 3.12 --no-project --with rich \
			python -m installer install --local-system $version_arg $local_arg "$@"
	else
		uv run --python 3.12 --no-project --with rich \
			python -m installer install $version_arg $local_arg "$@"
	fi
}

if ! is_in_container; then
	echo ""
	echo "======================================================================"
	echo "  Claude Pilot Installer (v${VERSION})"
	echo "======================================================================"
	echo ""

	if [ -d ".devcontainer" ]; then
		echo "  Detected existing .devcontainer - using Dev Container mode."
		echo ""
		setup_devcontainer
	fi

	saved_mode=$(get_saved_install_mode)
	if [ "$saved_mode" = "local" ]; then
		echo "  Using saved preference: Local Installation"
		echo ""
	elif [ "$saved_mode" = "container" ]; then
		echo "  Using saved preference: Dev Container"
		echo ""
		setup_devcontainer
	else
		echo "  Choose installation method:"
		echo ""
		echo "    1) Local - Install directly on your system"
		echo "    2) Dev Container - Isolated, pre-configured environment"
		echo ""

		choice=""
		if [ -t 0 ]; then
			printf "  Enter choice [1-2]: "
			read -r choice
		elif [ -e /dev/tty ]; then
			printf "  Enter choice [1-2]: "
			read -r choice </dev/tty
		else
			echo "  No interactive terminal available, defaulting to Local."
			choice="1"
		fi

		case $choice in
		2)
			save_install_mode "container"
			setup_devcontainer
			;;
		*)
			save_install_mode "local"
			echo ""
			echo "  Local Installation selected (preference saved)"
			echo ""
			confirm_local_install
			;;
		esac
	fi
fi

echo ""
echo "Downloading Claude Pilot (v${VERSION})..."
echo ""

if check_uv; then
	echo "  [OK] uv already installed"
else
	install_uv
fi

if [ "$USE_LOCAL_INSTALLER" = true ]; then
	if [ -d "installer" ] && [ -f "pyproject.toml" ]; then
		echo "  [OK] Using local installer from current directory"
		# Create symlink structure expected by run_installer
		rm -rf "$HOME/.pilot/installer"
		mkdir -p "$HOME/.pilot/installer"
		ln -sf "$(pwd)/installer" "$HOME/.pilot/installer/installer"
		ln -sf "$(pwd)/pyproject.toml" "$HOME/.pilot/installer/pyproject.toml"
	else
		echo "  [!!] --local requires running from claude-pilot repo root"
		echo "  [!!] Missing: installer/ directory or pyproject.toml"
		exit 1
	fi
else
	download_installer
fi
download_pilot_binary

run_installer $INSTALLER_ARGS

if [ "$RESTART_PILOT" = true ]; then
	PILOT_BIN="$HOME/.pilot/bin/pilot"
	if [ -x "$PILOT_BIN" ]; then
		echo ""
		echo "  Restarting Claude Pilot..."
		echo ""
		exec "$PILOT_BIN" --skip-update-check
	fi
fi

