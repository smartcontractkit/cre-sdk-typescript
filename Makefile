COMMON_VERSION ?= cre-std-tests@0.4.0
MODULE := github.com/smartcontractkit/chainlink-common
TEST_PATTERN ?= ^TestStandard
SKIP_TESTS ?= TestStandardCapabilityCallsAreAsync|TestStandardSecretsFailInNodeMode|TestStandardModeSwitch/successful_mode_switch

.PHONY: standard_tests standard_test_single
standard_tests:
	@echo "Downloading standard test version $(COMMON_VERSION)"
	mkdir -p .tools
	@go mod download -json $(MODULE)@$(COMMON_VERSION) >/dev/null
	@mod_dir=$$(go list -m -f '{{.Dir}}' $(MODULE)@$(COMMON_VERSION)); \
	abs_dir=$$(cd .tools && pwd); \
	echo "Building standard tests"; \
	( cd $$mod_dir/pkg/workflows/wasm/host && go test -c -o $$abs_dir/host.test . ); \
	echo "Running standard tests"; \
	$$abs_dir/host.test -test.v -test.run $(TEST_PATTERN) \
	-path=dist/workflows/standard_tests \
	-test.skip="$(SKIP_TESTS)"

# Run a single test by name
# Usage: make standard_test_single TEST=TestStandardCapabilityRegistration
standard_test_single:
	@if [ -z "$(TEST)" ]; then \
		echo "Error: TEST parameter is required. Usage: make standard_test_single TEST=TestName"; \
		exit 1; \
	fi
	@echo "Running single test: $(TEST)"
	@$(MAKE) standard_tests TEST_PATTERN="^$(TEST)$$" SKIP_TESTS=""
