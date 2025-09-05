import { mock, beforeEach } from "bun:test";

// Mock CRE globals
globalThis.callCapability = mock((_request: string) => 1);
globalThis.awaitCapabilities = mock(
  (_awaitRequest: string, _maxResponseLen: number) =>
    btoa("mock_await_cabilities_response")
);
globalThis.getSecrets = mock((_request: string, _maxResponseLen: number) => 1);
globalThis.awaitSecrets = mock(
  (_awaitRequest: string, _maxResponseLen: number) =>
    btoa("mock_await_secrets_response")
);
globalThis.log = mock((message: string) => console.log(message));
globalThis.sendResponse = mock((_response: Uint8Array) => 0);
globalThis.switchModes = mock((_mode: 0 | 1 | 2) => {});
globalThis.versionV2 = mock(() => {});
globalThis.randomSeed = mock((_mode: 1 | 2) => Math.random());
globalThis.getWasiArgs = mock(() => '["mock.wasm", ""]');

beforeEach(() => {
  mock.restore();
  mock.clearAllMocks();
});
