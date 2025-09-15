import { mock } from 'bun:test'
import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'

// Mock hostBindings before importing runInNodeMode
export const calls: string[] = []
export const mockHostBindings = {
	sendResponse: mock((_response: Uint8Array) => 0),
	switchModes: mock((mode: Mode) => {
		calls.push(mode === Mode.NODE ? 'NODE' : mode === Mode.DON ? 'DON' : 'UNSPECIFIED')
	}),
	log: mock((_message: string) => {}),
	callCapability: mock((_request: string) => 1),
	awaitCapabilities: mock((_awaitRequest: string, _maxResponseLen: number) =>
		btoa('mock_await_capabilities_response'),
	),
	getSecrets: mock((_request: string, _maxResponseLen: number) => 1),
	awaitSecrets: mock((_awaitRequest: string, _maxResponseLen: number) =>
		btoa('mock_await_secrets_response'),
	),
	versionV2: mock(() => {}),
	randomSeed: mock((_mode: Mode.DON | Mode.NODE) => Math.random()),
	getWasiArgs: mock(() => '["mock.wasm", ""]'),
	now: mock(() => Date.now()),
}

// Set up global mocks before any modules are imported
Object.assign(globalThis, mockHostBindings)

// Mock the module
mock.module('@cre/sdk/runtime/host-bindings', () => ({
	hostBindings: mockHostBindings,
}))
