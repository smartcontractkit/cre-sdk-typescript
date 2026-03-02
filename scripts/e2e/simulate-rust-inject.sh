#!/usr/bin/env bash
set -euo pipefail

# E2E test for rust-inject examples:
# 1. prebuilt-plugin: consumer takes alpha's pre-built .plugin.wasm (no Rust compiler)
# 2. source-extensions: consumer combines their own Rust (beta) with alpha from source

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLES_DIR="$ROOT_DIR/packages/cre-sdk-examples"
OUTPUT_FILE="$(mktemp)"

cleanup() { rm -f "$OUTPUT_FILE"; }
trap cleanup EXIT

cd "$EXAMPLES_DIR"
cp -n .env.example .env 2>/dev/null || true

echo "=== Pre-building lib_alpha plugin (simulating third-party distribution) ==="
bun ../cre-sdk-javy-plugin/scripts/build-plugin.ts \
  --cre-exports ./rust-inject/lib_alpha \
  -o rust-inject/prebuilt-plugin/plugin/lib_alpha.plugin.wasm

echo ""
echo "=== Example 1: prebuilt-plugin (alpha via --plugin, no Rust compiler) ==="
cd rust-inject/prebuilt-plugin && make build && cd ../..

cre workflow simulate ./rust-inject/prebuilt-plugin \
  --non-interactive \
  --trigger-index 0 \
  > "$OUTPUT_FILE" 2>&1 || true
cat "$OUTPUT_FILE"

echo ""
echo "Validating prebuilt-plugin output..."
if ! grep -q "Hello from alpha" "$OUTPUT_FILE"; then
  echo "❌ ERROR: Expected 'Hello from alpha' not found"
  exit 1
fi
echo "✓ Found: Hello from alpha"

echo ""
echo "=== Example 2: source-extensions (alpha + beta from source) ==="
cd rust-inject/source-extensions && make build && cd ../..

cre workflow simulate ./rust-inject/source-extensions \
  --non-interactive \
  --trigger-index 0 \
  > "$OUTPUT_FILE" 2>&1 || true
cat "$OUTPUT_FILE"

echo ""
echo "Validating source-extensions output..."
if ! grep -q "Hello from alpha" "$OUTPUT_FILE"; then
  echo "❌ ERROR: Expected 'Hello from alpha' not found"
  exit 1
fi
if ! grep -q "Hello from beta" "$OUTPUT_FILE"; then
  echo "❌ ERROR: Expected 'Hello from beta' not found"
  exit 1
fi
echo "✓ Found: Hello from alpha"
echo "✓ Found: Hello from beta"

echo ""
echo "✅ All E2E validation checks passed!"
