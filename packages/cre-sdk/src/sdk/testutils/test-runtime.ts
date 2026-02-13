/**
 * TestRuntime and harness for testing the CRE SDK runtime without WASM.
 * Registry is scoped per test via AsyncLocalStorage; use testWithRuntime to run tests with a registry.
 */

import { test as bunTest } from 'bun:test'
import { AsyncLocalStorage } from 'node:async_hooks'
import { create, toBinary } from '@bufbuild/protobuf'
import type { Any } from '@bufbuild/protobuf/wkt'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import type {
	AwaitCapabilitiesResponse,
	AwaitSecretsResponse,
	CapabilityResponse,
	GetSecretsRequest,
	Mode,
	ReportRequest,
	ReportRequestJson,
	SecretResponse,
	SecretResponses,
	SimpleConsensusInputs,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import {
	AttributedSignatureSchema,
	AwaitCapabilitiesResponseSchema,
	AwaitSecretsResponseSchema,
	CapabilityResponseSchema,
	ReportRequestSchema,
	ReportResponseSchema,
	SecretErrorSchema,
	SecretResponseSchema,
	SecretResponsesSchema,
	SecretSchema,
	SimpleConsensusInputsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Value as ProtoValue } from '@cre/generated/values/v1/values_pb'
import { ValueSchema } from '@cre/generated/values/v1/values_pb'
import type { RuntimeHelpers } from '../impl/runtime-impl'
import { RuntimeImpl } from '../impl/runtime-impl'
import { TestWriter } from './test-writer'

/** Error message when response exceeds max size. Used by the harness when its await implements the size check. */
export const RESPONSE_BUFFER_TOO_SMALL = 'response buffer too small'

export const DEFAULT_MAX_RESPONSE_SIZE_BYTES = 5 * 1024 * 1024
export const REPORT_METADATA_HEADER_LENGTH = 109

export type Secrets = Map<string, Map<string, string>>

export type CapabilityHandler = (request: {
	id: string
	method: string
	payload: Any
}) => { response: { case: 'payload'; value: Any } } | { response: { case: 'error'; value: string } }

/** Registry is private; stored in AsyncLocalStorage when running inside testWithRuntime. */
class Registry {
	private capabilities = new Map<string, CapabilityHandler>()
	private mockInstances = new Map<string, unknown>()

	register(id: string, handler: CapabilityHandler): void {
		if (this.capabilities.has(id)) {
			throw new Error(`capability already exists: ${id}`)
		}
		this.capabilities.set(id, handler)
	}

	get(id: string): CapabilityHandler | undefined {
		return this.capabilities.get(id)
	}

	getMockInstance<T>(id: string): T | undefined {
		return this.mockInstances.get(id) as T | undefined
	}

	setMockInstance<T>(id: string, instance: T): void {
		this.mockInstances.set(id, instance)
	}
}

const registryStorage = new AsyncLocalStorage<Registry | undefined>()

/**
 * Returns the capability handler for the given id from the current test's registry, if any.
 * Only defined when called inside a testWithRuntime scope (after the handler is registered).
 */
export function getTestCapabilityHandler(id: string): CapabilityHandler | undefined {
	return registryStorage.getStore()?.get(id)
}

/**
 * Registers a capability handler for the current test's registry.
 * Must be called inside a testWithRuntime scope; throws if no registry is active.
 */
export function registerTestCapability(id: string, handler: CapabilityHandler): void {
	const registry = registryStorage.getStore()
	if (!registry) {
		throw new Error('registerTestCapability must be called from within a test in this package')
	}
	registry.register(id, handler)
}

/**
 * Gets a mock instance from the current test's registry, or undefined if not found or no registry active.
 * @internal Used by generated mocks for singleton pattern.
 */
export function __getTestMockInstance<T>(id: string): T | undefined {
	return registryStorage.getStore()?.getMockInstance<T>(id)
}

/**
 * Stores a mock instance in the current test's registry.
 * @internal Used by generated mocks for singleton pattern.
 */
export function __setTestMockInstance<T>(id: string, instance: T): void {
	const registry = registryStorage.getStore()
	if (!registry) {
		throw new Error('mock instance management must be called from within a test in this package')
	}
	registry.setMockInstance(id, instance)
}

/**
 * Test-only: returns the current registry store (for cleanup/isolation assertions).
 * Do not use in production code.
 */
export function __testOnlyRegistryStore(): object | undefined {
	return registryStorage.getStore() ?? undefined
}

/**
 * Test-only: runs a callback with a fresh registry and cleans up (for cleanup/failure tests).
 * Do not use in production code.
 */
export async function __testOnlyRunWithRegistry(fn: () => void | Promise<void>): Promise<void> {
	const registry = new Registry()
	await registryStorage.run(registry, async () => {
		try {
			await fn()
		} finally {
			registryStorage.enterWith(undefined)
		}
	})
}

type CapabilityResponsePayload = { case: 'payload'; value: Any } | { case: 'error'; value: string }

function defaultSimpleConsensus(input: SimpleConsensusInputs): ProtoValue {
	const obs = input.observation
	if (obs.case === 'value') {
		return reportFromValue(obs.value)
	}
	if (obs.case === 'error') {
		if (input.default != null && input.default.value != null) {
			return reportFromValue(input.default)
		}
		throw new Error(obs.value)
	}
	throw new Error(`unknown observation type`)
}

function reportFromValue(value: ProtoValue): ProtoValue {
	return create(ValueSchema, { value: value.value }) as ProtoValue
}

function createTestReportMetadata(): Uint8Array {
	const metadata = new Uint8Array(REPORT_METADATA_HEADER_LENGTH)
	for (let i = 0; i < REPORT_METADATA_HEADER_LENGTH; i++) {
		metadata[i] = (i % 256) as number
	}
	return metadata
}

function defaultReport(input: ReportRequest | ReportRequestJson): {
	rawReport: Uint8Array
	sigs: Array<{ signature: Uint8Array; signerId: number }>
} {
	const encodedPayload =
		typeof (input as ReportRequest).encodedPayload !== 'undefined'
			? (input as ReportRequest).encodedPayload
			: new Uint8Array(0)
	const metadata = createTestReportMetadata()
	const rawReport = new Uint8Array(metadata.length + encodedPayload.length)
	rawReport.set(metadata)
	rawReport.set(encodedPayload, metadata.length)
	const sigs = [
		{
			signature: new TextEncoder().encode('default_signature_1'),
			signerId: 1,
		},
		{
			signature: new TextEncoder().encode('default_signature_2'),
			signerId: 2,
		},
	]
	return { rawReport, sigs }
}

const CONSENSUS_CAPABILITY_ID = 'consensus@1.0.0-alpha'

export interface TestRuntimeState {
	timeProvider?: () => number
}

function createTestRuntimeHelpers(
	registry: Registry,
	secrets: Secrets,
	testWriter: TestWriter,
	state: TestRuntimeState,
	_maxResponseSize: bigint,
): RuntimeHelpers {
	const pendingCalls = new Map<number, CapabilityResponsePayload>()
	const pendingSecrets = new Map<number, SecretResponse[]>()

	function now(): number {
		return state.timeProvider ? state.timeProvider() : Date.now()
	}

	return {
		call(request: Parameters<RuntimeHelpers['call']>[0]): boolean {
			const handler = registry.get(request.id)
			if (!handler) return false
			const payload = request.payload ?? ({} as Any)
			try {
				const result = handler({
					id: request.id,
					method: request.method,
					payload,
				})
				pendingCalls.set(request.callbackId, result.response)
			} catch (e) {
				pendingCalls.set(request.callbackId, {
					case: 'error',
					value: e instanceof Error ? e.message : String(e),
				})
			}
			return true
		},

		await(request: { ids: number[] }, maxResponseSizeBytes: bigint): AwaitCapabilitiesResponse {
			const responses: Record<number, CapabilityResponse> = {}
			for (const id of request.ids) {
				const resp = pendingCalls.get(id)
				if (resp) {
					responses[id] = create(CapabilityResponseSchema, { response: resp })
					pendingCalls.delete(id)
				}
			}
			const response = create(AwaitCapabilitiesResponseSchema, { responses })
			const bytes = toBinary(AwaitCapabilitiesResponseSchema, response)
			if (bytes.length > Number(maxResponseSizeBytes)) {
				throw new Error(RESPONSE_BUFFER_TOO_SMALL)
			}
			return response
		},

		getSecrets(req: GetSecretsRequest, _maxResponseSize: bigint): boolean {
			const resp: SecretResponse[] = []
			for (const secretReq of req.requests) {
				const ns = secrets.get(secretReq.namespace || 'default')
				const value = ns?.get(secretReq.id)
				if (value === undefined) {
					resp.push(
						create(SecretResponseSchema, {
							response: {
								case: 'error',
								value: create(SecretErrorSchema, {
									id: secretReq.id,
									namespace: secretReq.namespace || 'default',
									owner: '',
									error: `could not find secret ${secretReq.namespace || 'default'}`,
								}),
							},
						}),
					)
				} else {
					resp.push(
						create(SecretResponseSchema, {
							response: {
								case: 'secret',
								value: create(SecretSchema, {
									id: secretReq.id,
									namespace: secretReq.namespace || 'default',
									value,
								}),
							},
						}),
					)
				}
			}
			pendingSecrets.set(req.callbackId, resp)
			return true
		},

		awaitSecrets(request: { ids: number[] }, _maxResponseSize: bigint): AwaitSecretsResponse {
			const responses: Record<number, SecretResponses> = {}
			for (const id of request.ids) {
				const resp = pendingSecrets.get(id)
				if (!resp) {
					throw new Error(`could not find call with id ${id}`)
				}
				responses[id] = create(SecretResponsesSchema, { responses: resp })
				pendingSecrets.delete(id)
			}
			return create(AwaitSecretsResponseSchema, { responses })
		},

		switchModes(_mode: Mode): void {},

		now,

		log(message: string): void {
			testWriter.log(message)
		},
	}
}

export interface NewTestRuntimeOptions {
	timeProvider?: () => number
	maxResponseSize?: number
}

/**
 * Runs a test using the CRE runtime.
 */
export function test(title: string, fn: () => void | Promise<void>): void {
	bunTest(title, async () => {
		const registry = new Registry()
		try {
			return await registryStorage.run(registry, async () => fn())
		} finally {
			registryStorage.enterWith(undefined)
		}
	})
}

/**
 * Creates a test runtime. This must be called from within a test in this package.
 */
export function newTestRuntime(
	secrets?: Secrets | null,
	options: NewTestRuntimeOptions = {},
): TestRuntime {
	const secretsMap = secrets ?? new Map<string, Map<string, string>>()
	const testWriter = new TestWriter()
	const registry = registryStorage.getStore() ?? new Registry()

	if (!registry.get(CONSENSUS_CAPABILITY_ID)) {
		registry.register(CONSENSUS_CAPABILITY_ID, (req) => {
			if (req.method === 'Simple') {
				const input = anyUnpack(req.payload, SimpleConsensusInputsSchema) as SimpleConsensusInputs
				const value = defaultSimpleConsensus(input)
				const packed = anyPack(ValueSchema, value)
				return { response: { case: 'payload', value: packed } }
			}
			if (req.method === 'Report') {
				const input = anyUnpack(req.payload, ReportRequestSchema) as ReportRequest
				const { rawReport, sigs } = defaultReport(input)
				const reportResp = create(ReportResponseSchema, {
					configDigest: new Uint8Array(0),
					seqNr: 0n,
					reportContext: new Uint8Array(0),
					rawReport,
					sigs: sigs.map((s) => create(AttributedSignatureSchema, s)),
				})
				const packed = anyPack(ReportResponseSchema, reportResp)
				return { response: { case: 'payload', value: packed } }
			}
			return {
				response: { case: 'error', value: `unknown method ${req.method}` },
			}
		})
	}

	const state: TestRuntimeState = {
		timeProvider: options.timeProvider,
	}
	const maxResponseSize = BigInt(options.maxResponseSize ?? DEFAULT_MAX_RESPONSE_SIZE_BYTES)
	const helpers = createTestRuntimeHelpers(registry, secretsMap, testWriter, state, maxResponseSize)

	return new TestRuntime(helpers, maxResponseSize, testWriter, state)
}

/**
 * TestRuntime is a Runtime implementation for unit tests. Extends RuntimeImpl; construct via newTestRuntime.
 * Adds getLogs() and setTimeProvider(). Registry is accessed via getTestCapabilityHandler when inside testWithRuntime.
 */
export class TestRuntime extends RuntimeImpl<unknown> {
	constructor(
		helpers: RuntimeHelpers,
		maxResponseSize: bigint,
		private readonly testWriter: TestWriter,
		private readonly state: TestRuntimeState,
	) {
		super({}, 0, helpers, maxResponseSize)
	}

	getLogs(): string[] {
		return this.testWriter.getLogs()
	}

	setTimeProvider(timeProvider: () => number): void {
		this.state.timeProvider = timeProvider
	}
}
