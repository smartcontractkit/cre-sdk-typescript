import { fromBinary, toBinary, fromJson } from "@bufbuild/protobuf";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
import {
  ReportRequestSchema,
  ReportResponseSchema,
  SimpleConsensusInputsSchema,
  type ReportRequest,
  type ReportRequestJson,
  type ReportResponse,
  type SimpleConsensusInputs,
  type SimpleConsensusInputsJson,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import {
  ValueSchema,
  type Value,
} from "@cre/generated/values/v1/values_pb";

/**
 * Consensus Capability
 * 
 * Capability ID: consensus@1.0.0-alpha
 * Default Mode: Mode.DON
 * Capability Name: consensus
 * Capability Version: 1.0.0-alpha
 */
export class ConsensusCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "consensus@1.0.0-alpha";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.DON;

  static readonly CAPABILITY_NAME = "consensus";
  static readonly CAPABILITY_VERSION = "1.0.0-alpha";


  constructor(
    private readonly mode: Mode = ConsensusCapability.DEFAULT_MODE
  ) {}

  simple(input: SimpleConsensusInputs |  SimpleConsensusInputsJson): Promise<Value> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const value = (input as any).$typeName ? input as SimpleConsensusInputs : fromJson(SimpleConsensusInputsSchema, input as SimpleConsensusInputsJson)
    const payload = {
      typeUrl: getTypeUrl(SimpleConsensusInputsSchema),
      value: toBinary(SimpleConsensusInputsSchema, value),
    };
    const capabilityId = ConsensusCapability.CAPABILITY_ID;
    
    return callCapability({
      capabilityId,
      method: "Simple",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId,
          method: "Simple",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId,
          method: "Simple",
          mode: this.mode,
        });
      }

      return fromBinary(ValueSchema, capabilityResponse.response.value.value);
    });
  }

  report(input: ReportRequest |  ReportRequestJson): Promise<ReportResponse> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const value = (input as any).$typeName ? input as ReportRequest : fromJson(ReportRequestSchema, input as ReportRequestJson)
    const payload = {
      typeUrl: getTypeUrl(ReportRequestSchema),
      value: toBinary(ReportRequestSchema, value),
    };
    const capabilityId = ConsensusCapability.CAPABILITY_ID;
    
    return callCapability({
      capabilityId,
      method: "Report",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId,
          method: "Report",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId,
          method: "Report",
          mode: this.mode,
        });
      }

      return fromBinary(ReportResponseSchema, capabilityResponse.response.value.value);
    });
  }
}
