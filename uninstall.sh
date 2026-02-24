#!/bin/bash

set -e

PILOT_DIR="$HOME/.pilot"
CLAUDE_DIR="$HOME/.claude"
PILOT_PLUGIN_DIR="$CLAUDE_DIR/pilot"
MANIFEST_FILE="$CLAUDE_DIR/.pilot-manifest.json"

CLAUDE_ALIAS_MARKER="# Pilot Shell"
OLD_CLAUDE_PILOT_MARKER="# Claude Pilot"
OLD_CCP_MARKER="# Claude CodePro alias"

removed_items=()

get_pilot_version() {
	local pilot_path="$PILOT_DIR/bin/pilot"
	if [ -x "$pilot_path" ]; then
		local version
		version=$("$pilot_path" --version 2>/dev/null | sed -n 's/.* v\([^ ]*\).*/\1/p') || true
		if [ -n "$version" ]; then
			echo "$version"
			return
		fi
	fi
	echo "unknown"
}

get_manifest_entries() {
	if [ ! -f "$MANIFEST_FILE" ]; then
		return
	fi
	grep -oE '"[a-z]+/[^"]+"' "$MANIFEST_FILE" 2>/dev/null | sed 's/"//g' || true
}

get_affected_shell_configs() {
	local config_files=(
		"$HOME/.bashrc"
		"$HOME/.bash_profile"
		"$HOME/.zshrc"
		"$HOME/.config/fish/config.fish"
	)
	for config_file in "${config_files[@]}"; do
		if [ -f "$config_file" ] && grep -q -e "$CLAUDE_ALIAS_MARKER" \
			-e "$OLD_CLAUDE_PILOT_MARKER" \
			-e "$OLD_CCP_MARKER" \
			-e "alias ccp=" \
			-e "alias pilot=" \
			-e 'PATH="$HOME/.pilot/bin' \
			-e 'PATH "$HOME/.pilot/bin' \
			"$config_file" 2>/dev/null; then
			basename "$config_file"
		fi
	done
}

confirm_uninstall() {
	local version
	version=$(get_pilot_version)

	echo ""
	echo "======================================================================"
	echo "  Pilot Shell Uninstaller (v${version})"
	echo "======================================================================"
	echo ""

	echo "  Uninstalling will:"
	echo ""

	if [ -d "$PILOT_DIR" ]; then
		echo "    • Remove ~/.pilot/ (binary, installer, vexor fork)"
	fi

	if [ -d "$PILOT_PLUGIN_DIR" ]; then
		echo "    • Remove ~/.claude/pilot/ (hooks, scripts, agents, MCP config)"
	fi

	local entries
	entries=$(get_manifest_entries)
	if [ -n "$entries" ]; then
		echo "$entries" | grep -q '^commands/' && echo "    • Remove Pilot-managed commands from ~/.claude/commands/"
		echo "$entries" | grep -q '^rules/' && echo "    • Remove Pilot-managed rules from ~/.claude/rules/"
	fi

	if [ -f "$CLAUDE_DIR/settings.json" ]; then
		echo "    • Clean Pilot-added entries from ~/.claude/settings.json"
	fi

	if [ -f "$HOME/.claude.json" ] && [ -f "$CLAUDE_DIR/.pilot-claude-baseline.json" ]; then
		echo "    • Clean Pilot-added keys from ~/.claude.json"
	fi

	local baseline_files=""
	for f in "$CLAUDE_DIR/.pilot-settings-baseline.json" "$CLAUDE_DIR/.pilot-claude-baseline.json" "$MANIFEST_FILE"; do
		if [ -f "$f" ]; then
			baseline_files="$baseline_files $(basename "$f")"
		fi
	done
	if [ -n "$baseline_files" ]; then
		echo "    • Remove Pilot metadata:${baseline_files}"
	fi

	local affected_shells
	affected_shells=$(get_affected_shell_configs)
	if [ -n "$affected_shells" ]; then
		local shell_list
		shell_list=$(echo "$affected_shells" | tr '\n' ', ' | sed 's/,$//')
		echo "    • Remove 'pilot' and 'ccp' aliases from ${shell_list}"
	fi

	echo ""

	confirm=""
	if [ -t 0 ]; then
		printf "  Continue? [y/N]: "
		read -r confirm
	elif [ -e /dev/tty ]; then
		printf "  Continue? [y/N]: "
		read -r confirm </dev/tty
	else
		echo "  No interactive terminal available. Use --yes to skip confirmation."
		exit 1
	fi

	case "$confirm" in
	[Yy] | [Yy][Ee][Ss]) ;;
	*)
		echo "  Cancelled."
		exit 0
		;;
	esac
}

