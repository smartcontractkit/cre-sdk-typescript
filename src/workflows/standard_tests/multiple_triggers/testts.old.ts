import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { getRequest } from "@cre/sdk/utils/get-request";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import type {
  ExecuteRequest,
  ExecutionResult,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import {
  TriggerSubscriptionRequestSchema,
  ExecutionResultSchema,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import {
  ConfigSchema as BasicTriggerConfigSchema,
  OutputsSchema as BasicTriggerOutputsSchema,
} from "@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb";
import {
  ConfigSchema as ActionTriggerConfigSchema,
  TriggerEventSchema as ActionTriggerEventSchema,
} from "@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import { val } from "@cre/sdk/utils/values/value";

// Helpers declared here as its the last file  left using them
export type ExecuteRequestType = "subscribe" | "trigger";

/**
 * Type guard to check if the request is a subscribe request
 */
export const isSubscribeRequest = (
  executeRequest: ExecuteRequest
): executeRequest is ExecuteRequest & { subscribe: any } =>
  executeRequest.request.case === "subscribe";

/**
 * Type guard to check if the request is a trigger request
 */
export const isTriggerRequest = (
  executeRequest: ExecuteRequest
): executeRequest is ExecuteRequest & { trigger: any } =>
  executeRequest.request.case === "trigger";

export const getRequestType = (
  executeRequest: ExecuteRequest
): ExecuteRequestType => {
  if (isSubscribeRequest(executeRequest)) {
    return "subscribe";
  }

  if (isTriggerRequest(executeRequest)) {
    return "trigger";
  }

  throw new Error(
    "Invalid ExecuteRequest: neither subscribe nor trigger is present"
  );
};

// END OF HELPERS

function subscribe() {
  // Create config objects for each capability
  const basicTriggerConfig1 = create(BasicTriggerConfigSchema, {
    name: "first-trigger",
    number: 100,
  });

  const actionTriggerConfig = create(ActionTriggerConfigSchema, {
    name: "second-trigger",
    number: 150,
  });

  const basicTriggerConfig2 = create(BasicTriggerConfigSchema, {
    name: "third-trigger",
    number: 200,
  });

  const payload1 = {
    typeUrl: `type.googleapis.com/${BasicTriggerConfigSchema.typeName}`,
    value: toBinary(BasicTriggerConfigSchema, basicTriggerConfig1),
  };

  const payload2 = {
    typeUrl: `type.googleapis.com/${ActionTriggerConfigSchema.typeName}`,
    value: toBinary(ActionTriggerConfigSchema, actionTriggerConfig),
  };

  const payload3 = {
    typeUrl: `type.googleapis.com/${BasicTriggerConfigSchema.typeName}`,
    value: toBinary(BasicTriggerConfigSchema, basicTriggerConfig2),
  };

  const subscriptionRequest = create(TriggerSubscriptionRequestSchema, {
    subscriptions: [
      {
        id: "basic-test-trigger@1.0.0",
        payload: payload1,
        method: "Trigger",
      },
      {
        id: "basic-test-action-trigger@1.0.0",
        payload: payload2,
        method: "Trigger",
      },
      {
        id: "basic-test-trigger@1.0.0",
        payload: payload3,
        method: "Trigger",
      },
    ],
  });

  const execResult: ExecutionResult = create(ExecutionResultSchema, {
    result: {
      case: "triggerSubscriptions",
      value: subscriptionRequest,
    },
  });

  const encoded = toBinary(ExecutionResultSchema, execResult);

  sendResponse(Buffer.from(encoded).toString("base64"));
}

function trigger(executeRequest: ExecuteRequest) {
  if (!executeRequest.request.value.payload) {
    throw new Error("TS: no payload in trigger");
  }

  try {
    const triggerId = parseInt(executeRequest.request.value.id, 10);
    // Hardcoded ids are matching standard test definition in GO
    switch (triggerId) {
      case 0:
      case 2: {
        const basicTriggerOutputs = fromBinary(
          BasicTriggerOutputsSchema,
          executeRequest.request.value.payload.value
        );

        sendResponseValue(
          val.string(
            `called ${triggerId} with ${basicTriggerOutputs.coolOutput}`
          )
        );
        break;
      }
      case 1: {
        const actionTriggerEvent = fromBinary(
          ActionTriggerEventSchema,
          executeRequest.request.value.payload.value
        );
        sendResponseValue(
          val.string(
            `called ${triggerId} with ${actionTriggerEvent.coolOutput}`
          )
        );
        break;
      }
      default:
        throw new Error(`TS: unknown trigger id: ${triggerId}`);
    }
  } catch (e) {
    errorBoundary(e);
  }
}

export async function main() {
  console.log(
    `TS workflow: standard test: multiple_triggers [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  try {
    const executeRequest = getRequest();
    const requestType = getRequestType(executeRequest);

    switch (requestType) {
      case "subscribe":
        subscribe();
        break;
      case "trigger":
        trigger(executeRequest);
        break;
      default:
        throw new Error(`Unknown request type: ${requestType}`);
    }

    console.log("TS - MULTIPLE TRIGGERS DONE");
  } catch (e) {
    errorBoundary(e);
  }
}

main();
