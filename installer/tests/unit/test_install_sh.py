"""Tests for install.sh bootstrap script."""

from __future__ import annotations

from pathlib import Path


def test_install_sh_runs_python_installer():
    """Verify install.sh runs the Python installer module via uv with Python 3.12."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "uv run --python 3.12" in content, "install.sh must run with Python 3.12"
    assert "python -m installer" in content, "install.sh must run Python installer"

    assert "install" in content, "install.sh must pass 'install' command"

    assert "--local-system" in content, "install.sh must support --local-system flag"


def test_install_sh_downloads_installer_files():
    """Verify install.sh downloads the installer Python package dynamically."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "download_installer" in content, "install.sh must have download_installer function"

    assert "tree.json" in content, "Must download tree.json from release assets"
    assert "releases/download" in content, "Must use release asset URL pattern"

    assert "api.github.com" in content, "Must use GitHub API for file discovery fallback"
    assert "git/trees" in content, "Must use git trees API endpoint as fallback"

    assert "installer/" in content, "Must filter for installer directory"
    assert ".py" in content, "Must filter for Python files"


def test_install_sh_runs_installer():
    """Verify install.sh runs the Python installer (which downloads Pilot binary)."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "run_installer" in content, "install.sh must have run_installer function"
    assert "python -m installer" in content, "Must run Python installer"


def test_install_sh_ensures_uv_available():
    """Verify install.sh ensures uv is available."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "check_uv" in content, "install.sh must have check_uv function"
    assert "install_uv" in content, "install.sh must have install_uv function"
    assert "astral.sh/uv/install.sh" in content, "Must use official uv installer"


def test_install_sh_is_executable_bash_script():
    """Verify install.sh has proper shebang."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert content.startswith("#!/bin/bash"), "install.sh must start with bash shebang"


def test_install_sh_has_devcontainer_support():
    """Verify install.sh supports dev container mode."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "is_in_container" in content, "Must have container detection"
    assert "setup_devcontainer" in content, "Must have devcontainer setup"
    assert ".devcontainer" in content, "Must reference .devcontainer directory"


def test_install_sh_uses_with_flags():
    """Verify install.sh uses --with flags for inline deps (no venv created)."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "--with rich" in content, "Must use --with for rich"
    assert "PYTHONPATH" in content, "Must set PYTHONPATH for installer module"


def test_install_sh_uses_python_312():
    """Verify install.sh uses Python 3.12 via uv run."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "--python 3.12" in content, "Must use --python 3.12 flag"
    assert "--no-project" in content, "Must use --no-project to avoid modifying user's venv"


def test_install_sh_auto_detects_devcontainer():
    """Verify install.sh detects .devcontainer directory for container mode."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert '[ -d ".devcontainer" ]' in content, "Must check for .devcontainer directory"
    assert "Detected .devcontainer" in content, "Must inform user about detected .devcontainer"


def test_install_sh_skips_prompt_on_restart():
    """Verify install.sh skips install mode prompt during auto-updates."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert 'RESTART_PILOT" = true' in content, "Must check RESTART_PILOT flag"
    assert "Updating local installation" in content, "Must show update message"


def test_install_sh_no_global_install_mode():
    """Verify install.sh does not store install_mode in global config."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "save_install_mode" not in content, "Must not save install_mode globally"
    assert "get_saved_install_mode" not in content, "Must not read global install_mode"


def test_install_sh_replaces_devcontainer_project_name():
    """Verify install.sh has sed commands to replace pilot-shell with project name."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "PROJECT_SLUG=" in content, "Must generate PROJECT_SLUG"
    assert "basename" in content, "Must use basename to get directory name"
    assert "tr '[:upper:]' '[:lower:]'" in content, "Must convert to lowercase"

    assert '"pilot-shell"' in content, "Must have pattern for quoted pilot-shell"
    assert "${PROJECT_SLUG}" in content, "Must substitute PROJECT_SLUG"

    assert "/workspaces/pilot-shell" in content, "Must have pattern for workspace path"


