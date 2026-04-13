#!/usr/bin/env bash
set -euo pipefail

# E2E test for rust-inject examples — builds and validates using workspace packages:
#
# Step 1: Build lib_alpha → dist/alpha.plugin.wasm
# Step 2: Build prebuilt-plugin (uses alpha's pre-built .plugin.wasm via --plugin)
# Step 3: Build source-extensions (compiles alpha + beta from source via --cre-exports)
# Step 4: Simulate and validate outputs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"
OUTPUT_FILE="$(mktemp)"

cleanup() { rm -f "$OUTPUT_FILE"; }
trap cleanup EXIT

# ── Step 1: Build lib_alpha ──────────────────────────────────────────────────
echo "=== Step 1: Building cre-rust-inject-alpha ==="
make -C "$PACKAGES_DIR/cre-rust-inject-alpha" build

# ── Step 2: Build prebuilt-plugin ────────────────────────────────────────────
echo ""
echo "=== Step 2: Building prebuilt-plugin (pre-built alpha.plugin.wasm via --plugin) ==="
make -C "$PACKAGES_DIR/cre-rust-prebuilt-plugin-example" build

# ── Step 3: Build source-extensions ──────────────────────────────────────────
echo ""
echo "=== Step 3: Building source-extensions (alpha + beta via --cre-exports) ==="
make -C "$PACKAGES_DIR/cre-rust-source-extensions-example" build

# ── Step 4a: Simulate prebuilt-plugin ────────────────────────────────────────
echo ""
echo "=== Step 4a: Simulating prebuilt-plugin ==="
cd "$PACKAGES_DIR/cre-rust-prebuilt-plugin-example"
cp -n "$PACKAGES_DIR/cre-sdk-examples/.env.example" .env 2>/dev/null || true

cre workflow simulate . \
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

# ── Step 4b: Simulate source-extensions ──────────────────────────────────────
echo ""
echo "=== Step 4b: Simulating source-extensions ==="
cd "$PACKAGES_DIR/cre-rust-source-extensions-example"
cp -n "$PACKAGES_DIR/cre-sdk-examples/.env.example" .env 2>/dev/null || true

cre workflow simulate . \
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
