# Declare all matching test.wasm targets as phony
.PHONY: FORCE
FORCE:

# Pattern rule to build test.wasm in any subdirectory
%/test.wasm: FORCE
	@echo "Building test: $*"
	@path_parts=($(subst /, ,$*)); \
	if [ $${#path_parts[@]} -eq 1 ]; then \
		cd ../.. && bun compile:workflow src/standard_tests/$${path_parts[0]}/test.ts .temp/src/standard_tests/$${path_parts[0]}/test.wasm; \
	elif [ $${#path_parts[@]} -eq 2 ]; then \
		cd ../.. && bun compile:workflow src/standard_tests/$${path_parts[0]}/$${path_parts[1]}/test.ts .temp/src/standard_tests/$${path_parts[0]}/$${path_parts[1]}/test.wasm; \
	else \
		echo "❌ Unsupported test path depth: $*"; \
		exit 1; \
	fi
