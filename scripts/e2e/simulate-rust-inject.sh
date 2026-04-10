#!/usr/bin/env bash
set -euo pipefail

# E2E test for rust-inject examples — simulates the customer npm-package workflow:
#
# Step 1: Pack @chainlink/cre-sdk-javy-plugin → .packaged/cre-sdk-javy-plugin/
#         (simulates "npm publish" of the SDK)
#
# Step 2: Build lib_alpha with the packed SDK → dist/alpha.plugin.wasm
#         (lib_alpha's Cargo.toml references .packaged/cre-sdk-javy-plugin for path deps)
#
# Step 3: Pack lib_alpha (includes pre-built plugin + Rust source) → .packaged/lib-alpha/
#         (simulates "npm publish @chainlink/cre-rust-inject-alpha")
#
# Step 4: Install deps for each example (file: deps from .packaged/ simulate npm install)
#
# Step 5a: prebuilt-plugin — customer installs the alpha package and uses its .plugin.wasm via --plugin
# Step 5b: source-extensions — customer installs alpha (Rust source) + adds local lib_beta via --cre-exports

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLES_DIR="$ROOT_DIR/packages/cre-sdk-examples"
RUST_INJECT="$EXAMPLES_DIR/rust-inject"
PACKAGED="$RUST_INJECT/.packaged"
OUTPUT_FILE="$(mktemp)"

cleanup() { rm -f "$OUTPUT_FILE"; }
trap cleanup EXIT

# ── Step 1: Pack cre-sdk-javy-plugin ─────────────────────────────────────────
echo "=== Step 1: Packing @chainlink/cre-sdk-javy-plugin ==="
JAVY_PLUGIN_SRC="$ROOT_DIR/packages/cre-sdk-javy-plugin"
rm -rf "$PACKAGED"
mkdir -p "$PACKAGED"
TARBALL=$(cd "$JAVY_PLUGIN_SRC" && npm pack --pack-destination "$PACKAGED")
tar xzf "$PACKAGED/$TARBALL" -C "$PACKAGED"
mv "$PACKAGED/package" "$PACKAGED/cre-sdk-javy-plugin"
rm -f "$PACKAGED/$TARBALL"
echo "✓ Packed → $PACKAGED/cre-sdk-javy-plugin"

# ── Step 2: Build lib_alpha with the packed SDK ───────────────────────────────
echo ""
echo "=== Step 2: Building lib_alpha with packed SDK ==="
make -C "$RUST_INJECT/lib_alpha" build

# ── Step 3: Pack lib_alpha ────────────────────────────────────────────────────
echo ""
echo "=== Step 3: Packing lib_alpha → .packaged/lib-alpha ==="
make -C "$RUST_INJECT/lib_alpha" pack-lib-alpha

# ── Step 4: Install deps for each example ────────────────────────────────────
echo ""
echo "=== Step 4: Installing deps for prebuilt-plugin ==="
(cd "$RUST_INJECT/prebuilt-plugin" && bun install)

echo ""
echo "=== Step 4: Installing deps for source-extensions ==="
(cd "$RUST_INJECT/source-extensions" && bun install)

cd "$EXAMPLES_DIR"
cp -n .env.example .env 2>/dev/null || true

# ── Steps 5a + 5b: build in parallel, then validate ─────────────────────────
echo ""
echo "=== Step 5a+5b: Building prebuilt-plugin and source-extensions in parallel ==="
make -C "$RUST_INJECT/prebuilt-plugin" build &
PID_5A=$!
make -C "$RUST_INJECT/source-extensions" build &
PID_5B=$!

FAIL=0
wait $PID_5A || FAIL=1
wait $PID_5B || FAIL=1
if [ $FAIL -ne 0 ]; then
  echo "❌ One or more builds failed"
  exit 1
fi

OUTPUT_5A="$(mktemp)"
OUTPUT_5B="$(mktemp)"
cleanup_outputs() { rm -f "$OUTPUT_5A" "$OUTPUT_5B"; }
trap 'cleanup; cleanup_outputs' EXIT

echo ""
echo "=== Step 5a: Simulating prebuilt-plugin ==="
cre workflow simulate ./rust-inject/prebuilt-plugin \
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

echo ""
echo "=== Step 5b: Simulating source-extensions ==="
cre workflow simulate ./rust-inject/source-extensions \
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
