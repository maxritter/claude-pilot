"""Environment step - sets up .env file with API keys."""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

from installer.steps.base import BaseStep

if TYPE_CHECKING:
    from installer.context import InstallContext


def key_exists_in_file(key: str, env_file: Path) -> bool:
    """Check if key exists in .env file."""
    if not env_file.exists():
        return False

    content = env_file.read_text()
    for line in content.split("\n"):
        if line.strip().startswith(f"{key}="):
            return True
    return False


def key_is_set(key: str, env_file: Path) -> bool:
    """Check if key exists in .env file OR is already set as environment variable."""
    if os.environ.get(key):
        return True
    return key_exists_in_file(key, env_file)


def add_env_key(key: str, value: str, env_file: Path) -> None:
    """Add environment key to .env file if it doesn't exist."""
    if key_exists_in_file(key, env_file):
        return

    with open(env_file, "a") as f:
        f.write(f"{key}={value}\n")


class EnvironmentStep(BaseStep):
    """Step that sets up the .env file for API keys."""

    name = "environment"

    def check(self, ctx: InstallContext) -> bool:
        """Always returns False - environment step should always run to check for missing keys."""
        return False

    def run(self, ctx: InstallContext) -> None:
        """Set up .env file with API keys."""
        ui = ctx.ui
        env_file = ctx.project_dir / ".env"

        if ctx.skip_env or ctx.non_interactive:
            if ui:
                ui.status("Skipping .env setup")
            return

        if ui:
            ui.section("API Keys Setup")

        append_mode = env_file.exists()

        if append_mode:
            if ui:
                ui.success("Found existing .env file")
                ui.print("  We'll append Claude CodePro configuration to your existing file.")
                ui.print()
        else:
            if ui:
                ui.print("  Let's set up your API keys. I'll guide you through each one.")
                ui.print()

        milvus_token = ""
        milvus_address = ""
        vector_store_username = ""
        vector_store_password = ""
        openai_api_key = ""
        exa_api_key = ""

        if not key_is_set("MILVUS_TOKEN", env_file):
            if ui:
                ui.print()
                ui.rule("1. Zilliz Cloud - Free Vector DB for Semantic Search & Memory")
                ui.print()
                ui.print("  [bold]Used for:[/bold] Persistent memory across CC sessions & semantic code search")
                ui.print("  [bold]Create at:[/bold] [cyan]https://zilliz.com/cloud[/cyan]")
                ui.print()
                ui.print("  [bold]Steps:[/bold]")
                ui.print("  1. Sign up for free account")
                ui.print("  2. Create a new cluster (Serverless is free)")
                ui.print("  3. Go to Cluster -> Overview -> Connect")
                ui.print("  4. Copy the Token and Public Endpoint")
                ui.print("  5. Go to Clusters -> Users -> Admin -> Reset Password")
                ui.print()

                milvus_token = ui.input("MILVUS_TOKEN", default="")
                milvus_address = ui.input("MILVUS_ADDRESS (Public Endpoint)", default="")
                vector_store_username = ui.input("VECTOR_STORE_USERNAME (usually db_xxxxx)", default="")
                vector_store_password = ui.input("VECTOR_STORE_PASSWORD", default="")
        else:
            if ui:
                ui.success("Zilliz Cloud configuration already set, skipping")

        if not key_is_set("OPENAI_API_KEY", env_file):
            if ui:
                ui.print()
                ui.rule("2. OpenAI API Key - For Memory LLM Calls")
                ui.print()
                ui.print("  [bold]Used for:[/bold] Low-usage LLM calls in Cipher memory system")
                ui.print("  [bold]Create at:[/bold] [cyan]https://platform.openai.com/account/api-keys[/cyan]")
                ui.print()

                openai_api_key = ui.input("OPENAI_API_KEY", default="")
        else:
            if ui:
                ui.success("OPENAI_API_KEY already set, skipping")

        if not key_is_set("EXA_API_KEY", env_file):
            if ui:
                ui.print()
                ui.rule("3. Exa API Key - AI-Powered Web Search & Code Context")
                ui.print()
                ui.print(
                    "  [bold]Used for:[/bold] Web search, code examples, documentation lookup, and URL content extraction"
                )
                ui.print("  [bold]Create at:[/bold] [cyan]https://dashboard.exa.ai/home[/cyan]")
                ui.print()

                exa_api_key = ui.input("EXA_API_KEY", default="")
        else:
            if ui:
                ui.success("EXA_API_KEY already set, skipping")

        if append_mode:
            content = env_file.read_text()
            if "# Claude CodePro Configuration" not in content:
                with open(env_file, "a") as f:
                    f.write("\n")
                    f.write("# " + "=" * 77 + "\n")
                    f.write("# Claude CodePro Configuration\n")
                    f.write("# " + "=" * 77 + "\n")

            add_env_key("MILVUS_TOKEN", milvus_token, env_file)
            add_env_key("MILVUS_ADDRESS", milvus_address, env_file)
            add_env_key("VECTOR_STORE_URL", milvus_address, env_file)
            add_env_key("VECTOR_STORE_USERNAME", vector_store_username, env_file)
            add_env_key("VECTOR_STORE_PASSWORD", vector_store_password, env_file)
            add_env_key("OPENAI_API_KEY", openai_api_key, env_file)
            add_env_key("EXA_API_KEY", exa_api_key, env_file)
            add_env_key("USE_ASK_CIPHER", "true", env_file)
            add_env_key("VECTOR_STORE_TYPE", "milvus", env_file)
            add_env_key("FASTMCP_LOG_LEVEL", "ERROR", env_file)

            if ui:
                ui.success("Updated .env file with Claude CodePro configuration")
        else:
            env_content = f"""# Zilliz Cloud (Free Vector DB for Semantic Search & Persistent Memory)
                                # Create at https://zilliz.com/cloud
                                MILVUS_TOKEN={milvus_token}
                                MILVUS_ADDRESS={milvus_address}
                                VECTOR_STORE_URL={milvus_address}
                                VECTOR_STORE_USERNAME={vector_store_username}
                                VECTOR_STORE_PASSWORD={vector_store_password}

                                # OpenAI API Key - Used for Persistent Memory LLM Calls (Low Usage)
                                # Create at https://platform.openai.com/account/api-keys
                                OPENAI_API_KEY={openai_api_key}

                                # Exa API Key - AI-Powered Web Search & Code Context
                                # Create at https://dashboard.exa.ai/home
                                EXA_API_KEY={exa_api_key}

                                # Configuration Settings - No need to adjust
                                USE_ASK_CIPHER=true
                                VECTOR_STORE_TYPE=milvus
                                FASTMCP_LOG_LEVEL=ERROR
                            """
            env_file.write_text(env_content)

            if ui:
                ui.success("Created .env file with your API keys")

    def rollback(self, ctx: InstallContext) -> None:
        """No rollback for environment setup."""
        pass
