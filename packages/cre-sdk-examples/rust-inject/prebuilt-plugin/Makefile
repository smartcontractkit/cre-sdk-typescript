# Example 2: prebuilt-plugin — compile workflow with a pre-built .plugin.wasm
# Assumes lib_alpha.plugin.wasm is already built (see parent Makefile).
.PHONY: build clean

build:
	mkdir -p wasm
	cd ../.. && bun cre-compile --plugin ./rust-inject/prebuilt-plugin/plugin/lib_alpha.plugin.wasm \
		rust-inject/prebuilt-plugin/index.ts \
		rust-inject/prebuilt-plugin/wasm/workflow.wasm

clean:
	rm -rf wasm