remove_shell_aliases() {
	local config_files=(
		"$HOME/.bashrc"
		"$HOME/.bash_profile"
		"$HOME/.zshrc"
		"$HOME/.config/fish/config.fish"
	)

	for config_file in "${config_files[@]}"; do
		if [ ! -f "$config_file" ]; then
			continue
		fi

		if ! grep -q -e "$CLAUDE_ALIAS_MARKER" \
			-e "$OLD_CLAUDE_PILOT_MARKER" \
			-e "$OLD_CCP_MARKER" \
			-e "alias ccp=" \
			-e "alias pilot=" \
			-e 'PATH="$HOME/.pilot/bin' \
			-e 'PATH "$HOME/.pilot/bin' \
			"$config_file" 2>/dev/null; then
			continue
		fi

		local tmp_file
		tmp_file=$(mktemp)

		awk '
		/# Pilot Shell/ { next }
		/# Claude Pilot/ { next }
		/# Claude CodePro alias/ { next }
		/^[[:space:]]*alias ccp=/ { next }
		/^[[:space:]]*alias pilot=/ { next }
		/^[[:space:]]*alias claude=/ { next }
		/^[[:space:]]*export PATH="\$HOME\/.pilot\/bin/ { next }
		/^[[:space:]]*set -gx PATH "\$HOME\/.pilot\/bin/ { next }
		/^[[:space:]]*export PATH="\$HOME\/.bun\/bin:\$PATH"/ { next }
		/^[[:space:]]*set -gx PATH "\$HOME\/.bun\/bin"/ { next }
		{ print }
		' "$config_file" >"$tmp_file"

		awk 'NR==1{print; next} /^[[:space:]]*$/{if(blank) next; blank=1; print; next} {blank=0; print}' "$tmp_file" >"${tmp_file}.clean"
		mv "${tmp_file}.clean" "$tmp_file"

		cp "$tmp_file" "$config_file"
		rm -f "$tmp_file"

		local name
		name=$(basename "$config_file")
		echo "    [OK] Cleaned $name"
		removed_items+=("shell aliases in $name")
	done
}

