import { create, fromJson } from '@bufbuild/protobuf'
import { type Any, AnySchema, anyPack, type Empty, EmptySchema } from '@bufbuild/protobuf/wkt'
import {
	type BalanceAtReply,
	BalanceAtReplySchema,
	type BalanceAtRequest,
	type BalanceAtRequestJson,
	BalanceAtRequestSchema,
	type CallContractReply,
	CallContractReplySchema,
	type CallContractRequest,
	type CallContractRequestJson,
	CallContractRequestSchema,
	type EstimateGasReply,
	EstimateGasReplySchema,
	type EstimateGasRequest,
	type EstimateGasRequestJson,
	EstimateGasRequestSchema,
	type FilterLogsReply,
	FilterLogsReplySchema,
	type FilterLogsRequest,
	type FilterLogsRequestJson,
	FilterLogsRequestSchema,
	type FilterLogTriggerRequest,
	type FilterLogTriggerRequestJson,
	FilterLogTriggerRequestSchema,
	type GasConfig,
	type GasConfigJson,
	GasConfigSchema,
	type GetTransactionByHashReply,
	GetTransactionByHashReplySchema,
	type GetTransactionByHashRequest,
	type GetTransactionByHashRequestJson,
	GetTransactionByHashRequestSchema,
	type GetTransactionReceiptReply,
	GetTransactionReceiptReplySchema,
	type GetTransactionReceiptRequest,
	type GetTransactionReceiptRequestJson,
	GetTransactionReceiptRequestSchema,
	type HeaderByNumberReply,
	HeaderByNumberReplySchema,
	type HeaderByNumberRequest,
	type HeaderByNumberRequestJson,
	HeaderByNumberRequestSchema,
	type Log,
	LogSchema,
	type RegisterLogTrackingRequest,
	type RegisterLogTrackingRequestJson,
	RegisterLogTrackingRequestSchema,
	type UnregisterLogTrackingRequest,
	type UnregisterLogTrackingRequestJson,
	UnregisterLogTrackingRequestSchema,
	type WriteReportReply,
	WriteReportReplySchema,
	type WriteReportRequest,
	type WriteReportRequestJson,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb'
import {
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import { hexToBytes } from '@cre/sdk/utils/hex-utils'
import { type Trigger } from '@cre/sdk/utils/triggers/trigger-interface'

export type WriteCreReportRequest = {
	receiver: Uint8Array
	report?: Report
	gasConfig?: GasConfig
	$report: true
}

export type WriteCreReportRequestJson = {
	receiver: string
	report?: Report
	gasConfig?: GasConfigJson
}

export function x_generatedCodeOnly_wrap_WriteCreReportRequest(
	input: WriteReportRequest,
): WriteCreReportRequest {
	return {
		receiver: input.receiver,
		report: input.report !== undefined ? new Report(input.report) : undefined,
		gasConfig: input.gasConfig,
		$report: true,
	}
}

export function createWriteCreReportRequest(
	input: WriteCreReportRequestJson,
): WriteCreReportRequest {
	return {
		receiver: hexToBytes(input.receiver),
		report: input.report,
		gasConfig:
			input.gasConfig !== undefined ? fromJson(GasConfigSchema, input.gasConfig) : undefined,
		$report: true,
	}
}

export function x_generatedCodeOnly_unwrap_WriteCreReportRequest(
	input: WriteCreReportRequest,
): WriteReportRequest {
	return create(WriteReportRequestSchema, {
		receiver: input.receiver,
		report: input.report !== undefined ? input.report.x_generatedCodeOnly_unwrap() : undefined,
		gasConfig: input.gasConfig,
	})
}

/**
 * Client Capability
 *
 * Capability ID: evm@1.0.0
 * Capability Name: evm
 * Capability Version: 1.0.0
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'evm@1.0.0'

	static readonly CAPABILITY_NAME = 'evm'
	static readonly CAPABILITY_VERSION = '1.0.0'

	/** Available chain selectors */
	static readonly SUPPORTED_CHAINS = {
		'avalanche-mainnet': 6433500567565415381n,
		'avalanche-testnet-fuji': 14767482510784806043n,
		'binance_smart_chain-mainnet-opbnb-1': 465944652040885897n,
		'binance_smart_chain-testnet-opbnb-1': 13274425992935471758n,
		'ethereum-mainnet': 5009297550715157269n,
		'ethereum-mainnet-arbitrum-1': 4949039107694359620n,
		'ethereum-mainnet-optimism-1': 3734403246176062136n,
		'ethereum-testnet-sepolia': 16015286601757825753n,
		'ethereum-testnet-sepolia-arbitrum-1': 3478487238524512106n,
		'ethereum-testnet-sepolia-base-1': 10344971235874465080n,
		'ethereum-testnet-sepolia-optimism-1': 5224473277236331295n,
		'polygon-mainnet': 4051577828743386545n,
		'polygon-testnet-amoy': 16281711391670634445n,
	} as const

	constructor(private readonly chainSelector?: bigint) {}

	callContract(
		runtime: Runtime<unknown>,
		input: CallContractRequest | CallContractRequestJson,
	): { result: () => CallContractReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: CallContractRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as CallContractRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(CallContractRequestSchema, input as CallContractRequestJson)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<CallContractRequest, CallContractReply>({
			capabilityId,
			method: 'CallContract',
			payload,
			inputSchema: CallContractRequestSchema,
			outputSchema: CallContractReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	filterLogs(
		runtime: Runtime<unknown>,
		input: FilterLogsRequest | FilterLogsRequestJson,
	): { result: () => FilterLogsReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: FilterLogsRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as FilterLogsRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(FilterLogsRequestSchema, input as FilterLogsRequestJson)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<FilterLogsRequest, FilterLogsReply>({
			capabilityId,
			method: 'FilterLogs',
			payload,
			inputSchema: FilterLogsRequestSchema,
			outputSchema: FilterLogsReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	balanceAt(
		runtime: Runtime<unknown>,
		input: BalanceAtRequest | BalanceAtRequestJson,
	): { result: () => BalanceAtReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: BalanceAtRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as BalanceAtRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(BalanceAtRequestSchema, input as BalanceAtRequestJson)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<BalanceAtRequest, BalanceAtReply>({
			capabilityId,
			method: 'BalanceAt',
			payload,
			inputSchema: BalanceAtRequestSchema,
			outputSchema: BalanceAtReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	estimateGas(
		runtime: Runtime<unknown>,
		input: EstimateGasRequest | EstimateGasRequestJson,
	): { result: () => EstimateGasReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: EstimateGasRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as EstimateGasRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(EstimateGasRequestSchema, input as EstimateGasRequestJson)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<EstimateGasRequest, EstimateGasReply>({
			capabilityId,
			method: 'EstimateGas',
			payload,
			inputSchema: EstimateGasRequestSchema,
			outputSchema: EstimateGasReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getTransactionByHash(
		runtime: Runtime<unknown>,
		input: GetTransactionByHashRequest | GetTransactionByHashRequestJson,
	): { result: () => GetTransactionByHashReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetTransactionByHashRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetTransactionByHashRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(
				GetTransactionByHashRequestSchema,
				input as GetTransactionByHashRequestJson,
			)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<
			GetTransactionByHashRequest,
			GetTransactionByHashReply
		>({
			capabilityId,
			method: 'GetTransactionByHash',
			payload,
			inputSchema: GetTransactionByHashRequestSchema,
			outputSchema: GetTransactionByHashReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getTransactionReceipt(
		runtime: Runtime<unknown>,
		input: GetTransactionReceiptRequest | GetTransactionReceiptRequestJson,
	): { result: () => GetTransactionReceiptReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetTransactionReceiptRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetTransactionReceiptRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(
				GetTransactionReceiptRequestSchema,
				input as GetTransactionReceiptRequestJson,
			)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<
			GetTransactionReceiptRequest,
			GetTransactionReceiptReply
		>({
			capabilityId,
			method: 'GetTransactionReceipt',
			payload,
			inputSchema: GetTransactionReceiptRequestSchema,
			outputSchema: GetTransactionReceiptReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	headerByNumber(
		runtime: Runtime<unknown>,
		input: HeaderByNumberRequest | HeaderByNumberRequestJson,
	): { result: () => HeaderByNumberReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: HeaderByNumberRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as HeaderByNumberRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(HeaderByNumberRequestSchema, input as HeaderByNumberRequestJson)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<HeaderByNumberRequest, HeaderByNumberReply>({
			capabilityId,
			method: 'HeaderByNumber',
			payload,
			inputSchema: HeaderByNumberRequestSchema,
			outputSchema: HeaderByNumberReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	registerLogTracking(
		runtime: Runtime<unknown>,
		input: RegisterLogTrackingRequest | RegisterLogTrackingRequestJson,
	): { result: () => Empty } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: RegisterLogTrackingRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as RegisterLogTrackingRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(RegisterLogTrackingRequestSchema, input as RegisterLogTrackingRequestJson)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<RegisterLogTrackingRequest, Empty>({
			capabilityId,
			method: 'RegisterLogTracking',
			payload,
			inputSchema: RegisterLogTrackingRequestSchema,
			outputSchema: EmptySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	unregisterLogTracking(
		runtime: Runtime<unknown>,
		input: UnregisterLogTrackingRequest | UnregisterLogTrackingRequestJson,
	): { result: () => Empty } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: UnregisterLogTrackingRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as UnregisterLogTrackingRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(
				UnregisterLogTrackingRequestSchema,
				input as UnregisterLogTrackingRequestJson,
			)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<UnregisterLogTrackingRequest, Empty>({
			capabilityId,
			method: 'UnregisterLogTracking',
			payload,
			inputSchema: UnregisterLogTrackingRequestSchema,
			outputSchema: EmptySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	logTrigger(config: FilterLogTriggerRequestJson): ClientLogTrigger {
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID
		return new ClientLogTrigger(config, capabilityId, 'LogTrigger')
	}

	writeReport(
		runtime: Runtime<unknown>,
		input: WriteCreReportRequest | WriteCreReportRequestJson,
	): { result: () => WriteReportReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: WriteReportRequest

		// Check if it's a wrapped type by looking for the $report property
		if ((input as unknown as { $report?: string }).$report) {
			// It's a wrapped type, unwrap it
			payload = x_generatedCodeOnly_unwrap_WriteCreReportRequest(input as WriteCreReportRequest)
		} else {
			// It's wrapped JSON, convert using create function
			payload = x_generatedCodeOnly_unwrap_WriteCreReportRequest(
				createWriteCreReportRequest(input as WriteCreReportRequestJson),
			)
		}

		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<WriteReportRequest, WriteReportReply>({
			capabilityId,
			method: 'WriteReport',
			payload,
			inputSchema: WriteReportRequestSchema,
			outputSchema: WriteReportReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}
}

/**
 * Trigger implementation for LogTrigger
 */
class ClientLogTrigger implements Trigger<Log, Log> {
	public readonly config: FilterLogTriggerRequest
	constructor(
		config: FilterLogTriggerRequest | FilterLogTriggerRequestJson,
		private readonly _capabilityId: string,
		private readonly _method: string,
	) {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		this.config = (config as any).$typeName
			? (config as FilterLogTriggerRequest)
			: fromJson(FilterLogTriggerRequestSchema, config as FilterLogTriggerRequestJson)
	}

	capabilityId(): string {
		return this._capabilityId
	}

	method(): string {
		return this._method
	}

	outputSchema() {
		return LogSchema
	}

	configAsAny(): Any {
		return anyPack(FilterLogTriggerRequestSchema, this.config)
	}

	/**
	 * Transform the raw trigger output - override this method if needed
	 * Default implementation returns the raw output unchanged
	 */
	adapt(rawOutput: Log): Log {
		return rawOutput
	}
}
