import { fromJson } from "@bufbuild/protobuf";
import { type NodeRuntime } from "@cre/sdk/runtime";
import {
  RequestSchema,
  ResponseSchema,
  type Request,
  type RequestJson,
  type Response,
} from "@cre/generated/capabilities/networking/http/v1alpha/client_pb";

/**
 * Client Capability
 *
 * Capability ID: http-actions@1.0.0-alpha
 * Capability Name: http-actions
 * Capability Version: 1.0.0-alpha
 */
export class ClientCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "http-actions@1.0.0-alpha";

  static readonly CAPABILITY_NAME = "http-actions";
  static readonly CAPABILITY_VERSION = "1.0.0-alpha";

  constructor() {}

  sendRequest(
    runtime: NodeRuntime<any>,
    input: Request | RequestJson
  ): { result: () => Promise<Response> } {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName
      ? (input as Request)
      : fromJson(RequestSchema, input as RequestJson);

    const capabilityId = ClientCapability.CAPABILITY_ID;

    const capabilityResponse = runtime.callCapability<Request, Response>({
      capabilityId,
      method: "SendRequest",
      payload,
      inputSchema: RequestSchema,
      outputSchema: ResponseSchema,
    });

    return {
      result: async () => {
        return capabilityResponse.result();
      },
    };
  }
}
