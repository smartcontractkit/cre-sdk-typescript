#!/bin/zsh

# Run workflow standard tests
# Usage: ./scripts/standard-tests.sh

echo "Copying wasm workflows..."
cp -r dist/workflows/standard_tests submodules/chainlink-common/pkg/workflows/wasm/host
echo "Running standard tests..."
cd ./submodules/chainlink-common && go test -v ./pkg/workflows/wasm/host -run ".*TestStandardLogging*" -importWasmFileName "testts.wasm"
