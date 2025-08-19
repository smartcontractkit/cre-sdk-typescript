import { fromBinary, toBinary, fromJson, create } from "@bufbuild/protobuf";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
import {
  NodeInputsSchema,
  NodeOutputsSchema,
  type NodeInputsJson,
  type NodeOutputs,
} from "@cre/generated/capabilities/internal/nodeaction/v1/node_action_pb";

/**
 * BasicAction Capability
 * 
 * Capability ID: basic-test-node-action@1.0.0
 * Default Mode: Mode.NODE
 */
export class BasicActionCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "basic-test-node-action@1.0.0";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.NODE;


  constructor(
    private readonly mode: Mode = BasicActionCapability.DEFAULT_MODE
  ) {}

  async performAction(input: NodeInputsJson): Promise<NodeOutputs> {
    const payload = {
      typeUrl: getTypeUrl(NodeInputsSchema),
      value: toBinary(NodeInputsSchema, fromJson(NodeInputsSchema, input)),
    };
    const effectiveCapabilityId = BasicActionCapability.CAPABILITY_ID;
    
    return callCapability({
      capabilityId: effectiveCapabilityId,
      method: "PerformAction",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: effectiveCapabilityId,
          method: "PerformAction",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: effectiveCapabilityId,
          method: "PerformAction",
          mode: this.mode,
        });
      }

      return fromBinary(NodeOutputsSchema, capabilityResponse.response.value.value);
    });
  }
}
