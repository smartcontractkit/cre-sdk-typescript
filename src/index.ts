/**
 * CRE SDK - Chainlink Runtime Environment TypeScript SDK
 *
 * This package provides the core primitives and utilities for building
 * Chainlink workflows using the CRE (Chainlink Runtime Environment).
 */

// Re-export some commonly used types from dependencies
export type { Address, Hex } from 'viem'
export { ClientCapability as EVMClient } from './generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen.js'
export { ClientCapability as HTTPClient } from './generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen.js'
// Export capability types
export { CronCapability } from './generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen.js'
// Export the main CRE SDK
export { cre } from './sdk/cre/index.js'
// Export error types and utilities
export * from './sdk/runtime/errors.js'
export { runInNodeMode } from './sdk/runtime/run-in-node-mode.js'
// Export types
export * from './sdk/types/global.d.ts'
// Export helper utilities
export { awaitAsyncRequest } from './sdk/utils/await-async-request.js'
export { creFetch } from './sdk/utils/capabilities/http/fetch.js'
export { configHandler } from './sdk/utils/config/index.js'
export { doRequestAsync } from './sdk/utils/do-request-async.js'
export * from './sdk/utils/error-boundary.js'
export { getRequest } from './sdk/utils/get-request.js'
export * from './sdk/utils/hex-utils.js'
export { random } from './sdk/utils/random.js'
export { safeJsonStringify } from './sdk/utils/safeJsonStringify.js'
export { awaitAsyncSecret } from './sdk/utils/secrets/await-async-secret.js'
// Export secrets utilities
export { getSecret } from './sdk/utils/secrets/get-secret.js'
export { sendResponseValue } from './sdk/utils/send-response-value.js'
// Export trigger interface
export { TriggerInterface } from './sdk/utils/triggers/trigger-interface.js'
export { getAggregatedValue } from './sdk/utils/values/consensus.js'
// Export consensus hooks
export * from './sdk/utils/values/consensus-hooks.js'
// Export utilities
export { val } from './sdk/utils/values/value.js'
// Export core workflow types and utilities
export { handler, Runner } from './sdk/workflow.js'
