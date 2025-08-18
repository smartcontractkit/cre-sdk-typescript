import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { AggregationType, Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { Rand } from "@cre/sdk/utils/random";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { create, toJson } from "@bufbuild/protobuf";
import { BasicActionCapability as NodeActionCapability } from "@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen";
import { ConsensusCapability } from "@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen";
import { val } from "@cre/sdk/utils/values/value";
import {
  consensusFieldsFrom,
  observationValue,
} from "@cre/sdk/utils/values/consensus";

export async function main() {
  console.log(
    `TS workflow: standard test: random [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  try {
    const donModeNumber = Mode.DON;
    const donSeed = BigInt(randomSeed(donModeNumber));
    const donRandomNumber = new Rand(donSeed);
    let total = donRandomNumber.Uint64();

    switchModes(Mode.NODE);

    const nodeModeNumber = Mode.NODE;
    const nodeSeed = BigInt(randomSeed(nodeModeNumber));
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
      descriptors: consensusFieldsFrom({ OutputThing: AggregationType.MEDIAN }),
      default: val.mapValue({
        OutputThing: val.int64(123),
      }),
    });

    const consensusCapability = new ConsensusCapability();
    await consensusCapability.simple(
      toJson(SimpleConsensusInputsSchema, consensusInput)
    );

    switchModes(Mode.DON);

    total += donRandomNumber.Uint64();

    sendResponseValue(val.bigint(total));
  } catch (e) {
    errorBoundary(e);
  }
}

main();
