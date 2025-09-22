/**
 * Public API for the CRE SDK.
 */

import { ClientCapability as EVMClient } from '@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen'
import { ClientCapability as HTTPClient } from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
import { HTTPCapability } from '@cre/generated-sdk/capabilities/networking/http/v1alpha/http_sdk_gen'
import { CronCapability } from '@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen'
import { configHandler } from '@cre/sdk/utils/config'
import { prepareRuntime } from '@cre/sdk/utils/prepare-runtime'
import { handler } from '@cre/sdk/workflow'

export type { NodeRuntime, Runtime } from '@cre/sdk/runtime'

prepareRuntime()

export const cre = {
	capabilities: {
		CronCapability,
		HTTPCapability,
		HTTPClient,
		EVMClient,
	},
	config: configHandler,
	handler,
}
