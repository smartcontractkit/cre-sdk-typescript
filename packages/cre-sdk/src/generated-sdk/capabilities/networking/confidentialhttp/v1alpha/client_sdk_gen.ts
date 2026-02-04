import { fromJson } from '@bufbuild/protobuf'
import {
	type ConfidentialHTTPRequest,
	type ConfidentialHTTPRequestJson,
	ConfidentialHTTPRequestSchema,
	type EnclaveActionInput,
	type EnclaveActionInputJson,
	EnclaveActionInputSchema,
	type HTTPEnclaveResponseData,
	HTTPEnclaveResponseDataSchema,
	type HTTPResponse,
	HTTPResponseSchema,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'
import { type NodeRuntime, type Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from '@cre/sdk/utils'

export class SendRequester {
	constructor(
		private readonly runtime: NodeRuntime<unknown>,
		private readonly client: ClientCapability,
	) {}
	sendRequest(input: ConfidentialHTTPRequest | ConfidentialHTTPRequestJson): {
		result: () => HTTPResponse
	} {
		return this.client.sendRequest(this.runtime, input)
	}
}

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

	sendRequest(
		runtime: NodeRuntime<unknown>,
		input: ConfidentialHTTPRequest | ConfidentialHTTPRequestJson,
	): { result: () => HTTPResponse }
	sendRequest<TArgs extends unknown[], TOutput>(
		runtime: Runtime<unknown>,
		fn: (sendRequester: SendRequester, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput }
	sendRequest(...args: unknown[]): unknown {
		// Check if this is the sugar syntax overload (has function parameter)
		if (typeof args[1] === 'function') {
			const [runtime, fn, consensusAggregation, unwrapOptions] = args as [
				Runtime<unknown>,
				(sendRequester: SendRequester, ...args: unknown[]) => unknown,
				ConsensusAggregation<unknown, true>,
				UnwrapOptions<unknown> | undefined,
			]
			return this.sendRequestSugarHelper(runtime, fn, consensusAggregation, unwrapOptions)
		}
		// Otherwise, this is the basic call overload
		const [runtime, input] = args as [
			NodeRuntime<unknown>,
			ConfidentialHTTPRequest | ConfidentialHTTPRequestJson,
		]
		return this.sendRequestCallHelper(runtime, input)
	}
	private sendRequestCallHelper(
		runtime: NodeRuntime<unknown>,
		input: ConfidentialHTTPRequest | ConfidentialHTTPRequestJson,
	): { result: () => HTTPResponse } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: ConfidentialHTTPRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as ConfidentialHTTPRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(ConfidentialHTTPRequestSchema, input as ConfidentialHTTPRequestJson)
		}

		const capabilityId = ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<ConfidentialHTTPRequest, HTTPResponse>({
			capabilityId,
			method: 'SendRequest',
			payload,
			inputSchema: ConfidentialHTTPRequestSchema,
			outputSchema: HTTPResponseSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}
	private sendRequestSugarHelper<TArgs extends unknown[], TOutput>(
		runtime: Runtime<unknown>,
		fn: (sendRequester: SendRequester, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput } {
		const wrappedFn = (runtime: NodeRuntime<unknown>, ...args: TArgs) => {
			const sendRequester = new SendRequester(runtime, this)
			return fn(sendRequester, ...args)
		}
		return runtime.runInNodeMode(wrappedFn, consensusAggregation, unwrapOptions)
	}

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
