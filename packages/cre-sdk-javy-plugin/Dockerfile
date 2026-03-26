# Deterministic build: wasm32-wasip1 cdylib, then javy init-plugin --deterministic.
# Exports to dist: initialized .plugin.wasm only (uninit cdylib stays in builder target/ only).
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

# --- Chainlink plugin (Rust) + cre_wasm_exports path dep + init-plugin ---
FROM rust:1.85.0-slim-bookworm AS plugin-builder

COPY --from=javy-cli /w/javy /usr/local/bin/javy

RUN apt-get update && apt-get install -y --no-install-recommends \
	curl ca-certificates clang libclang-dev llvm-dev \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Dependency warm-up: both crates (path ../cre_wasm_exports from javy_chainlink_sdk)
COPY src/cre_wasm_exports/Cargo.toml /build/cre_wasm_exports/
RUN mkdir -p /build/cre_wasm_exports/src && echo '' > /build/cre_wasm_exports/src/lib.rs

COPY src/javy_chainlink_sdk/rust-toolchain.toml src/javy_chainlink_sdk/Cargo.toml src/javy_chainlink_sdk/Cargo.lock /build/javy_chainlink_sdk/
RUN mkdir -p /build/javy_chainlink_sdk/src && echo '' > /build/javy_chainlink_sdk/src/lib.rs

WORKDIR /build/javy_chainlink_sdk
RUN --mount=type=cache,target=/usr/local/cargo/registry \
	cargo build --target wasm32-wasip1 --release 2>/dev/null || true

COPY src/cre_wasm_exports/src /build/cre_wasm_exports/src
RUN touch /build/cre_wasm_exports/src/lib.rs

COPY src/javy_chainlink_sdk/src /build/javy_chainlink_sdk/src
RUN touch /build/javy_chainlink_sdk/src/lib.rs

RUN --mount=type=cache,target=/usr/local/cargo/registry \
	cargo build --target wasm32-wasip1 --release

RUN javy init-plugin --deterministic \
	target/wasm32-wasip1/release/javy_chainlink_sdk.wasm \
	-o /javy-chainlink-sdk.plugin.wasm

FROM scratch
# Uninitialized javy_chainlink_sdk.wasm stays in the builder image only (input to init-plugin above).
COPY --from=plugin-builder /javy-chainlink-sdk.plugin.wasm /javy-chainlink-sdk.plugin.wasm
