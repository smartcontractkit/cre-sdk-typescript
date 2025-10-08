#!/bin/zsh

# Exit on any error
set -e

# Configuration
VERSION="v0.6.2-alpha"
PLATFORM="linux_amd64"
FILENAME="cre_${PLATFORM}.tar.gz"
BINARY_NAME="cre_${VERSION}_${PLATFORM}"
DOWNLOAD_URL="https://github.com/smartcontractkit/cre-cli/releases/download/${VERSION}/${FILENAME}"
INSTALL_DIR="/usr/local/bin"

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
