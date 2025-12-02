#!/bin/bash
# Claude CodePro Installer Bootstrap Script
# Downloads and runs the appropriate installer binary for your platform

set -e

REPO="maxritter/claude-codepro"
BINARY_PREFIX="ccp-installer"

# Detect OS
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$OS" in
    darwin) OS="darwin" ;;
    linux) OS="linux" ;;
    *)
        echo "Error: Unsupported operating system: $OS"
        echo "Supported: linux, darwin (macOS)"
        exit 1
        ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64|amd64) ARCH="x86_64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *)
        echo "Error: Unsupported architecture: $ARCH"
        echo "Supported: x86_64, arm64"
        exit 1
        ;;
esac

BINARY_NAME="${BINARY_PREFIX}-${OS}-${ARCH}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}"
INSTALL_PATH="/tmp/${BINARY_NAME}"

echo "Downloading Claude CodePro Installer..."
echo "  Platform: ${OS}-${ARCH}"
echo ""

# Download binary
if command -v curl &> /dev/null; then
    curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_PATH"
elif command -v wget &> /dev/null; then
    wget -q "$DOWNLOAD_URL" -O "$INSTALL_PATH"
else
    echo "Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Make executable and run with 'install' command
# Redirect stdin from /dev/tty to allow interactive input when piped
chmod +x "$INSTALL_PATH"
exec "$INSTALL_PATH" install "$@" < /dev/tty
