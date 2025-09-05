#!/bin/zsh

# Run standard tests script
# Usage: ./scripts/run-standard-tests.sh

set -e

# Create dist test workflow folder
mkdir -p ./dist/workflows/standard_tests

# Build javy wasm
[ -f ./dist/javy-chainlink-sdk.plugin.wasm ] || (echo "Building javy wasm..." && bun build:javy:plugin && bun build:javy:sdk:wasm)

# Copy standard test files to dist
echo "Copying test files..." && cp -r ./src/workflows/standard_tests/* ./dist/workflows/standard_tests

# Run standard tests
make standard_tests
