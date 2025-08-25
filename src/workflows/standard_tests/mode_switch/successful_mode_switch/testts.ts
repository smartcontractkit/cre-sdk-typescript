import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { AggregationType, Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { ValueSchema } from "@cre/generated/values/v1/values_pb";
import { create, toJson } from "@bufbuild/protobuf";
import { BasicActionCapability } from "@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen";
import { BasicActionCapability as NodeActionCapability } from "@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen";
import {
  consensusFieldsFrom,
  observationValue,
} from "@cre/sdk/utils/values/consensus";
import { val, vJson } from "@cre/sdk/utils/values/value";
import { cre } from "@cre/sdk/cre";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import { getRequest } from "@cre/sdk/utils/get-request";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { runInNodeMode } from "@cre/sdk/runtime/run-in-node-mode";
import { basicRuntime, emptyEnv } from "@cre/sdk/testhelpers/mocks";

export async function main() {
  console.log(
    `TS workflow: standard test: mode_switch: successful_mode_switch [${new Date().toISOString()}]`
  );

  const basicTrigger = new BasicTriggerCapability();
  const handler = async () => {
    switchModes(Mode.DON);
    Date.now();

    const donInput = { inputThing: true };
    const basicActionCapability = new BasicActionCapability();
    const donResponse = await basicActionCapability.performAction(donInput);

    const consensusOutput = await runInNodeMode(async () => {
      Date.now();
      const nodeActionCapability = new NodeActionCapability();
      const nodeResponse = await nodeActionCapability.performAction({
        inputThing: true,
      });
      const consensusInput = create(SimpleConsensusInputsSchema, {
        observation: observationValue(
          val.mapValue({ OutputThing: val.int64(nodeResponse.outputThing) })
        ),
        descriptors: consensusFieldsFrom({
          OutputThing: AggregationType.MEDIAN,
        }),
        default: val.mapValue({ OutputThing: val.int64(123) }),
      });
      return consensusInput;
    });

    Date.now();
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
      emptyEnv,
      basicRuntime
    );
  } catch (e) {
    errorBoundary(e);
  }
}

main();
