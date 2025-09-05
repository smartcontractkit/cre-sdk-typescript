import { describe, test, expect, beforeEach } from 'bun:test'
import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { runtime, runtimeGuards, type NodeRuntime, type Runtime } from './runtime'
import { DonModeError, NodeModeError } from './errors'

describe('Handling runtime in TS SDK', () => {
	beforeEach(() => {
		runtimeGuards.setMode(Mode.DON)
	})

	test('runtime should be DON by default', () => {
		expect(runtime.mode).toBe(Mode.DON)
	})

	test('switching modes should work', () => {
		// Start from DON mode
		expect(runtime.isNodeRuntime).toBe(false)

		// Switch to NODE mode and verify it works
		const nodeRt = runtime.switchModes(Mode.NODE)
		expect(nodeRt.isNodeRuntime).toBe(true)
		expect(nodeRt.mode).toBe(Mode.NODE)

		// Switch back to DON mode and verify it works
		const rt = nodeRt.switchModes(Mode.DON)
		expect(rt.mode).toBe(Mode.DON)
		expect(rt.isNodeRuntime).toBe(false)
	})

	test('switching modes should be noop when already in that mode', () => {
		// By default we are in DON mode, but we call switchModes to confirm that's a noop
		let rt = runtime.switchModes(Mode.DON)
		expect(rt.mode).toBe(Mode.DON)
		expect(rt.isNodeRuntime).toBe(false)

		// // Now actually switch to NODE mode
		let nodeRuntime = rt.switchModes(Mode.NODE)
		expect(nodeRuntime.mode).toBe(Mode.NODE)
		expect(nodeRuntime.isNodeRuntime).toBe(true)

		// And now switch to Node mode again, make sure it's a noop and the runtime is still in NODE mode.
		nodeRuntime = nodeRuntime.switchModes(Mode.NODE)
		expect(nodeRuntime.mode).toBe(Mode.NODE)
		expect(nodeRuntime.isNodeRuntime).toBe(true)
	})

	test('assertDonSafe should throw an error if called in NODE mode', () => {
		// DON mode is default so asserting DON safe should not throw an error
		runtime.assertDonSafe()

		// Switch to NODE mode and assert DON safe should throw an error
		const nodeRuntime: NodeRuntime = runtime.switchModes(Mode.NODE)
		expect(() => nodeRuntime.assertDonSafe()).toThrow(DonModeError)

		// Asserting node safe should not throw however
		nodeRuntime.assertNodeSafe()

		const rt: Runtime = nodeRuntime.switchModes(Mode.DON)
		expect(() => rt.assertNodeSafe()).toThrow(NodeModeError)
	})

	test('getSecret is only available in DON mode', () => {
		// Casting to any because typescript itself is not letting us do this
		const nodeRuntime: any = runtime.switchModes(Mode.NODE)
		expect(nodeRuntime.getSecret).toBeUndefined()

		const rt: Runtime = nodeRuntime.switchModes(Mode.DON)
		expect(rt.getSecret).toBeDefined()
	})
})
