#!/bin/zsh

# Deploy workflow script
# Usage: ./scripts/deploy-workflow.sh <directory_name> <workflow_name>

set -e

# Check if both arguments are provided
if [ $# -lt 2 ]; then
    echo "Error: Both directory name and workflow name are required"
    echo "Usage: $0 <directory_name> <workflow_name>"
    exit 1
fi

DIR_NAME=$1
WORKFLOW_NAME=$2

# Change to cre-ts-sdk root directory
cd "$(dirname "$0")/.."

# Source WASM file path
SOURCE_WASM="dist/workflows/standard_tests/${DIR_NAME}/${WORKFLOW_NAME}/testts.wasm"

# Check if source file exists
if [ ! -f "$SOURCE_WASM" ]; then
    echo "❌ Error: Source WASM file not found: $SOURCE_WASM"
    exit 1
fi

# Target directory path (chainlink-common is at workspace root)
TARGET_DIR="../chainlink-common/pkg/workflows/wasm/host/standard_tests/${DIR_NAME}/${WORKFLOW_NAME}"

# Copy WASM file to target location
echo "📋 Copying $SOURCE_WASM to $TARGET_DIR/"
cp "$SOURCE_WASM" "$TARGET_DIR/"

echo "✅ Successfully deployed workflow $WORKFLOW_NAME to chainlink-common standard_tests" 