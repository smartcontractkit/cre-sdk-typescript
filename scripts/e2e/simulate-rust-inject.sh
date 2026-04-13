#!/usr/bin/env bash
set -euo pipefail

# E2E test for rust-inject examples — builds and validates using workspace packages:
#
# Step 1: Build lib_alpha → dist/alpha.plugin.wasm
# Step 2: Build prebuilt-plugin and source-extensions in parallel
# Step 3: Simulate and validate outputs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"
OUTPUT_5A="$(mktemp)"
OUTPUT_5B="$(mktemp)"

cleanup() { rm -f "$OUTPUT_5A" "$OUTPUT_5B"; }
trap cleanup EXIT

# ── Step 1: Build lib_alpha ──────────────────────────────────────────────────
echo "=== Step 1: Building cre-rust-inject-alpha ==="
make -C "$PACKAGES_DIR/cre-rust-inject-alpha" build

# ── Step 2: Build prebuilt-plugin and source-extensions in parallel ──────────
echo ""
echo "=== Step 2: Building prebuilt-plugin and source-extensions in parallel ==="
make -C "$PACKAGES_DIR/cre-rust-prebuilt-plugin-example" build &
PID_5A=$!
make -C "$PACKAGES_DIR/cre-rust-source-extensions-example" build &
PID_5B=$!

FAIL=0
wait $PID_5A || FAIL=1
wait $PID_5B || FAIL=1
if [ $FAIL -ne 0 ]; then
  echo "❌ One or more builds failed"
  exit 1
fi

# ── Step 3a: Simulate prebuilt-plugin ────────────────────────────────────────
echo ""
echo "=== Step 3a: Simulating prebuilt-plugin ==="
cd "$PACKAGES_DIR/cre-rust-prebuilt-plugin-example"
cp -n "$PACKAGES_DIR/cre-sdk-examples/.env.example" .env 2>/dev/null || true

cre workflow simulate . \
  --non-interactive \
  --trigger-index 0 \
  > "$OUTPUT_5A" 2>&1 || true
cat "$OUTPUT_5A"

echo ""
echo "Validating prebuilt-plugin output..."
if ! grep -q "Hello from alpha" "$OUTPUT_5A"; then
  echo "❌ ERROR: Expected 'Hello from alpha' not found"
  exit 1
fi
echo "✓ Found: Hello from alpha"

# ── Step 3b: Simulate source-extensions ──────────────────────────────────────
echo ""
echo "=== Step 3b: Simulating source-extensions ==="
cd "$PACKAGES_DIR/cre-rust-source-extensions-example"
cp -n "$PACKAGES_DIR/cre-sdk-examples/.env.example" .env 2>/dev/null || true

cre workflow simulate . \
  --non-interactive \
  --trigger-index 0 \
  > "$OUTPUT_5B" 2>&1 || true
cat "$OUTPUT_5B"

echo ""
echo "Validating source-extensions output..."
if ! grep -q "Hello from alpha" "$OUTPUT_5B"; then
  echo "❌ ERROR: Expected 'Hello from alpha' not found"
  exit 1
fi
if ! grep -q "Hello from beta" "$OUTPUT_5B"; then
  echo "❌ ERROR: Expected 'Hello from beta' not found"
  exit 1
fi
echo "✓ Found: Hello from alpha"
echo "✓ Found: Hello from beta"

echo ""
echo "✅ All E2E validation checks passed!"
