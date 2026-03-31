#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# When set: build plugin on the host (bun + ensureJavy + cargo) — same Javy resolution as the Dockerfile's first stage.
# Preferred: SKIP_DOCKER_IMAGE=1
# Deprecated alias: SKIP_DOCKER_CRE_JAVY_PLUGIN_BUILD=1 (still honored)
if [ -n "${SKIP_DOCKER_IMAGE:-}" ] || [ -n "${SKIP_DOCKER_CRE_JAVY_PLUGIN_BUILD:-}" ]; then
	exec "$SCRIPT_DIR/build-plugin-local.sh"
fi

CRE_JAVY_VERSION="${CRE_JAVY_VERSION:-${JAVY_VERSION:-v8.1.0}}"

cd "$PLUGIN_DIR"

echo "---> Building plugin WASM in Docker (Javy via ensureJavy in image; CRE_JAVY_VERSION=${CRE_JAVY_VERSION})"
echo ""

docker build \
	--platform linux/amd64 \
	--build-arg "CRE_JAVY_VERSION=${CRE_JAVY_VERSION}" \
	--output type=local,dest=dist \
	.

echo ""
echo "✅ Plugin WASM built: dist/javy-chainlink-sdk.plugin.wasm"
