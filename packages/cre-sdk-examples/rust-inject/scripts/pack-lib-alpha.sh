#!/usr/bin/env bash
# Pack rust-inject/lib_alpha (wasm + Rust source) as npm would publish it, extract to .packaged/lib-alpha.
# Rewrites Cargo.toml path for tarball layout: ../.packaged/cre-sdk-javy-plugin → ../cre-sdk-javy-plugin
# (sibling layout under @chainlink/* after npm install).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUST_INJECT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGED="$RUST_INJECT/.packaged"
LIB_ALPHA="$RUST_INJECT/lib_alpha"
ORIG="$LIB_ALPHA/Cargo.toml.orig"

cp "$LIB_ALPHA/Cargo.toml" "$ORIG"
sed 's|\.\./\.packaged/cre-sdk-javy-plugin|\.\./cre-sdk-javy-plugin|g' \
	"$ORIG" > "$LIB_ALPHA/Cargo.toml"

restore_cargo() {
	if [[ -f "$ORIG" ]]; then
		mv -f "$ORIG" "$LIB_ALPHA/Cargo.toml"
	fi
}
trap restore_cargo EXIT

mkdir -p "$PACKAGED"
cd "$LIB_ALPHA"
TGZ=$(npm pack --pack-destination "$PACKAGED")
cd "$PACKAGED"
rm -rf lib-alpha
mkdir -p lib-alpha
tar -xzf "$TGZ" -C lib-alpha --strip-components 1
rm -f "$TGZ"

trap - EXIT
restore_cargo

echo "✅ Extracted lib_alpha npm pack → $PACKAGED/lib-alpha"
