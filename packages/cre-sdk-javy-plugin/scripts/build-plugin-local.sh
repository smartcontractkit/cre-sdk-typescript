#!/usr/bin/env bash
# Build uninitialized + initialized plugin WASMs without Docker (same end state as Dockerfile).
# Used when SKIP_DOCKER_IMAGE (or deprecated SKIP_DOCKER_CRE_JAVY_PLUGIN_BUILD) is set.
#
# Javy CLI: same as customers — downloaded release via ensureJavy (see print-javy-path-for-build.ts).
# We only compile the Chainlink plugin crate (wasm32-wasip1) and run javy init-plugin.
#
# Requires: bun, cargo, rustup (target wasm32-wasip1)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PLUGIN_DIR"

echo "---> Building plugin WASM locally (no Docker)"
echo "     Javy CLI: release binary via ensureJavy (CRE_JAVY_VERSION=${CRE_JAVY_VERSION:-v8.1.0})"
echo ""

JAVY_BIN="$(bun "$SCRIPT_DIR/print-javy-path-for-build.ts" | tr -d '\r\n')"
if [[ ! -f "$JAVY_BIN" ]]; then
	echo "error: ensureJavy did not return a usable Javy path: ${JAVY_BIN:-<empty>}" >&2
	exit 1
fi

rustup target add wasm32-wasip1

PLUGIN_CRATE="$PLUGIN_DIR/src/javy_chainlink_sdk"
echo "---> Building javy_chainlink_sdk (wasm32-wasip1 release)"
(
	cd "$PLUGIN_CRATE"
	cargo build --target wasm32-wasip1 --release
)

UNINIT="$PLUGIN_CRATE/target/wasm32-wasip1/release/javy_chainlink_sdk.wasm"
mkdir -p "$PLUGIN_DIR/dist"
cp "$PLUGIN_DIR/src/workflow.wit" "$PLUGIN_DIR/dist/workflow.wit"

echo "---> javy init-plugin --deterministic"
"$JAVY_BIN" init-plugin --deterministic "$UNINIT" \
	-o "$PLUGIN_DIR/dist/javy-chainlink-sdk.plugin.wasm"

echo ""
echo "✅ Plugin WASM built locally: dist/javy-chainlink-sdk.plugin.wasm"
