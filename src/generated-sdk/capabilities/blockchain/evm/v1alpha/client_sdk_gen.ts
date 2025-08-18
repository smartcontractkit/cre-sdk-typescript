import { fromBinary, toBinary, fromJson, create } from "@bufbuild/protobuf";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { BaseTriggerImpl } from "@cre/sdk/utils/triggers/trigger-interface";
import { type Any, AnySchema } from "@bufbuild/protobuf/wkt";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
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
  type BalanceAtRequestJson,
  type CallContractReply,
  type CallContractRequestJson,
  type EstimateGasReply,
  type EstimateGasRequestJson,
  type FilterLogTriggerRequestJson,
  type FilterLogsReply,
  type FilterLogsRequestJson,
  type GetTransactionByHashReply,
  type GetTransactionByHashRequestJson,
  type GetTransactionReceiptReply,
  type GetTransactionReceiptRequestJson,
  type HeaderByNumberReply,
  type HeaderByNumberRequestJson,
  type Log,
  type RegisterLogTrackingRequestJson,
  type UnregisterLogTrackingRequestJson,
  type WriteReportReply,
  type WriteReportRequestJson,
} from "@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb";
import {
  EmptySchema,
  type Empty,
} from "@bufbuild/protobuf/wkt";

/**
 * Client Capability
 * 
 * Capability ID: evm@1.0.0
 * Default Mode: Mode.DON
 */
