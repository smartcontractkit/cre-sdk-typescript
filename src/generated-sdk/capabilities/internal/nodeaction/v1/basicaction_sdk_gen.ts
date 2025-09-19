import { fromJson } from "@bufbuild/protobuf"
import { type NodeRuntime } from "@cre/sdk/runtime/runtime"
import {
  NodeInputsSchema,
  NodeOutputsSchema,
  type NodeInputs,
  type NodeInputsJson,
  type NodeOutputs,
} from "@cre/generated/capabilities/internal/nodeaction/v1/node_action_pb"

/**
 * BasicAction Capability
 * 
 * Capability ID: basic-test-node-action@1.0.0
 * Capability Name: basic-test-node-action
 * Capability Version: 1.0.0
 */
export class BasicActionCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "basic-test-node-action@1.0.0";

  static readonly CAPABILITY_NAME = "basic-test-node-action";
  static readonly CAPABILITY_VERSION = "1.0.0";


  constructor(
    
  ) {}

  async performAction(runtime: NodeRuntime<any>, input: NodeInputs |  NodeInputsJson): Promise<NodeOutputs> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as NodeInputs : fromJson(NodeInputsSchema, input as NodeInputsJson)
    
    
    const capabilityId = BasicActionCapability.CAPABILITY_ID;
    
    return runtime.callCapability<NodeInputs, NodeOutputs>({
      capabilityId,
      method: "PerformAction",
      payload,
      inputSchema: NodeInputsSchema,
      outputSchema: NodeOutputsSchema
    })
  }
}
