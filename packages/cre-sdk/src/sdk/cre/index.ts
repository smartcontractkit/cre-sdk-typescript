/**
 * Public API for the CRE SDK.
 */

import { ClientCapability as EVMClient } from '@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen'
import { ClientCapability as HTTPClient } from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
import { CronCapability } from '@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen'
import { runInNodeMode } from '@cre/sdk/runtime/run-in-node-mode'
import { creFetch } from '@cre/sdk/utils/capabilities/http/fetch'
import { configHandler } from '@cre/sdk/utils/config'
import { withErrorBoundary } from '@cre/sdk/utils/error-boundary'
import { prepareRuntime } from '@cre/sdk/utils/prepare-runtime'
import { sendError } from '@cre/sdk/utils/send-error'
import { sendResponseValue } from '@cre/sdk/utils/send-response-value'
import { handler, Runner } from '@cre/sdk/workflow'

export type { NodeRuntime, Runtime } from '@cre/sdk/runtime/runtime'

prepareRuntime()
versionV2()

export const cre = {
	capabilities: {
		CronCapability,
		HTTPClient,
		EVMClient,
	},
	config: configHandler,
	handler,
	newRunner: Runner.newRunner,
	runInNodeMode,
	utils: {
		fetch: creFetch,
	},
	sendResponseValue,
	sendError,
	withErrorBoundary,
}
