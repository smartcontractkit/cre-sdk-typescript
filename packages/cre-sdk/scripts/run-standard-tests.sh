#!/bin/zsh

# Run standard tests script
# Usage: ./scripts/run-standard-tests.sh

set -e

# Create dist test workflow folder
mkdir -p ./dist/workflows/standard_tests

# Plugin package must be built (initialized plugin is what we ship).
if [ ! -f ../cre-sdk-javy-plugin/dist/javy-chainlink-sdk.plugin.wasm ]; then
    echo "Error: javy-chainlink-sdk.plugin.wasm not found (run cre-sdk-javy-plugin build first)"
    exit 1
fi

# Copy standard test files to dist
echo "Copying test files..." && cp -r ./src/standard_tests/* ./dist/workflows/standard_tests/

# Run standard tests
make standard_tests
