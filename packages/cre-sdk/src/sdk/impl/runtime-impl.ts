import { create, type Message } from '@bufbuild/protobuf'
import type { GenMessage } from '@bufbuild/protobuf/codegenv2'
import { type Any, anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type AwaitCapabilitiesRequest,
	AwaitCapabilitiesRequestSchema,
	type AwaitCapabilitiesResponse,
	type AwaitSecretsRequest,
	AwaitSecretsRequestSchema,
	type AwaitSecretsResponse,
	type CapabilityRequest,
	CapabilityRequestSchema,
	type ConsensusDescriptor,
	type GetSecretsRequest,
	GetSecretsRequestSchema,
	Mode,
	type Secret,
	type SecretRequest,
	type SecretRequestJson,
	SecretRequestSchema,
	SimpleConsensusInputsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Value as ProtoValue } from '@cre/generated/values/v1/values_pb'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import type {
	BaseRuntime,
	CallCapabilityParams,
	NodeRuntime,
	ReportRequest,
	ReportRequestJson,
	Runtime,
} from '@cre/sdk'
import type { Report } from '@cre/sdk/report'
import {
	type ConsensusAggregation,
	type CreSerializable,
	type PrimitiveTypes,
	type UnwrapOptions,
	Value,
} from '@cre/sdk/utils'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { DonModeError, NodeModeError, SecretsError } from '../errors'

/**
 * Base implementation shared by DON and Node runtimes.
 *
 * Call ID Management:
 * - DON mode: IDs increment (1, 2, 3...)
 * - Node mode: IDs decrement (-1, -2, -3...)
 * This prevents collisions when both modes are active.
 */
export class BaseRuntimeImpl<C> implements BaseRuntime<C> {
	/**
	 * When set, prevents operations that aren't allowed in current mode.
	 * - Set in DON mode when code tries to use NodeRuntime
	 * - Set in Node mode when code tries to use Runtime
	 */
	public modeError?: Error

	constructor(
		public config: C,
		public nextCallId: number,
		protected helpers: RuntimeHelpers,
		protected maxResponseSize: bigint,
		private mode: Mode,
	) {}

	/**
	 * Calls a capability and returns a lazy result.
	 * The actual call happens immediately, but result retrieval is deferred.
	 */
	callCapability<I extends Message, O extends Message>({
		capabilityId,
		method,
		payload,
		inputSchema,
		outputSchema,
	}: CallCapabilityParams<I, O>): { result: () => O } {
		// Enforce mode restrictions
		if (this.modeError) {
			return {
				result: () => {
					throw this.modeError
				},
			}
		}

		// Allocate unique callback ID for this request
		const callbackId = this.allocateCallbackId()

		// Send request to WASM host
		const anyPayload = anyPack(inputSchema, payload)
		const req = create(CapabilityRequestSchema, {
			id: capabilityId,
			method,
			payload: anyPayload,
			callbackId,
		})

		if (!this.helpers.call(req)) {
			return {
				result: () => {
					throw new CapabilityError(`Capability not found ${capabilityId}`, {
						callbackId,
						method,
						capabilityId,
					})
				},
			}
		}

		// Return lazy result - await and unwrap when .result() is called
		return {
			result: () =>
				this.awaitAndUnwrapCapabilityResponse(callbackId, capabilityId, method, outputSchema),
		}
	}

	/**
	 * Allocates a unique callback ID for a capability request.
	 * DON mode increments, Node mode decrements (prevents collisions).
	 */
	private allocateCallbackId(): number {
		const callbackId = this.nextCallId
		if (this.mode === Mode.DON) {
			this.nextCallId++
		} else {
			this.nextCallId--
		}
		return callbackId
	}

	/**
	 * Awaits capability response and unwraps the result or throws error.
	 */
	private awaitAndUnwrapCapabilityResponse<O extends Message>(
		callbackId: number,
		capabilityId: string,
		method: string,
		outputSchema: GenMessage<O>,
	): O {
		const awaitRequest = create(AwaitCapabilitiesRequestSchema, {
			ids: [callbackId],
		})
		const awaitResponse = this.helpers.await(awaitRequest, this.maxResponseSize)
		const capabilityResponse = awaitResponse.responses[callbackId]

		if (!capabilityResponse) {
			throw new CapabilityError(`No response found for callback ID ${callbackId}`, {
				capabilityId,
				method,
				callbackId,
			})
		}

		const response = capabilityResponse.response
		switch (response.case) {
			case 'payload': {
				try {
					return anyUnpack(response.value as Any, outputSchema) as O
				} catch {
					throw new CapabilityError(`Error cannot unwrap payload`, {
						capabilityId,
						method,
						callbackId,
					})
				}
			}
			case 'error':
				throw new CapabilityError(`Error ${response.value}`, {
					capabilityId,
					method,
					callbackId,
				})
			default:
				throw new CapabilityError(`Error cannot unwrap ${response.case}`, {
					capabilityId,
					method,
					callbackId,
				})
		}
	}

