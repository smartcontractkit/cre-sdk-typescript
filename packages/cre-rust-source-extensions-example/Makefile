# Compiles alpha (from workspace) + beta (from workspace) as source extensions via --cre-exports.
JAVY_PLUGIN := $(abspath ../cre-sdk-javy-plugin)
ALPHA_PKG   := $(abspath ../cre-rust-inject-alpha)
BETA_PKG    := $(abspath ../cre-rust-inject-beta)

.PHONY: build clean

build:
	mkdir -p wasm
	CRE_SDK_JAVY_PLUGIN_HOME="$(JAVY_PLUGIN)" bun cre-compile \
		--cre-exports $(ALPHA_PKG) \
		--cre-exports $(BETA_PKG) \
		./index.ts \
		./wasm/workflow.wasm

clean:
	rm -rf wasm
