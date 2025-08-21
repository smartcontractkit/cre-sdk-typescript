import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { sendErrorWrapped } from "@cre/sdk/testhelpers/send-error-wrapped";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { create, toJson } from "@bufbuild/protobuf";
import { ConsensusCapability } from "@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen";
import {
  consensusDescriptorIdentical,
  observationError,
} from "@cre/sdk/utils/values/consensus";

import { cre } from "@cre/sdk/cre";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import { getRequest } from "@cre/sdk/utils/get-request";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";

export async function main() {
  console.log(
    `TS workflow: standard test: mode_switch: don_runtime_in_node_mode [${new Date().toISOString()}]`
  );

  const basicTrigger = new BasicTriggerCapability();
  const handler = async () => {
    switchModes(Mode.NODE);

    const consensusInput = create(SimpleConsensusInputsSchema, {
      observation: observationError("cannot use Runtime inside RunInNodeMode"),
      descriptors: consensusDescriptorIdentical,
    });

    try {
      const consensusCapability = new ConsensusCapability();
      await consensusCapability.simple(
        toJson(SimpleConsensusInputsSchema, consensusInput)
      );
    } catch (e) {
      if (e instanceof CapabilityError) {
        sendErrorWrapped(e.message);
      } else {
        throw e;
      }
    }

    switchModes(Mode.DON);
    sendErrorWrapped("cannot use Runtime inside RunInNodeMode");
  };

  try {
    const executeRequest = getRequest();
    await handleExecuteRequest(
      executeRequest,
      [
        cre.handler(
          basicTrigger.trigger({ name: "first-trigger", number: 100 }),
          handler
        ),
      ],
      { config: {} }
    );
  } catch (e) {
    errorBoundary(e);
  }
}

main();
