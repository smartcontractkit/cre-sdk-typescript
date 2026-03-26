#!/usr/bin/env bash
# Pack @chainlink/cre-sdk-javy-plugin exactly as npm would publish it, extract to .packaged/cre-sdk-javy-plugin.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUST_INJECT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGED="$RUST_INJECT/.packaged"
JAVY_SRC="$(cd "$RUST_INJECT/../.." && pwd)/cre-sdk-javy-plugin"

mkdir -p "$PACKAGED"
cd "$JAVY_SRC"
TGZ=$(npm pack --pack-destination "$PACKAGED")
cd "$PACKAGED"
rm -rf cre-sdk-javy-plugin
mkdir -p cre-sdk-javy-plugin
tar -xzf "$TGZ" -C cre-sdk-javy-plugin --strip-components 1
rm -f "$TGZ"
