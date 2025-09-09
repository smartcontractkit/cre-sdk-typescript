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
import { type NodeRuntime } from "@cre/sdk/runtime/runtime";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { cre, type Runtime } from "@cre/sdk/cre";

// Doesn't matter for this test
type Config = any;

const handler = async (_config: Config, runtime: Runtime) => {
  runtime.now();

  const donInput = { inputThing: true };
  const basicActionCapability = new BasicActionCapability();
  const donResponse = await basicActionCapability.performAction(donInput);

  const consensusOutput = await cre.runInNodeMode(
    async (nodeRuntime: NodeRuntime) => {
      nodeRuntime.now();
      const nodeActionCapability = new NodeActionCapability();
      const nodeResponse = await nodeActionCapability.performAction({
        inputThing: true,
      });

      return create(SimpleConsensusInputsSchema, {
        observation: observationValue(
          cre.utils.val.mapValue({
            OutputThing: cre.utils.val.int64(nodeResponse.outputThing),
          })
        ),
        descriptors: consensusFieldsFrom({
          OutputThing: AggregationType.MEDIAN,
        }),
        default: cre.utils.val.mapValue({
          OutputThing: cre.utils.val.int64(123),
        }),
      });
    }
  );

  runtime.now();
  const outputJson = toJson(ValueSchema, consensusOutput);

  cre.sendResponseValue(
    cre.utils.val.string(
      `${donResponse.adaptedThing}${outputJson?.mapValue?.fields?.OutputThing?.int64Value}`
    )
  );
};

const initWorkflow = () => {
  const basicTrigger = new BasicTriggerCapability();

  return [cre.handler(basicTrigger.trigger({}), handler)];
};

export async function main() {
  console.log(
    `TS workflow: standard test: mode_switch: successful_mode_switch [${new Date().toISOString()}]`
  );

  const runner = await cre.newRunner();
  await runner.run(initWorkflow);
}

cre.withErrorBoundary(main);
