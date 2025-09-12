import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { logger } from '@cre/sdk/logger'
import type { Runtime } from '@cre/sdk/runtime/runtime'
import { getSecret } from '@cre/sdk/utils/secrets/get-secret'
import { getRand } from '@cre/sdk/utils/random/get-rand'
import { getTimeAsDate } from '@cre/sdk/utils/time/get-time'

export const mockedRuntime: Runtime = {
	mode: Mode.DON,
	logger,
	isNodeRuntime: false,
	assertDonSafe: () => {},
	assertNodeSafe: () => {},
	switchModes: (() => mockedRuntime) as any,
	getSecret,
	getRand: () => getRand(Mode.DON),
	now: () => getTimeAsDate(),
}
