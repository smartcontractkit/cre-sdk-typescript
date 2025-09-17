import { fromJson, create } from "@bufbuild/protobuf"
import { type Trigger } from "@cre/sdk/utils/triggers/trigger-interface"
import { type Any, AnySchema } from "@bufbuild/protobuf/wkt"
import { type Runtime } from "@cre/sdk/runtime/runtime"
import {
  BalanceAtReplySchema,
  BalanceAtRequestSchema,
  CallContractReplySchema,
  CallContractRequestSchema,
  EstimateGasReplySchema,
  EstimateGasRequestSchema,
  FilterLogTriggerRequestSchema,
  FilterLogsReplySchema,
  FilterLogsRequestSchema,
  GetTransactionByHashReplySchema,
  GetTransactionByHashRequestSchema,
  GetTransactionReceiptReplySchema,
  GetTransactionReceiptRequestSchema,
  HeaderByNumberReplySchema,
  HeaderByNumberRequestSchema,
  LogSchema,
  RegisterLogTrackingRequestSchema,
  UnregisterLogTrackingRequestSchema,
  WriteReportReplySchema,
  WriteReportRequestSchema,
  type BalanceAtReply,
  type BalanceAtRequest,
  type BalanceAtRequestJson,
  type CallContractReply,
  type CallContractRequest,
  type CallContractRequestJson,
  type EstimateGasReply,
  type EstimateGasRequest,
  type EstimateGasRequestJson,
  type FilterLogTriggerRequest,
  type FilterLogTriggerRequestJson,
  type FilterLogsReply,
  type FilterLogsRequest,
  type FilterLogsRequestJson,
  type GetTransactionByHashReply,
  type GetTransactionByHashRequest,
  type GetTransactionByHashRequestJson,
  type GetTransactionReceiptReply,
  type GetTransactionReceiptRequest,
  type GetTransactionReceiptRequestJson,
  type HeaderByNumberReply,
  type HeaderByNumberRequest,
  type HeaderByNumberRequestJson,
  type Log,
  type RegisterLogTrackingRequest,
  type RegisterLogTrackingRequestJson,
  type UnregisterLogTrackingRequest,
  type UnregisterLogTrackingRequestJson,
  type WriteReportReply,
  type WriteReportRequest,
  type WriteReportRequestJson,
} from "@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb"
import {
  EmptySchema,
  type Empty,
} from "@bufbuild/protobuf/wkt"

/**
 * Client Capability
 * 
 * Capability ID: evm@1.0.0
 * Capability Name: evm
 * Capability Version: 1.0.0
 */
