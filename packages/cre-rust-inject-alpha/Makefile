# Build alpha.plugin.wasm using the workspace @chainlink/cre-sdk-javy-plugin.
JAVY_PLUGIN := $(abspath ../cre-sdk-javy-plugin)

.PHONY: build clean

build: dist/alpha.plugin.wasm

dist/alpha.plugin.wasm: Cargo.toml src/lib.rs
	mkdir -p dist
	CRE_SDK_JAVY_PLUGIN_HOME="$(JAVY_PLUGIN)" bun "$(JAVY_PLUGIN)/scripts/build-plugin.ts" \
		--cre-exports . \
		-o ./dist/alpha.plugin.wasm

clean:
	rm -rf dist
