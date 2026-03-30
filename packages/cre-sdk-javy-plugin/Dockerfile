# Deterministic build of the Chainlink Javy plugin WASMs (uninitialized + initialized).
# Javy CLI: same code path as locally — Bun runs ensureJavy (GitHub release + checksum).
# Only javy_chainlink_sdk is built with cargo; then javy init-plugin --deterministic.
#
# Usage:
#   ./scripts/build-plugin-docker.sh

# --- Javy CLI via ensureJavy (identical to SKIP_DOCKER_IMAGE / build-plugin-local.sh) ---
FROM oven/bun:slim AS javy-cli

ARG CRE_JAVY_VERSION=v8.1.0
ENV CRE_JAVY_VERSION=${CRE_JAVY_VERSION}
ENV CRE_SDK_JAVY_LOG_STDERR=1

WORKDIR /w
COPY scripts/ensure-javy.ts scripts/print-javy-path-for-build.ts scripts/

RUN set -eu; \
	JAVY_BIN="$(bun scripts/print-javy-path-for-build.ts | tr -d '\r\n')"; \
	test -f "$JAVY_BIN"; \
	cp "$JAVY_BIN" /w/javy; \
	chmod +x /w/javy

# --- Chainlink plugin (Rust) + init-plugin ---
# Pin image tag to match rust-toolchain.toml (avoid `slim-bookworm` tag drift changing WASM bytes).
FROM rust:1.85.0-slim-bookworm AS plugin-builder

COPY --from=javy-cli /w/javy /usr/local/bin/javy

# javy → rquickjs-sys: curl for WASI SDK fetch; clang/libclang for bindgen.
RUN apt-get update && apt-get install -y --no-install-recommends \
	curl ca-certificates clang libclang-dev llvm-dev \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /plugin
COPY src/javy_chainlink_sdk/rust-toolchain.toml src/javy_chainlink_sdk/Cargo.toml src/javy_chainlink_sdk/Cargo.lock ./
RUN mkdir src && echo '' > src/lib.rs
RUN --mount=type=cache,target=/usr/local/cargo/registry \
	cargo build --target wasm32-wasip1 --release 2>/dev/null || true

COPY src/javy_chainlink_sdk/src ./src
RUN touch src/lib.rs
RUN --mount=type=cache,target=/usr/local/cargo/registry \
	cargo build --target wasm32-wasip1 --release

RUN javy init-plugin --deterministic \
	target/wasm32-wasip1/release/javy_chainlink_sdk.wasm \
	-o /javy-chainlink-sdk.plugin.wasm

FROM scratch
COPY --from=plugin-builder /plugin/target/wasm32-wasip1/release/javy_chainlink_sdk.wasm /javy_chainlink_sdk.wasm
COPY --from=plugin-builder /javy-chainlink-sdk.plugin.wasm /javy-chainlink-sdk.plugin.wasm
