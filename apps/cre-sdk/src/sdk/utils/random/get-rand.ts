import type { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { hostBindings } from '@cre/sdk/runtime/host-bindings'
import { Rand } from './random'

export const getRand = (mode: Mode.DON | Mode.NODE): Rand => {
	const seed = BigInt(hostBindings.randomSeed(mode))
	return new Rand(seed)
}