export class ClientCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "evm@1.0.0";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.DON;

  constructor(
    private readonly mode: Mode = ClientCapability.DEFAULT_MODE
  ) {}

  async callContract(input: CallContractRequestJson): Promise<CallContractReply> {
    const payload = {
      typeUrl: getTypeUrl(CallContractRequestSchema),
      value: toBinary(CallContractRequestSchema, fromJson(CallContractRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "CallContract",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "CallContract",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "CallContract",
          mode: this.mode,
        });
      }

      return fromBinary(CallContractReplySchema, capabilityResponse.response.value.value);
    });
  }

  async filterLogs(input: FilterLogsRequestJson): Promise<FilterLogsReply> {
    const payload = {
      typeUrl: getTypeUrl(FilterLogsRequestSchema),
      value: toBinary(FilterLogsRequestSchema, fromJson(FilterLogsRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "FilterLogs",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "FilterLogs",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "FilterLogs",
          mode: this.mode,
        });
      }

      return fromBinary(FilterLogsReplySchema, capabilityResponse.response.value.value);
    });
  }

  async balanceAt(input: BalanceAtRequestJson): Promise<BalanceAtReply> {
    const payload = {
      typeUrl: getTypeUrl(BalanceAtRequestSchema),
      value: toBinary(BalanceAtRequestSchema, fromJson(BalanceAtRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "BalanceAt",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "BalanceAt",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "BalanceAt",
          mode: this.mode,
        });
      }

      return fromBinary(BalanceAtReplySchema, capabilityResponse.response.value.value);
    });
  }

  async estimateGas(input: EstimateGasRequestJson): Promise<EstimateGasReply> {
    const payload = {
      typeUrl: getTypeUrl(EstimateGasRequestSchema),
      value: toBinary(EstimateGasRequestSchema, fromJson(EstimateGasRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "EstimateGas",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "EstimateGas",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "EstimateGas",
          mode: this.mode,
        });
      }

      return fromBinary(EstimateGasReplySchema, capabilityResponse.response.value.value);
    });
  }

  async getTransactionByHash(input: GetTransactionByHashRequestJson): Promise<GetTransactionByHashReply> {
    const payload = {
      typeUrl: getTypeUrl(GetTransactionByHashRequestSchema),
      value: toBinary(GetTransactionByHashRequestSchema, fromJson(GetTransactionByHashRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "GetTransactionByHash",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "GetTransactionByHash",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "GetTransactionByHash",
          mode: this.mode,
        });
      }

      return fromBinary(GetTransactionByHashReplySchema, capabilityResponse.response.value.value);
    });
  }

  async getTransactionReceipt(input: GetTransactionReceiptRequestJson): Promise<GetTransactionReceiptReply> {
    const payload = {
      typeUrl: getTypeUrl(GetTransactionReceiptRequestSchema),
      value: toBinary(GetTransactionReceiptRequestSchema, fromJson(GetTransactionReceiptRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "GetTransactionReceipt",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "GetTransactionReceipt",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "GetTransactionReceipt",
          mode: this.mode,
        });
      }

      return fromBinary(GetTransactionReceiptReplySchema, capabilityResponse.response.value.value);
    });
  }

  async headerByNumber(input: HeaderByNumberRequestJson): Promise<HeaderByNumberReply> {
    const payload = {
      typeUrl: getTypeUrl(HeaderByNumberRequestSchema),
      value: toBinary(HeaderByNumberRequestSchema, fromJson(HeaderByNumberRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "HeaderByNumber",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "HeaderByNumber",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "HeaderByNumber",
          mode: this.mode,
        });
      }

      return fromBinary(HeaderByNumberReplySchema, capabilityResponse.response.value.value);
    });
  }

  async registerLogTracking(input: RegisterLogTrackingRequestJson): Promise<Empty> {
    const payload = {
      typeUrl: getTypeUrl(RegisterLogTrackingRequestSchema),
      value: toBinary(RegisterLogTrackingRequestSchema, fromJson(RegisterLogTrackingRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "RegisterLogTracking",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "RegisterLogTracking",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "RegisterLogTracking",
          mode: this.mode,
        });
      }

      return fromBinary(EmptySchema, capabilityResponse.response.value.value);
    });
  }

  async unregisterLogTracking(input: UnregisterLogTrackingRequestJson): Promise<Empty> {
    const payload = {
      typeUrl: getTypeUrl(UnregisterLogTrackingRequestSchema),
      value: toBinary(UnregisterLogTrackingRequestSchema, fromJson(UnregisterLogTrackingRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "UnregisterLogTracking",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "UnregisterLogTracking",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "UnregisterLogTracking",
          mode: this.mode,
        });
      }

      return fromBinary(EmptySchema, capabilityResponse.response.value.value);
    });
  }

  logTrigger(config: FilterLogTriggerRequestJson): ClientLogTrigger {
    return new ClientLogTrigger(this.mode, config, ClientCapability.CAPABILITY_ID, "LogTrigger");
  }

  async writeReport(input: WriteReportRequestJson): Promise<WriteReportReply> {
    const payload = {
      typeUrl: getTypeUrl(WriteReportRequestSchema),
      value: toBinary(WriteReportRequestSchema, fromJson(WriteReportRequestSchema, input)),
    };
    
    return callCapability({
      capabilityId: ClientCapability.CAPABILITY_ID,
      method: "WriteReport",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "WriteReport",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: ClientCapability.CAPABILITY_ID,
          method: "WriteReport",
          mode: this.mode,
        });
      }

      return fromBinary(WriteReportReplySchema, capabilityResponse.response.value.value);
    });
  }
}

/**
 * Trigger implementation for LogTrigger
 */
class ClientLogTrigger extends BaseTriggerImpl<FilterLogTriggerRequestJson, Log> {
  constructor(
    mode: Mode,
    config: FilterLogTriggerRequestJson,
    private readonly _capabilityId: string,
    private readonly _method: string
  ) {
    super(mode, config);
  }

  capabilityId(): string {
    return this._capabilityId;
  }

  method(): string {
    return this._method;
  }

  newOutput(): Log {
    return create(LogSchema);
  }

  outputSchema() {
    return LogSchema;
  }

  configAsAny(): Any {
    const configMessage = fromJson(FilterLogTriggerRequestSchema, this.config);
    return create(AnySchema, {
      typeUrl: getTypeUrl(FilterLogTriggerRequestSchema),
      value: toBinary(FilterLogTriggerRequestSchema, configMessage),
    });
  }

  /**
   * Transform the trigger output - override this method if needed
   * Default implementation returns the output unchanged
   */
  adapt(output: Log): Log {
    return output;
  }
}