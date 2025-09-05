import { mock, beforeEach } from 'bun:test'

// Mock CRE globals
globalThis.callCapability = mock((_request: Uint8Array) => 1)
globalThis.awaitCapabilities = mock(
	(_awaitRequest: Uint8Array, _maxResponseLen: number) =>
		new Uint8Array(Buffer.from('mock_await_cabilities_response', 'utf8')),
)
globalThis.getSecrets = mock((_request: Uint8Array, _maxResponseLen: number) => 1)
globalThis.awaitSecrets = mock(
	(_awaitRequest: Uint8Array, _maxResponseLen: number) =>
		new Uint8Array(Buffer.from('mock_await_secrets_response', 'utf8')),
)
globalThis.log = mock((message: string) => console.log(message))
globalThis.sendResponse = mock((_response: Uint8Array) => 0)
globalThis.switchModes = mock((_mode: 0 | 1 | 2) => {})
globalThis.versionV2 = mock(() => {})
globalThis.randomSeed = mock((_mode: 1 | 2) => Math.random())
globalThis.getWasiArgs = mock(() => '["mock.wasm", ""]')

beforeEach(() => {
	mock.restore()
	mock.clearAllMocks()
})
