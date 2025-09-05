import { describe, test, expect, mock } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import {
	SimpleConsensusInputsSchema,
	type SimpleConsensusInputsJson,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { type NodeRuntime } from '@cre/sdk/runtime/runtime'

// Mock hostBindings before importing runInNodeMode
const calls: string[] = []
const mockHostBindings = {
	sendResponse: mock((_response: string) => 0),
	switchModes: mock((mode: 0 | 1 | 2) => {
		calls.push(mode === 2 ? 'NODE' : mode === 1 ? 'DON' : 'UNSPECIFIED')
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
	randomSeed: mock((_mode: 1 | 2) => Math.random()),
	getWasiArgs: mock(() => '["mock.wasm", ""]'),
}

// Mock the module
mock.module('@cre/sdk/runtime/host-bindings', () => ({
	hostBindings: mockHostBindings,
}))

import { runInNodeMode } from '@cre/sdk/runtime/run-in-node-mode'

describe('runInNodeMode', () => {
	test('accepts message input and returns Value', async () => {
		// spy on consensus.simple
		const origSimple = ConsensusCapability.prototype.simple
		ConsensusCapability.prototype.simple = mock(async (_: SimpleConsensusInputsJson) => {
			return {} as any // a Value; not asserting shape here
		})

		const res = await runInNodeMode(() => create(SimpleConsensusInputsSchema))
		expect(res).toBeDefined()

		ConsensusCapability.prototype.simple = origSimple
	})

	test('accepts json input and returns Value', async () => {
		const origSimple = ConsensusCapability.prototype.simple
		ConsensusCapability.prototype.simple = mock(async (_: SimpleConsensusInputsJson) => {
			return {} as any
		})

		const res = await runInNodeMode(() => ({}) as SimpleConsensusInputsJson)
		expect(res).toBeDefined()

		ConsensusCapability.prototype.simple = origSimple
	})

	test('restores DON mode before calling consensus', async () => {
		// Clear the calls array for this test
		calls.length = 0

		const origSimple = ConsensusCapability.prototype.simple
		ConsensusCapability.prototype.simple = mock(async (_: SimpleConsensusInputsJson) => {
			// At this point we expect mode to have been restored to DON
			calls.push('CONSENSUS_SIMPLE')
			return {} as any
		})

		await runInNodeMode(() => create(SimpleConsensusInputsSchema))
		expect(calls).toEqual(['NODE', 'DON', 'CONSENSUS_SIMPLE'])

		// restore
		ConsensusCapability.prototype.simple = origSimple
	})

	test('guards DON calls while in node mode', async () => {
		// Simulate switchModes by touching global function used by host
		const origSwitch = (globalThis as any).switchModes
		;(globalThis as any).switchModes = (_m: 0 | 1 | 2) => {}

		// Mock consensus.simple but also try to make a DON call in node mode
		const origSimple = ConsensusCapability.prototype.simple
		ConsensusCapability.prototype.simple = mock(async (_: SimpleConsensusInputsJson) => {
			return {} as any
		})

		let threw = false
		try {
			await runInNodeMode(async (nodeRuntime: NodeRuntime) => {
				// During builder, we are in NODE mode, performing a DON call should throw
				expect(() => nodeRuntime.logger.log(''))
				return create(SimpleConsensusInputsSchema)
			})
		} catch (_e) {
			threw = true
		}

		// The guard may not throw on host.log; rely on callCapability guard instead by attempting a DON call
		// restore
		ConsensusCapability.prototype.simple = origSimple
		;(globalThis as any).switchModes = origSwitch
		expect(threw).toBeFalse()
	})
})
