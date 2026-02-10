#!/bin/zsh

# Exit on any error
set -e

# Configuration
FALLBACK_VERSION="v1.0.10"
PLATFORM="linux_amd64"
INSTALL_DIR="/usr/local/bin"

# Resolve latest release tag, fall back to pinned version on failure
echo "Fetching latest CRE CLI release tag..."
LATEST_VERSION=$(curl -sL "https://api.github.com/repos/smartcontractkit/cre-cli/releases/latest" \
  | grep '"tag_name"' | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || true)

if [ -n "${LATEST_VERSION}" ]; then
  VERSION="${LATEST_VERSION}"
  echo "Resolved latest version: ${VERSION}"
else
  VERSION="${FALLBACK_VERSION}"
  echo "⚠ Could not resolve latest version, falling back to ${VERSION}"
fi

FILENAME="cre_${PLATFORM}.tar.gz"
BINARY_NAME="cre_${VERSION}_${PLATFORM}"
DOWNLOAD_URL="https://github.com/smartcontractkit/cre-cli/releases/download/${VERSION}/${FILENAME}"

# Create temporary directory
TMP_DIR=$(mktemp -d)
trap "rm -rf ${TMP_DIR}" EXIT

echo "Downloading CRE CLI ${VERSION} for ${PLATFORM}..."
curl -L -o "${TMP_DIR}/${FILENAME}" "${DOWNLOAD_URL}"

echo "Extracting archive..."
tar -xzf "${TMP_DIR}/${FILENAME}" -C "${TMP_DIR}"

echo "Setting up binary..."
mv "${TMP_DIR}/${BINARY_NAME}" "${TMP_DIR}/cre"
chmod +x "${TMP_DIR}/cre"

echo "Installing to ${INSTALL_DIR}..."
# Use sudo if not running as root and installing to /usr/local/bin
if [ -w "${INSTALL_DIR}" ]; then
    mv "${TMP_DIR}/cre" "${INSTALL_DIR}/cre"
else
    sudo mv "${TMP_DIR}/cre" "${INSTALL_DIR}/cre"
fi

echo "CRE CLI installed successfully!"
echo "Verifying installation..."
cre --version || echo "Note: You may need to add ${INSTALL_DIR} to your PATH"
