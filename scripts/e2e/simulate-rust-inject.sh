#!/usr/bin/env bash
set -euo pipefail

# E2E test for rust-inject examples:
# Alpha is a "third-party" library that produces both:
#   - a pre-built .plugin.wasm (for consumers without a Rust compiler)
#   - a pre-compiled .rlib (for consumers who want to combine with their own Rust)
#
# Example 1: prebuilt-plugin — consumer uses alpha's .plugin.wasm via --plugin
# Example 2: source-extensions — consumer uses alpha's .rlib + compiles beta from source

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLES_DIR="$ROOT_DIR/packages/cre-sdk-examples"
OUTPUT_FILE="$(mktemp)"

cleanup() { rm -f "$OUTPUT_FILE"; }
trap cleanup EXIT

cd "$EXAMPLES_DIR"
cp -n .env.example .env 2>/dev/null || true

echo "=== Building lib_alpha distribution ==="
make -C rust-inject/lib_alpha build

echo ""
echo "=== Example 1: prebuilt-plugin (alpha via --plugin, no Rust compiler) ==="
make -C rust-inject/prebuilt-plugin build

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
echo "=== Example 2: source-extensions (alpha rlib + beta from source) ==="
make -C rust-inject/source-extensions build

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
