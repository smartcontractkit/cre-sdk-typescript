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
BUILD_LOG_5A="$(mktemp)"
BUILD_LOG_5B="$(mktemp)"
make -C "$PACKAGES_DIR/cre-rust-prebuilt-plugin-example" build > "$BUILD_LOG_5A" 2>&1 &
PID_5A=$!
make -C "$PACKAGES_DIR/cre-rust-source-extensions-example" build > "$BUILD_LOG_5B" 2>&1 &
PID_5B=$!

FAIL=0
wait $PID_5A || { echo "❌ prebuilt-plugin build failed:"; cat "$BUILD_LOG_5A"; FAIL=1; }
wait $PID_5B || { echo "❌ source-extensions build failed:"; cat "$BUILD_LOG_5B"; FAIL=1; }
rm -f "$BUILD_LOG_5A" "$BUILD_LOG_5B"
if [ $FAIL -ne 0 ]; then
  exit 1
fi

# ── Step 3a: Simulate prebuilt-plugin ────────────────────────────────────────
echo ""
echo "=== Step 3a: Simulating prebuilt-plugin ==="
cd "$PACKAGES_DIR/cre-rust-prebuilt-plugin-example"
cp -n "$PACKAGES_DIR/cre-sdk-examples/.env.example" .env 2>/dev/null || true

if [ ! -f "./wasm/workflow.wasm" ]; then
  echo "❌ ERROR: ./wasm/workflow.wasm not found — build step did not produce it"
  exit 1
fi

SIM_EXIT_5A=0
cre workflow simulate . \
  --non-interactive \
  --trigger-index 0 \
  > "$OUTPUT_5A" 2>&1 || SIM_EXIT_5A=$?
cat "$OUTPUT_5A"
if [ "$SIM_EXIT_5A" -ne 0 ]; then
  echo "⚠️  WARNING: cre workflow simulate exited with code $SIM_EXIT_5A"
fi

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

if [ ! -f "./wasm/workflow.wasm" ]; then
  echo "❌ ERROR: ./wasm/workflow.wasm not found — build step did not produce it"
  exit 1
fi

SIM_EXIT_5B=0
cre workflow simulate . \
  --non-interactive \
  --trigger-index 0 \
  > "$OUTPUT_5B" 2>&1 || SIM_EXIT_5B=$?
cat "$OUTPUT_5B"
if [ "$SIM_EXIT_5B" -ne 0 ]; then
  echo "⚠️  WARNING: cre workflow simulate exited with code $SIM_EXIT_5B"
fi

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
