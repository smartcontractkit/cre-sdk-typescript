# lib_alpha distribution build — produces both .plugin.wasm and .rlib
# Run from the lib_alpha directory: make build
PLUGIN_SDK := ../../../cre-sdk-javy-plugin

.PHONY: build clean

build: dist/lib_alpha.plugin.wasm dist/lib_alpha.rlib

dist/lib_alpha.plugin.wasm: src/lib.rs Cargo.toml
	mkdir -p dist
	cd ../.. && bun $(PLUGIN_SDK)/scripts/build-plugin.ts \
		--cre-exports ./rust-inject/lib_alpha \
		-o rust-inject/lib_alpha/dist/lib_alpha.plugin.wasm

dist/lib_alpha.rlib: src/lib.rs Cargo.toml
	mkdir -p dist
	cd ../.. && bun $(PLUGIN_SDK)/scripts/build-rlib.ts \
		--cre-exports ./rust-inject/lib_alpha \
		-o rust-inject/lib_alpha/dist/lib_alpha.rlib

clean:
	rm -rf dist
