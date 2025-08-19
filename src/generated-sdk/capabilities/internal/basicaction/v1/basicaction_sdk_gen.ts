import { fromBinary, toBinary, fromJson, create } from "@bufbuild/protobuf";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
import {
  InputsSchema,
  OutputsSchema,
  type InputsJson,
  type Outputs,
} from "@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb";

/**
 * BasicAction Capability
 * 
 * Capability ID: basic-test-action@1.0.0
 * Default Mode: Mode.DON
 */
export class BasicActionCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "basic-test-action@1.0.0";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.DON;


  constructor(
    private readonly mode: Mode = BasicActionCapability.DEFAULT_MODE
  ) {}

  async performAction(input: InputsJson): Promise<Outputs> {
    const payload = {
      typeUrl: getTypeUrl(InputsSchema),
      value: toBinary(InputsSchema, fromJson(InputsSchema, input)),
    };
    
    return callCapability({
      capabilityId: BasicActionCapability.CAPABILITY_ID,
      method: "PerformAction",
      mode: this.mode,
      payload
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId: BasicActionCapability.CAPABILITY_ID,
          method: "PerformAction",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId: BasicActionCapability.CAPABILITY_ID,
          method: "PerformAction",
          mode: this.mode,
        });
      }

      return fromBinary(OutputsSchema, capabilityResponse.response.value.value);
    });
  }
}
