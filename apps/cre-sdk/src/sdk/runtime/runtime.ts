import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type Logger, logger } from '@cre/sdk/logger'
import { DonModeError, NodeModeError } from '@cre/sdk/runtime/errors'
import { hostBindings } from '@cre/sdk/runtime/host-bindings'
import { getRand } from '@cre/sdk/utils/random/get-rand'
import type { Rand } from '@cre/sdk/utils/random/random'
import { getSecret } from '@cre/sdk/utils/secrets/get-secret'
import { getTimeAsDate } from '@cre/sdk/utils/time/get-time'

/**
 * Runtime guards are not actually causing / throwing errors.
 * They pre-set the errors, depending on the current mode and then
 * assert methods are used to check if feature can be called in given mode.
 * If not the prepared error will be thrown.
 */
export const runtimeGuards = (() => {
	let currentMode: Mode = Mode.UNSPECIFIED
	let donModeGuardError: DonModeError | null = null
	let nodeModeGuardError: NodeModeError | null = new NodeModeError()

	const setMode = (mode: Mode) => {
		currentMode = mode
		if (mode === Mode.NODE) {
			// In node mode, forbid DON runtime calls
			donModeGuardError = new DonModeError()
			nodeModeGuardError = null
		} else if (mode === Mode.DON) {
			// Back in DON mode, forbid node runtime calls
			nodeModeGuardError = new NodeModeError()
			donModeGuardError = null
		} else {
			donModeGuardError = null
			nodeModeGuardError = null
		}
	}

	const assertDonSafe = () => {
		if (donModeGuardError) {
			throw donModeGuardError
		}
	}

	const assertNodeSafe = () => {
		if (nodeModeGuardError) {
			throw nodeModeGuardError
		}
	}

	const getMode = () => currentMode

	return { setMode, assertDonSafe, assertNodeSafe, getMode }
})()

export type BaseRuntime<M extends Mode = Mode> = {
	logger: Logger
	mode: M
	assertDonSafe(): asserts this is Runtime
	assertNodeSafe(): asserts this is NodeRuntime
	getRand(): Rand
	now(): Date
}

export type Runtime = BaseRuntime<Mode.DON> & {
	isNodeRuntime: false
	switchModes(mode: Mode.NODE): NodeRuntime
	switchModes(mode: Mode.DON): Runtime
	getSecret(id: string): Promise<any>
}

export type NodeRuntime = BaseRuntime<Mode.NODE> & {
	isNodeRuntime: true
	switchModes(mode: Mode.NODE): NodeRuntime
	switchModes(mode: Mode.DON): Runtime
}

// Shared implementation for mode switching
function switchModes(mode: Mode.NODE): NodeRuntime
function switchModes(mode: Mode.DON): Runtime
function switchModes(mode: Mode): Runtime | NodeRuntime {
	// Changing to the same mode should be a noop, we make sure to actually call switching logic if it's different mode
	if (mode !== runtimeGuards.getMode()) {
		hostBindings.switchModes(mode)
		runtimeGuards.setMode(mode)
	}

	return mode === Mode.NODE ? nodeRuntime : runtime
}

export const runtime: Runtime = {
	mode: Mode.DON,
	isNodeRuntime: false,
	logger,
	switchModes,
	assertDonSafe: (): asserts this is Runtime => {
		runtimeGuards.assertDonSafe()
	},
	assertNodeSafe: (): asserts this is NodeRuntime => {
		runtimeGuards.assertNodeSafe()
	},
	getSecret,
	getRand: () => getRand(Mode.DON),
	now: () => getTimeAsDate(),
}

export const nodeRuntime: NodeRuntime = {
	mode: Mode.NODE,
	isNodeRuntime: true,
	logger,
	switchModes,
	assertNodeSafe: (): asserts this is NodeRuntime => {
		runtimeGuards.assertNodeSafe()
	},
	assertDonSafe: (): asserts this is Runtime => {
		runtimeGuards.assertDonSafe()
	},
	getRand: () => getRand(Mode.NODE),
	now: () => getTimeAsDate(),
}
