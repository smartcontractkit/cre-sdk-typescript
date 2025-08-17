import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { sendErrorWrapped } from "@cre/sdk/testhelpers/send-error-wrapped";
import { create, toJson } from "@bufbuild/protobuf";
import { ConsensusCapability } from "@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen";
import {
  consensusDescriptorIdentical,
  observationValue,
} from "@cre/sdk/utils/values/consensus";
import { val } from "@cre/sdk/utils/values/value";

export async function main() {
  console.log(
    `TS workflow: standard test: mode_switch: node_runtime_in_don_mode [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  try {
    switchModes(Mode.NODE);

    const consensusInput = create(SimpleConsensusInputsSchema, {
      observation: observationValue(val.string("hi")),
      descriptors: consensusDescriptorIdentical,
    });

    const consensusCapability = new ConsensusCapability();
    await consensusCapability.simple(
      toJson(SimpleConsensusInputsSchema, consensusInput)
    );

    switchModes(Mode.DON);
    sendErrorWrapped("cannot use NodeRuntime outside RunInNodeMode");
  } catch (e) {
    errorBoundary(e);
  }
}

main();
