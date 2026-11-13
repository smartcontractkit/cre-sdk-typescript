#!/usr/bin/env bash
# Fetches the protos the SDK generates from that the capabilities repo owns, with protofetch at the revision the
# lock pins, and stages the feature protos the development protos import where buf finds them: no content root
# fetches them at the path they are imported by, so they are fetched at the root of what is fetched, beside this
# repo's root, relative to where protofetch runs.
set -euo pipefail
cd "$(dirname "$0")/.."

protofetch fetch

mkdir -p .deps/capability/feature
cp .deps/feature.proto .deps/capability/feature/feature.proto
