# Build alpha.plugin.wasm using the npm-packed @chainlink/cre-sdk-javy-plugin.
# simulate-rust-inject.sh packs the SDK into .packaged/cre-sdk-javy-plugin before invoking this.
RUST_INJECT := $(abspath ..)
PACKED_SDK  := $(abspath $(RUST_INJECT)/.packaged/cre-sdk-javy-plugin)

.PHONY: build clean pack-lib-alpha

build: dist/alpha.plugin.wasm

dist/alpha.plugin.wasm: Cargo.toml
	@test -d "$(PACKED_SDK)" || (echo "❌ $(PACKED_SDK) not found. Run simulate-rust-inject.sh to pack the SDK first." && exit 1)
	mkdir -p dist
	cd $(RUST_INJECT) && CRE_SDK_JAVY_PLUGIN_HOME="$(PACKED_SDK)" bun "$(PACKED_SDK)/scripts/build-plugin.ts" \
		--cre-exports ./lib_alpha \
		-o ./lib_alpha/dist/alpha.plugin.wasm

pack-lib-alpha: dist/alpha.plugin.wasm
	bash $(RUST_INJECT)/scripts/pack-lib-alpha.sh

clean:
	rm -rf dist
