# Simulates a customer that installed @chainlink/cre-rust-inject-alpha and uses its pre-built plugin.
# Run 'bun install' in this directory first (file: deps in package.json point to .packaged/).
# CRE_SDK_JAVY_PLUGIN_HOME and plugin path use real .packaged/ paths to avoid Cargo symlink issues.
RUST_INJECT := $(abspath ..)
PACKED_SDK  := $(abspath $(RUST_INJECT)/.packaged/cre-sdk-javy-plugin)
ALPHA_PKG   := $(abspath $(RUST_INJECT)/.packaged/lib-alpha)

.PHONY: build clean

build:
	mkdir -p wasm
	@test -d "$(ALPHA_PKG)" || (echo "❌ .packaged/lib-alpha not found — run simulate-rust-inject.sh first" && exit 1)
	cd ../.. && CRE_SDK_JAVY_PLUGIN_HOME="$(PACKED_SDK)" bun cre-compile \
		--plugin $(ALPHA_PKG)/dist/alpha.plugin.wasm \
		./rust-inject/prebuilt-plugin/index.ts \
		./rust-inject/prebuilt-plugin/wasm/workflow.wasm

clean:
	rm -rf wasm
