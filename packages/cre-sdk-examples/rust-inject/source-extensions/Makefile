# Simulates a customer: compiles lib_alpha (from installed npm package) + lib_beta (local) as source extensions.
# Run 'bun install' in this directory first (file: deps in package.json point to .packaged/).
# CRE_SDK_JAVY_PLUGIN_HOME and --cre-exports use real .packaged/ paths to avoid Cargo symlink issues.
RUST_INJECT := $(abspath ..)
PACKED_SDK  := $(abspath $(RUST_INJECT)/.packaged/cre-sdk-javy-plugin)
ALPHA_PKG   := $(abspath $(RUST_INJECT)/.packaged/lib-alpha)

.PHONY: build clean

build:
	mkdir -p wasm
	@test -d "$(ALPHA_PKG)" || (echo "❌ .packaged/lib-alpha not found — run simulate-rust-inject.sh first" && exit 1)
	cd ../.. && CRE_SDK_JAVY_PLUGIN_HOME="$(PACKED_SDK)" bun cre-compile \
		--cre-exports $(ALPHA_PKG) \
		--cre-exports ./rust-inject/lib_beta \
		./rust-inject/source-extensions/index.ts \
		./rust-inject/source-extensions/wasm/workflow.wasm

clean:
	rm -rf wasm
