import { create, fromBinary, fromJson, toBinary } from '@bufbuild/protobuf'
import { type Any, AnySchema, type Empty, EmptySchema } from '@bufbuild/protobuf/wkt'
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
import { type CapabilityResponse, Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { callCapability } from '@cre/sdk/utils/capabilities/call-capability'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { type Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'

/**
 * Client Capability
 *
 * Capability ID: evm@1.0.0
 * Default Mode: Mode.DON
 * Capability Name: evm
 * Capability Version: 1.0.0
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'evm@1.0.0'

	/** The default execution mode for this capability */
	static readonly DEFAULT_MODE = Mode.DON

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

	constructor(
		private readonly mode: Mode = ClientCapability.DEFAULT_MODE,
		private readonly chainSelector?: bigint,
	) {}

	async callContract(
		input: CallContractRequest | CallContractRequestJson,
	): Promise<CallContractReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as CallContractRequest)
			: fromJson(CallContractRequestSchema, input as CallContractRequestJson)
		const payload = {
			typeUrl: getTypeUrl(CallContractRequestSchema),
			value: toBinary(CallContractRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'CallContract',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'CallContract',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'CallContract',
				mode: this.mode,
			})
		}

		return fromBinary(CallContractReplySchema, capabilityResponse.response.value.value)
	}

	async filterLogs(input: FilterLogsRequest | FilterLogsRequestJson): Promise<FilterLogsReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as FilterLogsRequest)
			: fromJson(FilterLogsRequestSchema, input as FilterLogsRequestJson)
		const payload = {
			typeUrl: getTypeUrl(FilterLogsRequestSchema),
			value: toBinary(FilterLogsRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'FilterLogs',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'FilterLogs',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'FilterLogs',
				mode: this.mode,
			})
		}

		return fromBinary(FilterLogsReplySchema, capabilityResponse.response.value.value)
	}

	async balanceAt(input: BalanceAtRequest | BalanceAtRequestJson): Promise<BalanceAtReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as BalanceAtRequest)
			: fromJson(BalanceAtRequestSchema, input as BalanceAtRequestJson)
		const payload = {
			typeUrl: getTypeUrl(BalanceAtRequestSchema),
			value: toBinary(BalanceAtRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'BalanceAt',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'BalanceAt',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'BalanceAt',
				mode: this.mode,
			})
		}

		return fromBinary(BalanceAtReplySchema, capabilityResponse.response.value.value)
	}

	async estimateGas(input: EstimateGasRequest | EstimateGasRequestJson): Promise<EstimateGasReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as EstimateGasRequest)
			: fromJson(EstimateGasRequestSchema, input as EstimateGasRequestJson)
		const payload = {
			typeUrl: getTypeUrl(EstimateGasRequestSchema),
			value: toBinary(EstimateGasRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'EstimateGas',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'EstimateGas',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'EstimateGas',
				mode: this.mode,
			})
		}

		return fromBinary(EstimateGasReplySchema, capabilityResponse.response.value.value)
	}

	async getTransactionByHash(
		input: GetTransactionByHashRequest | GetTransactionByHashRequestJson,
	): Promise<GetTransactionByHashReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as GetTransactionByHashRequest)
			: fromJson(GetTransactionByHashRequestSchema, input as GetTransactionByHashRequestJson)
		const payload = {
			typeUrl: getTypeUrl(GetTransactionByHashRequestSchema),
			value: toBinary(GetTransactionByHashRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'GetTransactionByHash',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'GetTransactionByHash',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'GetTransactionByHash',
				mode: this.mode,
			})
		}

		return fromBinary(GetTransactionByHashReplySchema, capabilityResponse.response.value.value)
	}

	async getTransactionReceipt(
		input: GetTransactionReceiptRequest | GetTransactionReceiptRequestJson,
	): Promise<GetTransactionReceiptReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as GetTransactionReceiptRequest)
			: fromJson(GetTransactionReceiptRequestSchema, input as GetTransactionReceiptRequestJson)
		const payload = {
			typeUrl: getTypeUrl(GetTransactionReceiptRequestSchema),
			value: toBinary(GetTransactionReceiptRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'GetTransactionReceipt',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'GetTransactionReceipt',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'GetTransactionReceipt',
				mode: this.mode,
			})
		}

		return fromBinary(GetTransactionReceiptReplySchema, capabilityResponse.response.value.value)
	}

	async headerByNumber(
		input: HeaderByNumberRequest | HeaderByNumberRequestJson,
	): Promise<HeaderByNumberReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as HeaderByNumberRequest)
			: fromJson(HeaderByNumberRequestSchema, input as HeaderByNumberRequestJson)
		const payload = {
			typeUrl: getTypeUrl(HeaderByNumberRequestSchema),
			value: toBinary(HeaderByNumberRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'HeaderByNumber',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'HeaderByNumber',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'HeaderByNumber',
				mode: this.mode,
			})
		}

		return fromBinary(HeaderByNumberReplySchema, capabilityResponse.response.value.value)
	}

	async registerLogTracking(
		input: RegisterLogTrackingRequest | RegisterLogTrackingRequestJson,
	): Promise<Empty> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as RegisterLogTrackingRequest)
			: fromJson(RegisterLogTrackingRequestSchema, input as RegisterLogTrackingRequestJson)
		const payload = {
			typeUrl: getTypeUrl(RegisterLogTrackingRequestSchema),
			value: toBinary(RegisterLogTrackingRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'RegisterLogTracking',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'RegisterLogTracking',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'RegisterLogTracking',
				mode: this.mode,
			})
		}

		return fromBinary(EmptySchema, capabilityResponse.response.value.value)
	}

	async unregisterLogTracking(
		input: UnregisterLogTrackingRequest | UnregisterLogTrackingRequestJson,
	): Promise<Empty> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as UnregisterLogTrackingRequest)
			: fromJson(UnregisterLogTrackingRequestSchema, input as UnregisterLogTrackingRequestJson)
		const payload = {
			typeUrl: getTypeUrl(UnregisterLogTrackingRequestSchema),
			value: toBinary(UnregisterLogTrackingRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'UnregisterLogTracking',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'UnregisterLogTracking',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'UnregisterLogTracking',
				mode: this.mode,
			})
		}

		return fromBinary(EmptySchema, capabilityResponse.response.value.value)
	}

	logTrigger(config: FilterLogTriggerRequestJson): ClientLogTrigger {
		return new ClientLogTrigger(this.mode, config, ClientCapability.CAPABILITY_ID, 'LogTrigger')
	}

	async writeReport(input: WriteReportRequest | WriteReportRequestJson): Promise<WriteReportReply> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as WriteReportRequest)
			: fromJson(WriteReportRequestSchema, input as WriteReportRequestJson)
		const payload = {
			typeUrl: getTypeUrl(WriteReportRequestSchema),
			value: toBinary(WriteReportRequestSchema, value),
		}
		// Include chainSelector in capability ID for routing when specified
		const capabilityId = this.chainSelector
			? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
			: ClientCapability.CAPABILITY_ID

		const capabilityResponse = await callCapability({
			capabilityId,
			method: 'WriteReport',
			mode: this.mode,
			payload,
		})

		if (capabilityResponse.response.case === 'error') {
			throw new CapabilityError(capabilityResponse.response.value, {
				capabilityId,
				method: 'WriteReport',
				mode: this.mode,
			})
		}

		if (capabilityResponse.response.case !== 'payload') {
			throw new CapabilityError('No payload in response', {
				capabilityId,
				method: 'WriteReport',
				mode: this.mode,
			})
		}

		return fromBinary(WriteReportReplySchema, capabilityResponse.response.value.value)
	}
}

/**
 * Trigger implementation for LogTrigger
 */
class ClientLogTrigger implements Trigger<Log, Log> {
	public readonly config: FilterLogTriggerRequest
	constructor(
		public readonly mode: Mode,
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
		return create(AnySchema, {
			typeUrl: getTypeUrl(FilterLogTriggerRequestSchema),
			value: toBinary(FilterLogTriggerRequestSchema, this.config),
		})
	}

	/**
	 * Transform the raw trigger output - override this method if needed
	 * Default implementation returns the raw output unchanged
	 */
	adapt(rawOutput: Log): Log {
		return rawOutput
	}
}
