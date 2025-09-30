import { create, type Message } from '@bufbuild/protobuf'
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
	type GetSecretsRequest,
	GetSecretsRequestSchema,
	Mode,
	type Secret,
	type SecretRequest,
	type SecretRequestJson,
	SecretRequestSchema,
	SimpleConsensusInputsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
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

export class BaseRuntimeImpl<C> implements BaseRuntime<C> {
	// modeError must only be set from within NodeRuntimeImpl
	public modeError?: Error

	constructor(
		public config: C,
		public nextCallId: number,
		protected helpers: RuntimeHelpers,
		protected maxResponseSize: bigint,
		private mode: Mode,
	) {}

	callCapability<I extends Message, O extends Message>({
		capabilityId,
		method,
		payload,
		inputSchema,
		outputSchema,
	}: CallCapabilityParams<I, O>): { result: () => O } {
		if (this.modeError) {
			return {
				result: () => {
					throw this.modeError
				},
			}
		}

		// nextCallId tracks the unique id for a request to the WASM host.
		// to avoid collisions of the ID in different modes, it is
		// incremented in DON mode and decremented in Node mode.
		// eg. - first call don mode: nextCallId = 1
		//     - second call: nextCallId = 2
		//     - first call node mode: nextCallId = -1
		//     - second call node mode: nextCallId = -2
		//     - etc...

		const anyPayload = anyPack(inputSchema, payload)
		const callbackId = this.nextCallId
		if (this.mode === Mode.DON) {
			this.nextCallId++
		} else {
			this.nextCallId--
		}

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

		return {
			result: () => {
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
					case 'payload':
						return anyUnpack(response.value as Any, outputSchema) as O
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
			},
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

export class NodeRuntimeImpl<C> extends BaseRuntimeImpl<C> implements NodeRuntime<C> {
	_isNodeRuntime: true = true
	constructor(config: C, nextCallId: number, helpers: RuntimeHelpers, maxResponseSize: bigint) {
		helpers.switchModes(Mode.NODE)
		super(config, nextCallId, helpers, maxResponseSize, Mode.NODE)
	}
}

export class RuntimeImpl<C> extends BaseRuntimeImpl<C> implements Runtime<C> {
	private nextNodeCallId: number = -1

	constructor(config: C, nextCallId: number, helpers: RuntimeHelpers, maxResponseSize: bigint) {
		helpers.switchModes(Mode.DON)
		super(config, nextCallId, helpers, maxResponseSize, Mode.DON)
	}

	runInNodeMode<TArgs extends unknown[], TOutput>(
		fn: (nodeRuntime: NodeRuntime<C>, ...args: TArgs) => TOutput,
		consesusAggretation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput } {
		return (...args: TArgs): { result: () => TOutput } => {
			this.modeError = new DonModeError()
			const nodeRuntime = new NodeRuntimeImpl(
				this.config,
				this.nextNodeCallId,
				this.helpers,
				this.maxResponseSize,
			)

			const consensusInput = create(SimpleConsensusInputsSchema, {
				descriptors: consesusAggretation.descriptor,
			})
			if (consesusAggretation.defaultValue) {
				// This cast is safe, since ConsensusAggregation can only have true its second argument if T extends CreSerializable<TOutput>
				consensusInput.default = Value.from(
					consesusAggretation.defaultValue as CreSerializable<TOutput>,
				).proto()
			}

			try {
				const observation = fn(nodeRuntime, ...args)
				// This cast is safe, since ConsensusAggregation can only have true its second argument if T extends CreSerializable<TOutput>
				consensusInput.observation = {
					case: 'value',
					value: Value.from(observation as CreSerializable<TOutput>).proto(),
				}
			} catch (e: unknown) {
				consensusInput.observation = {
					case: 'error',
					value: (e instanceof Error && e.message) || String(e),
				}
			} finally {
				// Always restore DON mode before invoking consensus
				this.modeError = undefined
				this.nextNodeCallId = nodeRuntime.nextCallId
				nodeRuntime.modeError = new NodeModeError()
				this.helpers.switchModes(Mode.DON)
			}

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
	}

	getSecret(request: SecretRequest | SecretRequestJson): {
		result: () => Secret
	} {
		if (this.modeError) {
			return {
				result: () => {
					throw this.modeError
				},
			}
		}

		const secretRequest = (request as unknown as { $typeName?: string }).$typeName
			? create(SecretRequestSchema, request)
			: (request as SecretRequest)
		const id = this.nextCallId
		this.nextCallId++
		const secretsReq = create(GetSecretsRequestSchema, {
			callbackId: id,
			requests: [request],
		})
		if (!this.helpers.getSecrets(secretsReq, this.maxResponseSize)) {
			return {
				result: () => {
					throw new SecretsError(secretRequest, 'host is not making the secrets request')
				},
			}
		}

		return {
			result: () => {
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
						throw new SecretsError(secretRequest, 'cannot unmashal returned value from host')
				}
			},
		}
	}

	report(input: ReportRequest | ReportRequestJson): { result: () => Report } {
		const consensus = new ConsensusCapability()
		const call = consensus.report(this, input)
		return {
			result: () => {
				return call.result()
			},
		}
	}
}

export interface RuntimeHelpers {
	call(request: CapabilityRequest): boolean
	await(request: AwaitCapabilitiesRequest, maxResponseSize: bigint): AwaitCapabilitiesResponse

	getSecrets(request: GetSecretsRequest, maxResponseSize: bigint): boolean
	awaitSecrets(request: AwaitSecretsRequest, maxResponseSize: bigint): AwaitSecretsResponse

	switchModes(mode: Mode): void

	now(): number

	log(message: string): void
}
