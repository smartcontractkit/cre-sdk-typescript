# Uses pre-built alpha.plugin.wasm from @chainlink/cre-rust-inject-alpha via --plugin.
JAVY_PLUGIN := $(abspath ../cre-sdk-javy-plugin)
ALPHA_PKG   := $(abspath ../cre-rust-inject-alpha)

.PHONY: build clean

build:
	mkdir -p wasm
	@test -f "$(ALPHA_PKG)/dist/alpha.plugin.wasm" || (echo "❌ cre-rust-inject-alpha not built — run 'make build' in ../cre-rust-inject-alpha first" && exit 1)
	CRE_SDK_JAVY_PLUGIN_HOME="$(JAVY_PLUGIN)" bun cre-compile \
		--plugin $(ALPHA_PKG)/dist/alpha.plugin.wasm \
		./index.ts \
		./wasm/workflow.wasm

clean:
	rm -rf wasm
