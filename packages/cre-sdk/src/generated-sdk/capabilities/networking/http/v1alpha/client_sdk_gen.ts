import { fromJson } from '@bufbuild/protobuf'
import {
	type Request,
	type RequestJson,
	RequestSchema,
	type Response,
	ResponseSchema,
} from '@cre/generated/capabilities/networking/http/v1alpha/client_pb'
import type { NodeRuntime, Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from '@cre/sdk/utils'

export class SendRequester {
	constructor(
		private readonly runtime: NodeRuntime<unknown>,
		private readonly client: ClientCapability,
	) {}
	sendRequest(input: Request | RequestJson): { result: () => Response } {
		return this.client.sendRequest(this.runtime, input)
	}
}

/**
 * Client Capability
 *
 * Capability ID: http-actions@1.0.0-alpha
 * Capability Name: http-actions
 * Capability Version: 1.0.0-alpha
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'http-actions@1.0.0-alpha'

	static readonly CAPABILITY_NAME = 'http-actions'
	static readonly CAPABILITY_VERSION = '1.0.0-alpha'

	sendRequest(
		runtime: NodeRuntime<unknown>,
		input: Request | RequestJson,
	): { result: () => Response }
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
		const [runtime, input] = args as [NodeRuntime<unknown>, Request | RequestJson]
		return this.sendRequestCallHelper(runtime, input)
	}
	private sendRequestCallHelper(
		runtime: NodeRuntime<unknown>,
		input: Request | RequestJson,
	): { result: () => Response } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: Request

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as Request
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(RequestSchema, input as RequestJson)
		}

		const capabilityId = ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<Request, Response>({
			capabilityId,
			method: 'SendRequest',
			payload,
			inputSchema: RequestSchema,
			outputSchema: ResponseSchema,
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
}
