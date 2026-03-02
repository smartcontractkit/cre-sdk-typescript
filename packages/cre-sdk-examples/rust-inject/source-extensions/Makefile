# Example: source-extensions — user has their own Rust (lib_beta) combined with alpha's rlib
# Assumes lib_alpha has been built (make -C ../lib_alpha build).
# --cre-exports auto-detects: .rlib → pre-compiled, directory → source crate.
.PHONY: build clean

build:
	mkdir -p wasm
	cd ../.. && bun cre-compile \
		--cre-exports ./rust-inject/lib_alpha/dist/lib_alpha.rlib \
		--cre-exports ./rust-inject/lib_beta \
		rust-inject/source-extensions/index.ts \
		rust-inject/source-extensions/wasm/workflow.wasm

clean:
	rm -rf wasm
