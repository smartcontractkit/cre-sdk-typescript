import { fromJson } from '@bufbuild/protobuf'
import {
	type EnclaveActionInput,
	type EnclaveActionInputJson,
	EnclaveActionInputSchema,
	type HTTPEnclaveResponseData,
	HTTPEnclaveResponseDataSchema,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'
import { type NodeRuntime, type Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from '@cre/sdk/utils'

export class SendRequestser {
	constructor(
		private readonly runtime: NodeRuntime<unknown>,
		private readonly client: ClientCapability,
	) {}
	sendRequests(input: EnclaveActionInput | EnclaveActionInputJson): {
		result: () => HTTPEnclaveResponseData
	} {
		return this.client.sendRequests(this.runtime, input)
	}
}

/**
 * Client Capability
 *
 * Capability ID: confidential-http@1.0.0-alpha
 * Capability Name: confidential-http
 * Capability Version: 1.0.0-alpha
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'confidential-http@1.0.0-alpha'

	static readonly CAPABILITY_NAME = 'confidential-http'
	static readonly CAPABILITY_VERSION = '1.0.0-alpha'

	sendRequests(
		runtime: NodeRuntime<unknown>,
		input: EnclaveActionInput | EnclaveActionInputJson,
	): { result: () => HTTPEnclaveResponseData }
	sendRequests<TArgs extends unknown[], TOutput>(
		runtime: Runtime<unknown>,
		fn: (sendRequestser: SendRequestser, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput }
	sendRequests(...args: unknown[]): unknown {
		// Check if this is the sugar syntax overload (has function parameter)
		if (typeof args[1] === 'function') {
			const [runtime, fn, consensusAggregation, unwrapOptions] = args as [
				Runtime<unknown>,
				(sendRequestser: SendRequestser, ...args: unknown[]) => unknown,
				ConsensusAggregation<unknown, true>,
				UnwrapOptions<unknown> | undefined,
			]
			return this.sendRequestsSugarHelper(runtime, fn, consensusAggregation, unwrapOptions)
		}
		// Otherwise, this is the basic call overload
		const [runtime, input] = args as [
			NodeRuntime<unknown>,
			EnclaveActionInput | EnclaveActionInputJson,
		]
		return this.sendRequestsCallHelper(runtime, input)
	}
	private sendRequestsCallHelper(
		runtime: NodeRuntime<unknown>,
		input: EnclaveActionInput | EnclaveActionInputJson,
	): { result: () => HTTPEnclaveResponseData } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: EnclaveActionInput

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as EnclaveActionInput
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(EnclaveActionInputSchema, input as EnclaveActionInputJson)
		}

		const capabilityId = ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<EnclaveActionInput, HTTPEnclaveResponseData>({
			capabilityId,
			method: 'SendRequests',
			payload,
			inputSchema: EnclaveActionInputSchema,
			outputSchema: HTTPEnclaveResponseDataSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}
	private sendRequestsSugarHelper<TArgs extends unknown[], TOutput>(
		runtime: Runtime<unknown>,
		fn: (sendRequestser: SendRequestser, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput } {
		const wrappedFn = (runtime: NodeRuntime<unknown>, ...args: TArgs) => {
			const sendRequestser = new SendRequestser(runtime, this)
			return fn(sendRequestser, ...args)
		}
		return runtime.runInNodeMode(wrappedFn, consensusAggregation, unwrapOptions)
	}
}
