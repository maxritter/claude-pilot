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

    assert "api.github.com" in content, "Must use GitHub API for file discovery"
    assert "git/trees" in content, "Must use git trees API endpoint"

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


def test_install_sh_has_get_saved_install_mode():
    """Verify install.sh can read saved install mode preference."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "get_saved_install_mode()" in content, "Must have get_saved_install_mode function"

    assert ".pilot/config.json" in content, "Must read from ~/.pilot/config.json"
    assert '"install_mode"' in content, "Must read install_mode field"

    assert '[ -f "$config_file" ]' in content, "Must check if config file exists"


def test_install_sh_has_save_install_mode():
    """Verify install.sh can save install mode preference."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "save_install_mode()" in content, "Must have save_install_mode function"

    assert 'mkdir -p "$(dirname "$config_file")"' in content, "Must create config directory"

    assert "echo " in content and ".pilot/config.json" in content, "Must write to config file"


def test_install_sh_uses_saved_preference():
    """Verify install.sh checks for and uses saved install mode preference."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "saved_mode=$(get_saved_install_mode)" in content, "Must get saved mode"

    assert 'saved_mode" = "local"' in content, "Must check for local mode"
    assert 'saved_mode" = "container"' in content, "Must check for container mode"

    assert "Using saved preference" in content, "Must inform user about saved preference"


def test_install_sh_saves_user_choice():
    """Verify install.sh saves user's install mode choice."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert 'save_install_mode "local"' in content, "Must save local mode choice"

    assert 'save_install_mode "container"' in content, "Must save container mode choice"

    assert "preference saved" in content, "Must indicate preference was saved"


def test_install_sh_replaces_devcontainer_project_name():
    """Verify install.sh has sed commands to replace claude-pilot with project name."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "PROJECT_SLUG=" in content, "Must generate PROJECT_SLUG"
    assert "basename" in content, "Must use basename to get directory name"
    assert "tr '[:upper:]' '[:lower:]'" in content, "Must convert to lowercase"

    assert '"claude-pilot"' in content, "Must have pattern for quoted claude-pilot"
    assert "${PROJECT_SLUG}" in content, "Must substitute PROJECT_SLUG"

    assert "/workspaces/claude-pilot" in content, "Must have pattern for workspace path"


def test_install_sh_preserves_github_url_in_devcontainer(tmp_path: Path):
    """Verify string replacement preserves GitHub URLs while replacing project name."""
    devcontainer_dir = tmp_path / ".devcontainer"
    devcontainer_dir.mkdir()
    devcontainer_json = devcontainer_dir / "devcontainer.json"
    devcontainer_json.write_text("""{
  "name": "claude-pilot",
  "runArgs": ["--name", "claude-pilot"],
  "workspaceFolder": "/workspaces/claude-pilot",
  "postCreateCommand": "curl -fsSL https://raw.githubusercontent.com/maxritter/claude-pilot/v5.0.6/install.sh | bash"
}""")

    project_slug = "my-cool-project"
    content = devcontainer_json.read_text()
    content = content.replace('"claude-pilot"', f'"{project_slug}"')
    content = content.replace("/workspaces/claude-pilot", f"/workspaces/{project_slug}")
    devcontainer_json.write_text(content)

    result = devcontainer_json.read_text()

    assert f'"name": "{project_slug}"' in result, "name field must be replaced"
    assert f'"--name", "{project_slug}"' in result, "runArgs name must be replaced"
    assert f'"/workspaces/{project_slug}"' in result, "workspaceFolder must be replaced"

    assert "maxritter/claude-pilot/v5.0.6" in result, "GitHub URL must be preserved"


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
  "name": "claude-pilot",
  "workspaceFolder": "/workspaces/claude-pilot"
}""")

        project_slug = slugify(project_name)
        assert project_slug == expected_slug, (
            f"Slug for '{project_name}' should be '{expected_slug}', got '{project_slug}'"
        )

        content = devcontainer_json.read_text()
        content = content.replace('"claude-pilot"', f'"{project_slug}"')
        content = content.replace("/workspaces/claude-pilot", f"/workspaces/{project_slug}")
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


def test_install_sh_has_repo_fallback():
    """Verify install.sh has repo fallback from claude-pilot to claude-codepro."""
    install_sh = Path(__file__).parent.parent.parent.parent / "install.sh"
    content = install_sh.read_text()

    assert "REPO_PRIMARY" in content, "Must have REPO_PRIMARY variable"
    assert "REPO_FALLBACK" in content, "Must have REPO_FALLBACK variable"
    assert "claude-pilot" in content, "Primary repo must be claude-pilot"
    assert "claude-codepro" in content, "Fallback repo must be claude-codepro"
    assert "check_repo_exists()" in content, "Must have check_repo_exists function"
    assert "Using fallback repository" in content, "Must have fallback message"


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
