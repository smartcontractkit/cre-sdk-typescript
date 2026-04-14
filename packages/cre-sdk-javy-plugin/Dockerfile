# syntax=docker/dockerfile:1
# Deterministic build: wasm32-wasip1 cdylib, then javy init-plugin --deterministic.
# Exports to dist: initialized .plugin.wasm only (uninit cdylib stays in builder target/ only).
#
# Usage:
#   ./scripts/build-plugin-docker.sh

# --- Javy CLI + host crate generation (same code path as user builds) ---
FROM oven/bun:slim AS javy-cli

ARG CRE_JAVY_VERSION=v8.1.0
ENV CRE_JAVY_VERSION=${CRE_JAVY_VERSION}
ENV CRE_SDK_JAVY_LOG_STDERR=1

WORKDIR /w
COPY scripts/ensure-javy.ts scripts/print-javy-path-for-build.ts scripts/generate-host-crate.ts scripts/

RUN set -eu; \
	JAVY_BIN="$(bun scripts/print-javy-path-for-build.ts | tr -d '\r\n')"; \
	test -f "$JAVY_BIN"; \
	cp "$JAVY_BIN" /w/javy; \
	chmod +x /w/javy

# Generate host crate via generateHostCrate (zero extensions).
# Layout at /build/src/... mirrors the Rust builder so absolute paths in the
# generated Cargo.toml resolve in both stages.
COPY src/javy_chainlink_sdk/rust-toolchain.toml /build/src/javy_chainlink_sdk/rust-toolchain.toml
RUN bun -e "import{generateHostCrate}from'./scripts/generate-host-crate.ts';generateHostCrate('/build/cre_generated_host','/build',[])"

# --- Chainlink plugin (Rust) via generated host crate + init-plugin ---
FROM rust:1.85.0-slim-bookworm AS plugin-builder

COPY --from=javy-cli /w/javy /usr/local/bin/javy

RUN apt-get update && apt-get install -y --no-install-recommends \
	curl ca-certificates clang libclang-dev llvm-dev \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Dependency warm-up: copy manifests + stub sources, then build to cache deps
COPY src/cre_wasm_exports/Cargo.toml /build/src/cre_wasm_exports/
RUN mkdir -p /build/src/cre_wasm_exports/src && echo '' > /build/src/cre_wasm_exports/src/lib.rs

COPY src/javy_chainlink_sdk/rust-toolchain.toml src/javy_chainlink_sdk/Cargo.toml src/javy_chainlink_sdk/Cargo.lock /build/src/javy_chainlink_sdk/
RUN mkdir -p /build/src/javy_chainlink_sdk/src && echo '' > /build/src/javy_chainlink_sdk/src/lib.rs

COPY --from=javy-cli /build/cre_generated_host /build/cre_generated_host

WORKDIR /build/cre_generated_host
RUN --mount=type=cache,target=/usr/local/cargo/registry \
	cargo build --target wasm32-wasip1 --release 2>/dev/null || true

COPY src/cre_wasm_exports/src /build/src/cre_wasm_exports/src
RUN touch /build/src/cre_wasm_exports/src/lib.rs

COPY src/javy_chainlink_sdk/src /build/src/javy_chainlink_sdk/src
RUN touch /build/src/javy_chainlink_sdk/src/lib.rs

RUN --mount=type=cache,target=/usr/local/cargo/registry \
	cargo build --target wasm32-wasip1 --release

RUN javy init-plugin --deterministic \
	target/wasm32-wasip1/release/cre_generated_host.wasm \
	-o /javy-chainlink-sdk.plugin.wasm

FROM scratch
COPY --from=plugin-builder /javy-chainlink-sdk.plugin.wasm /javy-chainlink-sdk.plugin.wasm