	getNextCallId(): number {
		return this.nextCallId
	}

	now(): Date {
		// ns to ms
		return new Date(this.helpers.now() / 1000000)
	}

	log(message: string): void {
		this.helpers.log(message)
	}
}

/**
 * It is used when a BFT guarantee cannot be provided automatically (e.g. calling a standard API).
 * You tell each node to perform a task on its own.
 * Each node returns its own individual answer, and you are responsible for telling the SDK how to combine them into a single, trusted result by providing an aggregation algorithm.
 *
 * Useful in situation where you already expect non-determinism (e.g., inherently variable HTTP responses).
 * Switching from Node Mode back to DON mode requires workflow authors to handle consensus themselves.
 */
export class NodeRuntimeImpl<C> extends BaseRuntimeImpl<C> implements NodeRuntime<C> {
	_isNodeRuntime: true = true

	constructor(config: C, nextCallId: number, helpers: RuntimeHelpers, maxResponseSize: bigint) {
		helpers.switchModes(Mode.NODE)
		super(config, nextCallId, helpers, maxResponseSize, Mode.NODE)
	}
}

/**
 * It is used for operations that are guaranteed to be Byzantine Fault Tolerant (BFT).
 * You ask the network to execute something, and CRE handles the underlying complexity to ensure you get back one final, secure, and trustworthy result.
 */
export class RuntimeImpl<C> extends BaseRuntimeImpl<C> implements Runtime<C> {
	private nextNodeCallId: number = -1

	constructor(config: C, nextCallId: number, helpers: RuntimeHelpers, maxResponseSize: bigint) {
		helpers.switchModes(Mode.DON)
		super(config, nextCallId, helpers, maxResponseSize, Mode.DON)
	}

