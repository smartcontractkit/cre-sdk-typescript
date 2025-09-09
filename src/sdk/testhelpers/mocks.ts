import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { logger } from '@cre/sdk/logger'
import type { Runtime } from '@cre/sdk/runtime/runtime'
import { getSecret } from '@cre/sdk/utils/secrets/get-secret'
import { getRand } from '@cre/sdk/utils/random/get-rand'

export const emptyConfig = {}

export const basicRuntime: Runtime = {
	mode: Mode.DON,
	logger,
	isNodeRuntime: false,
	assertDonSafe: () => {},
	assertNodeSafe: () => {},
	switchModes: (() => {
		return basicRuntime
	}) as any,
	getSecret,
	getRand: () => getRand(Mode.DON),
}
