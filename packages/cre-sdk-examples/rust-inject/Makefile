# Rust-inject examples: use npm-packed cre-sdk-javy-plugin + packed lib_alpha (see lib_alpha/Makefile).
.PHONY: build clean

build:
	$(MAKE) -C lib_alpha build
	$(MAKE) -C lib_alpha pack-lib-alpha
	$(MAKE) -C prebuilt-plugin build
	$(MAKE) -C source-extensions build

clean:
	$(MAKE) -C lib_alpha clean
	$(MAKE) -C prebuilt-plugin clean
	$(MAKE) -C source-extensions clean
