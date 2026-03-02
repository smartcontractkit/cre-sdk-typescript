# Example: source-extensions — user has their own Rust (lib_beta) combined with alpha from source
.PHONY: build clean

build:
	mkdir -p wasm
	cd ../.. && bun cre-compile \
		--cre-exports ./rust-inject/lib_alpha \
		--cre-exports ./rust-inject/lib_beta \
		rust-inject/source-extensions/index.ts \
		rust-inject/source-extensions/wasm/workflow.wasm

clean:
	rm -rf wasm
