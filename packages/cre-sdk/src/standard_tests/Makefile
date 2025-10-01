# Declare all matching test.wasm targets as phony
.PHONY: FORCE
FORCE:

# Pattern rule to build test.wasm in any subdirectory
%/test.wasm: FORCE
	@echo "Building test: $*"
	@case "$*" in \
		*/*/*) \
			echo "❌ Unsupported test path depth: $*"; \
			exit 1; \
			;; \
		*/*) \
			cd ../.. && bun compile:workflow src/standard_tests/$$(echo "$*" | cut -d'/' -f1)/$$(echo "$*" | cut -d'/' -f2)/test.ts .temp/standard_tests/$$(echo "$*" | cut -d'/' -f1)/$$(echo "$*" | cut -d'/' -f2)/test.wasm; \
			;; \
		*) \
			cd ../.. && bun compile:workflow src/standard_tests/$*/test.ts .temp/standard_tests/$*/test.wasm; \
			;; \
	esac
