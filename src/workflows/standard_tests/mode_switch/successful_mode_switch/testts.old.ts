import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { AggregationType, Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { ValueSchema } from "@cre/generated/values/v1/values_pb";
import { create, toJson } from "@bufbuild/protobuf";
import { BasicActionCapability } from "@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen";
import { BasicActionCapability as NodeActionCapability } from "@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen";
import { ConsensusCapability } from "@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen";
import {
  consensusFieldsFrom,
  observationValue,
} from "@cre/sdk/utils/values/consensus";
import { val, vJson } from "@cre/sdk/utils/values/value";

export async function main() {
  console.log(
    `TS workflow: standard test: mode_switch: successful_mode_switch [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  try {
    switchModes(Mode.DON);
    // Getting time is required by test case after switching modes
    Date.now();

    const donInput = { inputThing: true };
    const basicActionCapability = new BasicActionCapability();

    const donResponse = await basicActionCapability.performAction(donInput);

    switchModes(Mode.NODE);
    Date.now();

    const nodeInput = { inputThing: true };

    const nodeActionCapability = new NodeActionCapability();
    const nodeResponse = await nodeActionCapability.performAction(nodeInput);

    switchModes(Mode.DON);
    Date.now();

    const consensusInput = create(SimpleConsensusInputsSchema, {
      observation: observationValue(
        val.mapValue({ OutputThing: val.int64(nodeResponse.outputThing) })
      ),
      descriptors: consensusFieldsFrom({
        OutputThing: AggregationType.MEDIAN,
      }),
      default: val.mapValue({
        OutputThing: val.int64(123),
      }),
    });

    const consensusCapability = new ConsensusCapability();
    const consensusOutput = await consensusCapability.simple(
      toJson(SimpleConsensusInputsSchema, consensusInput)
    );

    const outputJson = toJson(ValueSchema, consensusOutput);

    sendResponseValue(
      val.string(
        `${donResponse.adaptedThing}${vJson.getFromMap(
          outputJson,
          "OutputThing",
          "int64Value"
        )}`
      )
    );
  } catch (e) {
    errorBoundary(e);
  }
}

main();
