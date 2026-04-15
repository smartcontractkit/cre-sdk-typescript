/**
 * Public API for the CRE SDK.
 */

import {
	ClientCapability as EVMClient,
	ClientRestrictor as EVMRestrictor,
} from '@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen'
import {
	ClientCapability as ConfidentialHTTPClient,
	ClientRestrictor as ConfidentialHTTPRestrictor,
} from '@cre/generated-sdk/capabilities/networking/confidentialhttp/v1alpha/client_sdk_gen'
import {
	ClientCapability as HTTPClient,
	ClientRestrictor as HTTPClientRestrictor,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
import {
	HTTPCapability,
	HTTPRestrictor,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/http_sdk_gen'
import {
	CronCapability,
	CronRestrictor,
} from '@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen'
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
	ClientRestrictor as EVMRestrictor,
	type WriteCreReportRequest,
	type WriteCreReportRequestJson,
} from '@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen'
// Confidential HTTP Capability
export {
	ClientCapability as ConfidentialHTTPClient,
	ClientRestrictor as ConfidentialHTTPRestrictor,
} from '@cre/generated-sdk/capabilities/networking/confidentialhttp/v1alpha/client_sdk_gen'
// HTTP Capability
export {
	ClientCapability as HTTPClient,
	ClientRestrictor as HTTPClientRestrictor,
	type SendRequester as HTTPSendRequester,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
export {
	HTTPCapability,
	HTTPRestrictor,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/http_sdk_gen'

// CRON Capability
export {
	CronCapability,
	CronRestrictor,
} from '@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen'

// Runtime
export type { NodeRuntime, Runtime } from '@cre/sdk/runtime'
export { handler } from '@cre/sdk/workflow'

prepareRuntime()

export const cre = {
	capabilities: {
		CronCapability,
		HTTPCapability,
		ConfidentialHTTPClient,
		HTTPClient,
		EVMClient,
	},
	restrictors: {
		CronRestrictor,
		HTTPRestrictor,
		ConfidentialHTTPRestrictor,
		HTTPClientRestrictor,
		EVMRestrictor,
	},
	handler,
}
