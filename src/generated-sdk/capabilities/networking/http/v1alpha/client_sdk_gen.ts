import { fromBinary, toBinary, fromJson, create } from "@bufbuild/protobuf";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
import {
  RequestSchema,
  ResponseSchema,
  type RequestJson,
  type Response,
} from "@cre/generated/capabilities/networking/http/v1alpha/client_pb";

/**
 * Client Capability
 * 
 * Capability ID: http-actions@1.0.0-alpha
 * Default Mode: Mode.NODE
 * Capability Name: http-actions
 * Capability Version: 1.0.0-alpha
 */
export class ClientCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "http-actions@1.0.0-alpha";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.NODE;

  static readonly CAPABILITY_NAME = "http-actions";
  static readonly CAPABILITY_VERSION = "1.0.0-alpha";


  constructor(
    private readonly mode: Mode = ClientCapability.DEFAULT_MODE
  ) {}

  async sendRequest(input: RequestJson): Promise<Response> {
    const payload = {
      typeUrl: getTypeUrl(RequestSchema),
      value: toBinary(RequestSchema, fromJson(RequestSchema, input)),
    };
    const capabilityId = ClientCapability.CAPABILITY_ID;
    
    return callCapability({
      capabilityId,
      method: "SendRequest",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId,
          method: "SendRequest",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId,
          method: "SendRequest",
          mode: this.mode,
        });
      }

      return fromBinary(ResponseSchema, capabilityResponse.response.value.value);
    });
  }
}