def test_install_sh_preserves_github_url_in_devcontainer(tmp_path: Path):
    """Verify string replacement preserves GitHub URLs while replacing project name."""
    devcontainer_dir = tmp_path / ".devcontainer"
    devcontainer_dir.mkdir()
    devcontainer_json = devcontainer_dir / "devcontainer.json"
    devcontainer_json.write_text("""{
  "name": "pilot-shell",
  "runArgs": ["--name", "pilot-shell"],
  "workspaceFolder": "/workspaces/pilot-shell",
  "postCreateCommand": "curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/v5.0.6/install.sh | bash"
}""")

    project_slug = "my-cool-project"
    content = devcontainer_json.read_text()
    content = content.replace('"pilot-shell"', f'"{project_slug}"')
    content = content.replace("/workspaces/pilot-shell", f"/workspaces/{project_slug}")
    devcontainer_json.write_text(content)

    result = devcontainer_json.read_text()

    assert f'"name": "{project_slug}"' in result, "name field must be replaced"
    assert f'"--name", "{project_slug}"' in result, "runArgs name must be replaced"
    assert f'"/workspaces/{project_slug}"' in result, "workspaceFolder must be replaced"

    assert "maxritter/pilot-shell/v5.0.6" in result, "GitHub URL must be preserved"


def test_install_sh_sed_handles_special_project_names(tmp_path: Path):
    """Verify project name slugification works with various formats."""
    import re

    def slugify(name: str) -> str:
        """Convert project name to slug (lowercase, spaces/underscores to hyphens)."""
        return re.sub(r"[ _]+", "-", name.lower())

    test_cases = [
        ("My Project", "my-project"),
        ("My_Project", "my-project"),
        ("MyProject", "myproject"),
        ("my-project", "my-project"),
        ("PROJECT", "project"),
    ]

    for project_name, expected_slug in test_cases:
        devcontainer_dir = tmp_path / ".devcontainer"
        devcontainer_dir.mkdir(exist_ok=True)
        devcontainer_json = devcontainer_dir / "devcontainer.json"
        devcontainer_json.write_text("""{
  "name": "pilot-shell",
  "workspaceFolder": "/workspaces/pilot-shell"
}""")

        project_slug = slugify(project_name)
        assert project_slug == expected_slug, (
            f"Slug for '{project_name}' should be '{expected_slug}', got '{project_slug}'"
        )

        content = devcontainer_json.read_text()
        content = content.replace('"pilot-shell"', f'"{project_slug}"')
        content = content.replace("/workspaces/pilot-shell", f"/workspaces/{project_slug}")
        devcontainer_json.write_text(content)

        content = devcontainer_json.read_text()
        assert f'"name": "{project_slug}"' in content, f"Failed for project '{project_name}'"
        assert f'"/workspaces/{project_slug}"' in content, f"Failed workspace for '{project_name}'"


def test_install_sh_has_auto_version_fetch():
    """Verify install.sh has get_latest_release function for auto-fetching version."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "get_latest_release()" in content, "Must have get_latest_release function"
    assert "api.github.com" in content, "Must use GitHub API"
    assert "releases/latest" in content, "Must query releases/latest endpoint"
    assert "tag_name" in content, "Must parse tag_name from API response"


def test_install_sh_supports_version_env_var():
    """Verify install.sh supports VERSION environment variable."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert 'VERSION="${VERSION:-}"' in content, "Must read VERSION env var with empty default"
    assert "Fetching latest version" in content, "Must have message for auto-fetch mode"


def test_install_sh_handles_api_failure():
    """Verify install.sh handles GitHub API failures gracefully."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "Failed to fetch" in content or "Could not" in content, "Must have error message for API failure"


def test_install_sh_detects_native_windows():
    """Verify install.sh detects native Windows (MINGW/MSYS/Cygwin) and offers WSL2 or Dev Container."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "is_native_windows" in content, "Must have Windows detection function"
    assert "MINGW" in content, "Must detect Git Bash (MINGW)"
    assert "MSYS" in content, "Must detect MSYS2"
    assert "CYGWIN" in content, "Must detect Cygwin"
    assert "WSL2" in content or "WSL" in content, "Must mention WSL2 as an option"
    assert "Dev Container" in content, "Must mention Dev Container as an option"


def test_install_sh_uses_redirect_for_version_detection():
    """Verify install.sh uses redirect-based approach before API for version detection."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "redirect_url" in content, "Must use redirect_url for curl"
    assert "releases/latest" in content, "Must query releases/latest for redirect"

    assert "--spider" in content or "Location:" in content, "Must detect wget redirects"

    assert "api.github.com" in content, "Must still have API fallback"
    assert "releases/latest" in content, "Must query both redirect and API endpoints"

    assert "tr -d" in content, "Must strip carriage returns from redirect response"
    assert "%{redirect_url}" in content, "Must detect literal %{redirect_url} from old curl versions"
    assert "releases/tag/v" in content, "Must parse version from redirect URL path"
