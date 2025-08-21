import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { AggregationType, Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { Rand } from "@cre/sdk/utils/random";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { create } from "@bufbuild/protobuf";
import { BasicActionCapability as NodeActionCapability } from "@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen";
import { val } from "@cre/sdk/utils/values/value";
import { cre } from "@cre/sdk/cre";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import { getRequest } from "@cre/sdk/utils/get-request";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import {
  consensusFieldsFrom,
  observationValue,
} from "@cre/sdk/utils/values/consensus";
import { runInNodeMode } from "@cre/sdk/runtime/run-in-node-mode";

export async function main() {
  console.log(
    `TS workflow: standard test: random [${new Date().toISOString()}]`
  );

  const basicTrigger = new BasicTriggerCapability();
  const handler = async () => {
    const donSeed = BigInt(randomSeed(Mode.DON));
    const donRandomNumber = new Rand(donSeed);
    let total = donRandomNumber.Uint64();

    await runInNodeMode(async () => {
      const nodeSeed = BigInt(randomSeed(Mode.NODE));
      const nodeRandomNumber = new Rand(nodeSeed);

      const nodeActionCapability = new NodeActionCapability();
      const nodeResponse = await nodeActionCapability.performAction({
        inputThing: true,
      });

      if (nodeResponse.outputThing < 100) {
        log("***" + nodeRandomNumber.Uint64().toString());
      }

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

      // runInNodeMode accepts message or JSON; pass message for clarity
      return consensusInput;
    });

    total += donRandomNumber.Uint64();

    sendResponseValue(val.bigint(total));
  };

  const workflow = [
    cre.handler(
      basicTrigger.trigger({ name: "first-trigger", number: 100 }),
      handler
    ),
  ];

  try {
    const executeRequest = getRequest();
    await handleExecuteRequest(executeRequest, workflow, { config: {} });
  } catch (e) {
    errorBoundary(e);
  }
}

main();
