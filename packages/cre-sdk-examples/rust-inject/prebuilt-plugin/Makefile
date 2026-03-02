# Example: prebuilt-plugin — compile workflow with a pre-built .plugin.wasm
# Assumes lib_alpha has been built (make -C ../lib_alpha build).
.PHONY: build clean

build:
	mkdir -p wasm
	cd ../.. && bun cre-compile --plugin ./rust-inject/lib_alpha/dist/lib_alpha.plugin.wasm \
		rust-inject/prebuilt-plugin/index.ts \
		rust-inject/prebuilt-plugin/wasm/workflow.wasm

clean:
	rm -rf wasm