remove_manifest_files() {
	if [ ! -f "$MANIFEST_FILE" ]; then
		return
	fi

	local entries
	entries=$(get_manifest_entries)
	if [ -z "$entries" ]; then
		return
	fi

	local removed_count=0
	while IFS= read -r entry; do
		local file_path="$CLAUDE_DIR/$entry"
		if [ -f "$file_path" ]; then
			rm -f "$file_path"
			removed_count=$((removed_count + 1))
		fi
	done <<<"$entries"

	if [ "$removed_count" -gt 0 ]; then
		echo "    [OK] Removed $removed_count Pilot-managed commands and rules"
		removed_items+=("$removed_count commands/rules from ~/.claude/")
	fi

	for subdir in "commands" "rules"; do
		local dir="$CLAUDE_DIR/$subdir"
		if [ -d "$dir" ] && [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
			rmdir "$dir" 2>/dev/null || true
		fi
	done
}

run_surgical_cleanup() {
	local target_file="$1"
	local baseline_file="$2"
	local display_path="$3"

	if [ ! -f "$target_file" ] || [ ! -f "$baseline_file" ]; then
		return
	fi

	if ! command -v python3 >/dev/null 2>&1; then
		return
	fi

	python3 -c "
import json, sys, os

def remove_baseline_entries(current, baseline):
    if not isinstance(current, dict) or not isinstance(baseline, dict):
        return current, current == baseline
    modified = False
    for key in list(baseline.keys()):
        if key not in current:
            continue
        if isinstance(baseline[key], dict) and isinstance(current[key], dict):
            current[key], fully_removed = remove_baseline_entries(current[key], baseline[key])
            if fully_removed or not current[key]:
                del current[key]
                modified = True
            else:
                modified = True
        elif isinstance(baseline[key], list) and isinstance(current[key], list):
            baseline_set = set(
                json.dumps(x, sort_keys=True) if isinstance(x, (dict, list)) else str(x)
                for x in baseline[key]
            )
            new_list = [
                x for x in current[key]
                if (json.dumps(x, sort_keys=True) if isinstance(x, (dict, list)) else str(x)) not in baseline_set
            ]
            if len(new_list) != len(current[key]):
                modified = True
                if new_list:
                    current[key] = new_list
                else:
                    del current[key]
        elif current[key] == baseline[key]:
            del current[key]
            modified = True
    return current, not current

try:
    with open('$target_file') as f:
        current = json.load(f)
    with open('$baseline_file') as f:
        baseline = json.load(f)
    current, is_empty = remove_baseline_entries(current, baseline)
    if is_empty:
        os.remove('$target_file')
        print('    [OK] Removed $display_path (no user settings remained)')
    else:
        with open('$target_file', 'w') as f:
            json.dump(current, f, indent=2)
            f.write('\n')
        print('    [OK] Cleaned Pilot entries from $display_path (user settings preserved)')
except Exception as e:
    print(f'    [!!] Could not clean $display_path: {e}', file=sys.stderr)
" 2>&1
}

remove_pilot_settings() {
	local settings_file="$CLAUDE_DIR/settings.json"
	local baseline="$CLAUDE_DIR/.pilot-settings-baseline.json"

	if [ ! -f "$settings_file" ]; then
		return
	fi

	if [ -f "$baseline" ] && command -v python3 >/dev/null 2>&1; then
		run_surgical_cleanup "$settings_file" "$baseline" "~/.claude/settings.json"
	else
		echo "    [!!] Skipped ~/.claude/settings.json (no baseline found, manual cleanup needed)"
	fi

	removed_items+=("~/.claude/settings.json")
}

remove_claude_json_keys() {
	local claude_json="$HOME/.claude.json"
	local baseline="$CLAUDE_DIR/.pilot-claude-baseline.json"

	if [ ! -f "$claude_json" ] || [ ! -f "$baseline" ]; then
		return
	fi

	run_surgical_cleanup "$claude_json" "$baseline" "~/.claude.json"
	removed_items+=("~/.claude.json")
}

remove_pilot_baselines() {
	local files=(
		"$CLAUDE_DIR/.pilot-settings-baseline.json"
		"$CLAUDE_DIR/.pilot-claude-baseline.json"
		"$CLAUDE_DIR/.pilot-manifest.json"
	)

	for file in "${files[@]}"; do
		if [ -f "$file" ]; then
			rm -f "$file"
			echo "    [OK] Removed $(basename "$file")"
			removed_items+=("$(basename "$file")")
		fi
	done
}

remove_pilot_plugin() {
	if [ -d "$PILOT_PLUGIN_DIR" ]; then
		rm -rf "$PILOT_PLUGIN_DIR"
		echo "    [OK] Removed ~/.claude/pilot/"
		removed_items+=("~/.claude/pilot/")
	fi
}

remove_pilot_dir() {
	if [ -d "$PILOT_DIR" ]; then
		rm -rf "$PILOT_DIR"
		echo "    [OK] Removed ~/.pilot/"
		removed_items+=("~/.pilot/")
	fi
}

print_summary() {
	echo ""
	echo "======================================================================"

	if [ ${#removed_items[@]} -eq 0 ]; then
		echo "  Nothing to remove. Pilot Shell does not appear to be installed."
	else
		echo "  Pilot Shell has been uninstalled."
		echo ""
		echo "  Removed ${#removed_items[@]} items:"
		for item in "${removed_items[@]}"; do
			echo "    - $item"
		done
	fi

	echo ""
	echo "  To fully clean up third-party tools installed by Pilot:"
	echo "    - Claude Code:    npm uninstall -g @anthropic-ai/claude-code"
	echo "    - Vexor:          uv tool uninstall vexor"
	echo "    - playwright-cli: npm uninstall -g @playwright/cli"
	echo "    - ccusage:        npm uninstall -g ccusage"
	echo "    - vtsls:          npm uninstall -g @vtsls/language-server typescript"
	echo "    - prettier:       npm uninstall -g prettier"
	echo "    - golangci-lint:  rm -f \$(go env GOPATH)/bin/golangci-lint"
	echo "    - sx:             rm -f \$(which sx)"
	echo "    - Python tools:   uv tool uninstall ruff basedpyright"
	echo ""
	echo "  Homebrew packages (git, node, bun, go, etc.) were left intact."
	echo ""
	echo "  Please restart your terminal or run 'source ~/.zshrc' to apply changes."
	echo ""
	echo "======================================================================"
	echo ""
}

SKIP_CONFIRM=false
while [ $# -gt 0 ]; do
	case "$1" in
	--yes | -y)
		SKIP_CONFIRM=true
		shift
		;;
	--help | -h)
		echo "Usage: uninstall.sh [--yes|-y]"
		echo ""
		echo "Uninstall Pilot Shell and remove all installed files."
		echo ""
		echo "Options:"
		echo "  --yes, -y    Skip confirmation prompt"
		echo "  --help, -h   Show this help message"
		exit 0
		;;
	*)
		echo "Unknown option: $1"
		echo "Run with --help for usage information."
		exit 1
		;;
	esac
done

if ! [ -d "$PILOT_DIR" ] && ! [ -d "$PILOT_PLUGIN_DIR" ] && ! [ -f "$MANIFEST_FILE" ]; then
	echo ""
	echo "======================================================================"
	echo "  Pilot Shell Uninstaller"
	echo "======================================================================"
	echo ""
	echo "  Nothing to remove. Pilot Shell does not appear to be installed."
	echo ""
	echo "======================================================================"
	echo ""
	exit 0
fi

if [ "$SKIP_CONFIRM" = false ]; then
	confirm_uninstall
else
	echo ""
	echo "======================================================================"
	echo "  Pilot Shell Uninstaller"
	echo "======================================================================"
fi

echo ""
echo "  Uninstalling Pilot Shell..."
echo ""

remove_shell_aliases
remove_manifest_files
remove_pilot_settings
remove_claude_json_keys
remove_pilot_baselines
remove_pilot_plugin
remove_pilot_dir

print_summary
