#!/usr/bin/env bash
# Dev Container Post-Create Command
# Simply runs the Claude CodePro installer which handles all setup

set -e

# Download and run the installer (version updated by semantic-release)
curl -fsSL https://raw.githubusercontent.com/maxritter/claude-codepro/v3.0.11/install.sh | bash
