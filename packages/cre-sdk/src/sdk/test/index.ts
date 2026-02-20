/**
 * Test-only surface for the CRE SDK: test framework and (when generated) capability mocks.
 * Use for unit testing runtime logic without the WASM execution environment.
 */

export {
	type CapabilityHandler,
	DEFAULT_MAX_RESPONSE_SIZE_BYTES,
	getTestCapabilityHandler,
	type NewTestRuntimeOptions,
	newTestRuntime,
	REPORT_METADATA_HEADER_LENGTH,
	RESPONSE_BUFFER_TOO_SMALL,
	registerTestCapability,
	type Secrets,
	TestRuntime,
	type TestRuntimeState,
	test,
} from '../testutils/test-runtime'
export { TestWriter } from '../testutils/test-writer'
export {
	type AddContractMockOptions,
	addContractMock,
	type ContractMock,
	type WriteReportMockInput,
} from './evm-contract-mock'
export * from './generated'
