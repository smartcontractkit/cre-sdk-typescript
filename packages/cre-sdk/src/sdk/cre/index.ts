/**
 * Public API for the CRE SDK.
 */

import { ClientCapability as EVMClient } from '@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen'
import { ClientCapability as HTTPClient } from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
import { HTTPCapability } from '@cre/generated-sdk/capabilities/networking/http/v1alpha/http_sdk_gen'
import { CronCapability } from '@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen'
import { prepareRuntime } from '@cre/sdk/utils/prepare-runtime'
import { handler } from '@cre/sdk/workflow'

/**
 * Public exports for the CRE SDK.
 */

export {
	type Log as EVMLog,
	TxStatus,
} from '@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb'
export type { Payload as HTTPPayload } from '@cre/generated/capabilities/networking/http/v1alpha/trigger_pb'
export type { Payload as CronPayload } from '@cre/generated/capabilities/scheduler/cron/v1/trigger_pb'

// EVM Capability
export {
	ClientCapability as EVMClient,
	type WriteCreReportRequest,
	type WriteCreReportRequestJson,
} from '@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen'

// HTTP Capability
export {
	ClientCapability as HTTPClient,
	type SendRequester as HTTPSendRequester,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
export { HTTPCapability } from '@cre/generated-sdk/capabilities/networking/http/v1alpha/http_sdk_gen'

// CRON Capability
export { CronCapability } from '@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen'

// Runtime
export type { NodeRuntime, Runtime } from '@cre/sdk/runtime'
export { handler } from '@cre/sdk/workflow'

prepareRuntime()

export const cre = {
	capabilities: {
		CronCapability,
		HTTPCapability,
		HTTPClient,
		EVMClient,
	},
	handler,
}
