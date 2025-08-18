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

export async function main() {
  console.log(
    `TS workflow: standard test: mode_switch: don_runtime_in_node_mode [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  try {
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
  } catch (e) {
    errorBoundary(e);
  }
}

main();
