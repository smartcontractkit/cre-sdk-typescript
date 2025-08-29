COMMON_VERSION ?= cre-std-tests@0.4.0
MODULE := github.com/smartcontractkit/chainlink-common

.PHONY: standard_tests
standard_tests:
	@echo "Downloading standard test version $(COMMON_VERSION)"
	mkdir -p .tools
	@go mod download -json $(MODULE)@$(COMMON_VERSION) >/dev/null
	@mod_dir=$$(go list -m -f '{{.Dir}}' $(MODULE)@$(COMMON_VERSION)); \
	abs_dir=$$(cd .tools && pwd); \
	echo "Building standard tests"; \
	( cd $$mod_dir/pkg/workflows/wasm/host && go test -c -o $$abs_dir/host.test . ); \
	echo "Running standard tests"; \
	$$abs_dir/host.test -test.v -test.run ^TestStandard \
	-path=dist/workflows/standard_tests \
	-test.skip="TestStandardModeSwitch|TestStandardCapabilityCallsAreAsync|TestStandardSecretsFailInNodeMode"
