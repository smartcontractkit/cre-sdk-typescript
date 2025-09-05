#!/bin/zsh

# Deploy workflow script
# Usage: ./scripts/deploy-workflow.sh <workflow_name>

set -e

# Check if workflow name is provided
if [ $# -eq 0 ]; then
    echo "Error: Workflow name is required"
    echo "Usage: $0 <workflow_name>"
    exit 1
fi

WORKFLOW_NAME=$1

echo "🚀 Deploying workflow: $WORKFLOW_NAME"

# Change to cre-ts-sdk root directory
cd "$(dirname "$0")/.."

# Build workflows
echo "📦 Building workflows..."
bun build:workflows

# Source WASM file path
SOURCE_WASM="dist/workflows/${WORKFLOW_NAME}/test.wasm"

# Check if source file exists
if [ ! -f "$SOURCE_WASM" ]; then
    echo "❌ Error: Source WASM file not found: $SOURCE_WASM"
    exit 1
fi

# Target directory path (chainlink-common is at workspace root)
TARGET_DIR="../chainlink-common/pkg/workflows/wasm/host/standard_tests/${WORKFLOW_NAME}"

# Copy WASM file to target location
echo "📋 Copying $SOURCE_WASM to $TARGET_DIR/"
cp "$SOURCE_WASM" "$TARGET_DIR/"

echo "✅ Successfully deployed workflow $WORKFLOW_NAME to chainlink-common standard_tests" 
