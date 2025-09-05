import {
  AwaitSecretsRequestSchema,
  AwaitSecretsResponseSchema,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import { SecretsError } from "@cre/sdk/utils/secrets-error";

export const awaitAsyncSecret = async (callbackId: number) => {
  // Create proper AwaitSecretsRequest protobuf message
  const awaitSecretRequest = create(AwaitSecretsRequestSchema, {
    ids: [callbackId],
  });

  // Encode to protobuf bytes
  const awaitSecretRequestBytes = toBinary(
    AwaitSecretsRequestSchema,
    awaitSecretRequest
  );

  const response = awaitSecrets(awaitSecretRequestBytes, 1024 * 1024);

  // Convert array of numbers to Uint8Array if needed
  const responseBytes = Array.isArray(response)
    ? new Uint8Array(response)
    : response;

  // Decode as AwaitSecretsResponse first
  const awaitResponse = fromBinary(AwaitSecretsResponseSchema, responseBytes);

  // Get the specific secretId response for our callback ID
  const secretResponses = awaitResponse.responses[callbackId];
  if (!secretResponses || !secretResponses.responses.length) {
    throw new Error(`No response found for callback ID ${callbackId}`);
  }

  const secretResponse = secretResponses.responses[0];

  if (secretResponse.response.case === "secret") {
    return secretResponse.response.value.value;
  }

  if (secretResponse.response.case === "error") {
    throw new SecretsError(secretResponse.response.value.error);
  }

  throw new Error(`No secret found for callback ID ${callbackId}`);
};
