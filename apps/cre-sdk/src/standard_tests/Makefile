# Declare all matching test.wasm targets as phony
.PHONY: FORCE
FORCE:

# Pattern rule to build test.wasm in any subdirectory
%/test.wasm: FORCE
	bun test:standard:compile $*
