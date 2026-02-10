/**
 * Test-only utilities for the CRE SDK runtime. Not part of the public API.
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
} from './test-runtime'
export { TestWriter } from './test-writer'