export class ClientCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "evm@1.0.0";

  static readonly CAPABILITY_NAME = "evm";
  static readonly CAPABILITY_VERSION = "1.0.0";

  /** Available chain selectors */
  static readonly SUPPORTED_CHAINS = {
    "avalanche-mainnet": 6433500567565415381n,
    "avalanche-testnet-fuji": 14767482510784806043n,
    "binance_smart_chain-mainnet-opbnb-1": 465944652040885897n,
    "binance_smart_chain-testnet-opbnb-1": 13274425992935471758n,
    "ethereum-mainnet": 5009297550715157269n,
    "ethereum-mainnet-arbitrum-1": 4949039107694359620n,
    "ethereum-mainnet-optimism-1": 3734403246176062136n,
    "ethereum-testnet-sepolia": 16015286601757825753n,
    "ethereum-testnet-sepolia-arbitrum-1": 3478487238524512106n,
    "ethereum-testnet-sepolia-base-1": 10344971235874465080n,
    "ethereum-testnet-sepolia-optimism-1": 5224473277236331295n,
    "polygon-mainnet": 4051577828743386545n,
    "polygon-testnet-amoy": 16281711391670634445n
  } as const

  constructor(
    ,
    private readonly chainSelector?: bigint
  ) {}

  async callContract(runtime: Runtime<any>, input: CallContractRequest |  CallContractRequestJson): Promise<CallContractReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as CallContractRequest : fromJson(CallContractRequestSchema, input as CallContractRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<CallContractRequest, CallContractReply>({
      capabilityId,
      method: "CallContract",
      payload,
      inputSchema: CallContractRequestSchema,
      outputSchema: CallContractReplySchema
    })
  }

  async filterLogs(runtime: Runtime<any>, input: FilterLogsRequest |  FilterLogsRequestJson): Promise<FilterLogsReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as FilterLogsRequest : fromJson(FilterLogsRequestSchema, input as FilterLogsRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<FilterLogsRequest, FilterLogsReply>({
      capabilityId,
      method: "FilterLogs",
      payload,
      inputSchema: FilterLogsRequestSchema,
      outputSchema: FilterLogsReplySchema
    })
  }

  async balanceAt(runtime: Runtime<any>, input: BalanceAtRequest |  BalanceAtRequestJson): Promise<BalanceAtReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as BalanceAtRequest : fromJson(BalanceAtRequestSchema, input as BalanceAtRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<BalanceAtRequest, BalanceAtReply>({
      capabilityId,
      method: "BalanceAt",
      payload,
      inputSchema: BalanceAtRequestSchema,
      outputSchema: BalanceAtReplySchema
    })
  }

  async estimateGas(runtime: Runtime<any>, input: EstimateGasRequest |  EstimateGasRequestJson): Promise<EstimateGasReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as EstimateGasRequest : fromJson(EstimateGasRequestSchema, input as EstimateGasRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<EstimateGasRequest, EstimateGasReply>({
      capabilityId,
      method: "EstimateGas",
      payload,
      inputSchema: EstimateGasRequestSchema,
      outputSchema: EstimateGasReplySchema
    })
  }

  async getTransactionByHash(runtime: Runtime<any>, input: GetTransactionByHashRequest |  GetTransactionByHashRequestJson): Promise<GetTransactionByHashReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as GetTransactionByHashRequest : fromJson(GetTransactionByHashRequestSchema, input as GetTransactionByHashRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<GetTransactionByHashRequest, GetTransactionByHashReply>({
      capabilityId,
      method: "GetTransactionByHash",
      payload,
      inputSchema: GetTransactionByHashRequestSchema,
      outputSchema: GetTransactionByHashReplySchema
    })
  }

  async getTransactionReceipt(runtime: Runtime<any>, input: GetTransactionReceiptRequest |  GetTransactionReceiptRequestJson): Promise<GetTransactionReceiptReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as GetTransactionReceiptRequest : fromJson(GetTransactionReceiptRequestSchema, input as GetTransactionReceiptRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<GetTransactionReceiptRequest, GetTransactionReceiptReply>({
      capabilityId,
      method: "GetTransactionReceipt",
      payload,
      inputSchema: GetTransactionReceiptRequestSchema,
      outputSchema: GetTransactionReceiptReplySchema
    })
  }

  async headerByNumber(runtime: Runtime<any>, input: HeaderByNumberRequest |  HeaderByNumberRequestJson): Promise<HeaderByNumberReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as HeaderByNumberRequest : fromJson(HeaderByNumberRequestSchema, input as HeaderByNumberRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<HeaderByNumberRequest, HeaderByNumberReply>({
      capabilityId,
      method: "HeaderByNumber",
      payload,
      inputSchema: HeaderByNumberRequestSchema,
      outputSchema: HeaderByNumberReplySchema
    })
  }

  async registerLogTracking(runtime: Runtime<any>, input: RegisterLogTrackingRequest |  RegisterLogTrackingRequestJson): Promise<Empty> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as RegisterLogTrackingRequest : fromJson(RegisterLogTrackingRequestSchema, input as RegisterLogTrackingRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<RegisterLogTrackingRequest, Empty>({
      capabilityId,
      method: "RegisterLogTracking",
      payload,
      inputSchema: RegisterLogTrackingRequestSchema,
      outputSchema: EmptySchema
    })
  }

  async unregisterLogTracking(runtime: Runtime<any>, input: UnregisterLogTrackingRequest |  UnregisterLogTrackingRequestJson): Promise<Empty> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as UnregisterLogTrackingRequest : fromJson(UnregisterLogTrackingRequestSchema, input as UnregisterLogTrackingRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<UnregisterLogTrackingRequest, Empty>({
      capabilityId,
      method: "UnregisterLogTracking",
      payload,
      inputSchema: UnregisterLogTrackingRequestSchema,
      outputSchema: EmptySchema
    })
  }

  logTrigger(config: FilterLogTriggerRequestJson): ClientLogTrigger {
    return new ClientLogTrigger(config, ClientCapability.CAPABILITY_ID, "LogTrigger");
  }

  async writeReport(runtime: Runtime<any>, input: WriteReportRequest |  WriteReportRequestJson): Promise<WriteReportReply> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as WriteReportRequest : fromJson(WriteReportRequestSchema, input as WriteReportRequestJson)
    
    
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.chainSelector}@${ClientCapability.CAPABILITY_VERSION}`
      : ClientCapability.CAPABILITY_ID;
    
    return runtime.callCapability<WriteReportRequest, WriteReportReply>({
      capabilityId,
      method: "WriteReport",
      payload,
      inputSchema: WriteReportRequestSchema,
      outputSchema: WriteReportReplySchema
    })
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
    private readonly _method: string
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    this.config = (config as any).$typeName ? config as FilterLogTriggerRequest : fromJson(FilterLogTriggerRequestSchema, config as FilterLogTriggerRequestJson)
  }

  capabilityId(): string {
    return this._capabilityId;
  }

  method(): string {
    return this._method;
  }

  outputSchema() {
    return LogSchema;
  }

  configAsAny(): Any {
    return create(AnySchema, {
      typeUrl: getTypeUrl(FilterLogTriggerRequestSchema),
      value: toBinary(FilterLogTriggerRequestSchema, this.config),
    });
  }

  /**
   * Transform the raw trigger output - override this method if needed
   * Default implementation returns the raw output unchanged
   */
  adapt(rawOutput: Log): Log {
    return rawOutput;
  }
}