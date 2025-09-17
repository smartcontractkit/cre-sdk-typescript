import { fromJson } from "@bufbuild/protobuf"
import { type Runtime } from "@cre/sdk/runtime/runtime"
import {
  ReportRequestSchema,
  ReportResponseSchema,
  SimpleConsensusInputsSchema,
  type ReportRequest,
  type ReportRequestJson,
  type ReportResponse,
  type SimpleConsensusInputs,
  type SimpleConsensusInputsJson,
} from "@cre/generated/sdk/v1alpha/sdk_pb"
import {
  ValueSchema,
  type Value,
} from "@cre/generated/values/v1/values_pb"

/**
 * Consensus Capability
 * 
 * Capability ID: consensus@1.0.0-alpha
 * Capability Name: consensus
 * Capability Version: 1.0.0-alpha
 */
export class ConsensusCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "consensus@1.0.0-alpha";

  static readonly CAPABILITY_NAME = "consensus";
  static readonly CAPABILITY_VERSION = "1.0.0-alpha";


  constructor(
    
  ) {}

  async simple(runtime: Runtime<any>, input: SimpleConsensusInputs |  SimpleConsensusInputsJson): Promise<Value> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as SimpleConsensusInputs : fromJson(SimpleConsensusInputsSchema, input as SimpleConsensusInputsJson)
    
    
    const capabilityId = ConsensusCapability.CAPABILITY_ID;
    
    return runtime.callCapability<SimpleConsensusInputs, Value>({
      capabilityId,
      method: "Simple",
      payload,
      inputSchema: SimpleConsensusInputsSchema,
      outputSchema: ValueSchema
    })
  }

  async report(runtime: Runtime<any>, input: ReportRequest |  ReportRequestJson): Promise<ReportResponse> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as ReportRequest : fromJson(ReportRequestSchema, input as ReportRequestJson)
    
    
    const capabilityId = ConsensusCapability.CAPABILITY_ID;
    
    return runtime.callCapability<ReportRequest, ReportResponse>({
      capabilityId,
      method: "Report",
      payload,
      inputSchema: ReportRequestSchema,
      outputSchema: ReportResponseSchema
    })
  }
}