	/**
	 * Executes a function in Node mode on each node, then aggregates via consensus.
	 *
	 * Flow:
	 * 1. Switches to Node mode, preventing DON operations
	 * 2. Executes fn() on each node independently
	 * 3. Captures result or error as "observation"
	 * 4. Switches back to DON mode
	 * 5. Runs consensus to aggregate observations
	 * 6. Returns aggregated result
	 */
	runInNodeMode<TArgs extends unknown[], TOutput>(
		fn: (nodeRuntime: NodeRuntime<C>, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput } {
		return (...args: TArgs): { result: () => TOutput } => {
			// Step 1: Create node runtime and prevent DON operations
			this.modeError = new DonModeError()
			const nodeRuntime = new NodeRuntimeImpl(
				this.config,
				this.nextNodeCallId,
				this.helpers,
				this.maxResponseSize,
			)

			// Step 2: Prepare consensus input with config
			const consensusInput = this.prepareConsensusInput(consensusAggregation)

			// Step 3: Execute node function and capture result/error
			try {
				const observation = fn(nodeRuntime, ...args)
				this.captureObservation(consensusInput, observation, consensusAggregation.descriptor)
			} catch (e: unknown) {
				this.captureError(consensusInput, e)
			} finally {
				// Step 4: Always restore DON mode
				this.restoreDonMode(nodeRuntime)
			}

			// Step 5: Run consensus and return lazy result
			return this.runConsensusAndWrap(consensusInput, unwrapOptions)
		}
	}

	private prepareConsensusInput<TOutput>(
		consensusAggregation: ConsensusAggregation<TOutput, true>,
	) {
		const consensusInput = create(SimpleConsensusInputsSchema, {
			descriptors: consensusAggregation.descriptor,
		})

		if (consensusAggregation.defaultValue) {
			// Safe cast: ConsensusAggregation<T, true> implies T extends CreSerializable
			const defaultValue = Value.from(
				consensusAggregation.defaultValue as CreSerializable<TOutput>,
			).proto()
			clearIgnoredFields(defaultValue, consensusAggregation.descriptor)
			consensusInput.default = defaultValue
		}

		return consensusInput
	}

	private captureObservation<TOutput>(
		consensusInput: any,
		observation: TOutput,
		descriptor: ConsensusDescriptor,
	) {
		// Safe cast: ConsensusAggregation<T, true> implies T extends CreSerializable
		const observationValue = Value.from(observation as CreSerializable<TOutput>).proto()
		clearIgnoredFields(observationValue, descriptor)
		consensusInput.observation = {
			case: 'value',
			value: observationValue,
		}
	}

	private captureError(consensusInput: any, e: unknown) {
		consensusInput.observation = {
			case: 'error',
			value: (e instanceof Error && e.message) || String(e),
		}
	}

	private restoreDonMode(nodeRuntime: NodeRuntimeImpl<C>) {
		this.modeError = undefined
		this.nextNodeCallId = nodeRuntime.nextCallId
		nodeRuntime.modeError = new NodeModeError()
		this.helpers.switchModes(Mode.DON)
	}

	private runConsensusAndWrap<TOutput>(
		consensusInput: any,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): { result: () => TOutput } {
		const consensus = new ConsensusCapability()
		const call = consensus.simple(this, consensusInput)

		return {
			result: () => {
				const result = call.result()
				const wrappedValue = Value.wrap(result)

				return unwrapOptions
					? wrappedValue.unwrapToType(unwrapOptions)
					: (wrappedValue.unwrap() as TOutput)
			},
		}
	}

	getSecret(request: SecretRequest | SecretRequestJson): {
		result: () => Secret
	} {
		// Enforce mode restrictions
		if (this.modeError) {
			return {
				result: () => {
					throw this.modeError
				},
			}
		}

		// Normalize request (accept both protobuf and JSON formats)
		const secretRequest = (request as unknown as { $typeName?: string }).$typeName
			? (request as SecretRequest)
			: create(SecretRequestSchema, request)

		// Allocate callback ID and send request
		const id = this.nextCallId
		this.nextCallId++
		const secretsReq = create(GetSecretsRequestSchema, {
			callbackId: id,
			requests: [secretRequest],
		})

		if (!this.helpers.getSecrets(secretsReq, this.maxResponseSize)) {
			return {
				result: () => {
					throw new SecretsError(secretRequest, 'host is not making the secrets request')
				},
			}
		}

		// Return lazy result
		return {
			result: () => this.awaitAndUnwrapSecret(id, secretRequest),
		}
	}

	private awaitAndUnwrapSecret(id: number, secretRequest: SecretRequest): Secret {
		const awaitRequest = create(AwaitSecretsRequestSchema, { ids: [id] })
		const awaitResponse = this.helpers.awaitSecrets(awaitRequest, this.maxResponseSize)
		const secretsResponse = awaitResponse.responses[id]

		if (!secretsResponse) {
			throw new SecretsError(secretRequest, 'no response')
		}

		const responses = secretsResponse.responses
		if (responses.length !== 1) {
			throw new SecretsError(secretRequest, 'invalid value returned from host')
		}

		const response = responses[0].response
		switch (response.case) {
			case 'secret':
				return response.value
			case 'error':
				throw new SecretsError(secretRequest, response.value.error)
			default:
				throw new SecretsError(secretRequest, 'cannot unmarshal returned value from host')
		}
	}

	/**
	 * Generates a report via consensus mechanism.
	 */
	report(input: ReportRequest | ReportRequestJson): { result: () => Report } {
		const consensus = new ConsensusCapability()
		const call = consensus.report(this, input)
		return {
			result: () => call.result(),
		}
	}
}

/**
 * Interface to the WASM host environment.
 * Provides low-level access to capabilities, secrets, and utilities.
 */
export interface RuntimeHelpers {
	/** Initiates a capability call. Returns false if capability not found. */
	call(request: CapabilityRequest): boolean

	/** Awaits capability responses. Blocks until responses are ready. */
	await(request: AwaitCapabilitiesRequest, maxResponseSize: bigint): AwaitCapabilitiesResponse

	/** Requests secrets from host. Returns false if host rejects request. */
	getSecrets(request: GetSecretsRequest, maxResponseSize: bigint): boolean

	/** Awaits secret responses. Blocks until secrets are ready. */
	awaitSecrets(request: AwaitSecretsRequest, maxResponseSize: bigint): AwaitSecretsResponse

	/** Switches execution mode (DON vs Node). Affects available operations. */
	switchModes(mode: Mode): void

	/** Returns current time in nanoseconds. */
	now(): number

	/** Logs a message to the host environment. */
	log(message: string): void
}

function clearIgnoredFields(value: ProtoValue, descriptor: ConsensusDescriptor): void {
	if (!descriptor || !value) {
		return
	}

	const fieldsMap =
		descriptor.descriptor?.case === 'fieldsMap' ? descriptor.descriptor.value : undefined
	if (!fieldsMap) {
		return
	}

	if (value.value?.case === 'mapValue') {
		const mapValue = value.value.value
		if (!mapValue || !mapValue.fields) {
			return
		}

		for (const [key, val] of Object.entries(mapValue.fields)) {
			const nestedDescriptor = fieldsMap.fields[key]
			if (!nestedDescriptor) {
				delete mapValue.fields[key]
				continue
			}

			const nestedFieldsMap =
				nestedDescriptor.descriptor?.case === 'fieldsMap'
					? nestedDescriptor.descriptor.value
					: undefined
			if (nestedFieldsMap && val.value?.case === 'mapValue') {
				clearIgnoredFields(val, nestedDescriptor)
			}
		}
	}
}
