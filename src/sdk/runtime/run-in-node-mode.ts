import { toJson } from "@bufbuild/protobuf";
import {
  Mode,
  SimpleConsensusInputsSchema,
  type SimpleConsensusInputs,
  type SimpleConsensusInputsJson,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { ConsensusCapability } from "@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen";
import type { Value } from "@cre/generated/values/v1/values_pb";
import { runtime, type NodeRuntime } from "@cre/sdk/runtime/runtime";

type Inputs = SimpleConsensusInputs | SimpleConsensusInputsJson;

const isMessageInputs = (i: unknown): i is SimpleConsensusInputs => {
  const anyI = i as any;
  return (
    anyI &&
    typeof anyI === "object" &&
    "observation" in anyI &&
    anyI.observation &&
    typeof anyI.observation === "object" &&
    "case" in anyI.observation
  );
};

const isJsonInputs = (i: unknown): i is SimpleConsensusInputsJson => {
  const anyI = i as any;
  if (!anyI || typeof anyI !== "object") return false;
  if (!("observation" in anyI)) return true;
  const obs = anyI.observation;
  if (obs == null) return true;
  return typeof obs === "object" && ("value" in obs || "error" in obs);
};

const toInputsJson = (input: Inputs): SimpleConsensusInputsJson => {
  if (isMessageInputs(input)) {
    return toJson(SimpleConsensusInputsSchema, input);
  }
  if (isJsonInputs(input)) {
    return input;
  }
  throw new Error(
    "runInNodeMode: invalid input shape; expected SimpleConsensusInputs message or SimpleConsensusInputsJson"
  );
};

/**
 * Runs the provided builder inside Node mode and returns the consensus result Value.
 * Ensures mode is switched back to DON even if errors occur.
 */
export const runInNodeMode = async (
  buildConsensusInputs: (nodeRuntime: NodeRuntime) => Promise<Inputs> | Inputs
): Promise<Value> => {
  const nodeRuntime: NodeRuntime = runtime.switchModes(Mode.NODE);
  let consensusInputJson: SimpleConsensusInputsJson;
  try {
    const consensusInput = await buildConsensusInputs(nodeRuntime);
    consensusInputJson = toInputsJson(consensusInput);
  } finally {
    // Always restore DON mode before invoking consensus
    runtime.switchModes(Mode.DON);
  }

  const consensus = new ConsensusCapability();
  // simple() expects JSON per generated client conventions
  const result = await consensus.simple(consensusInputJson);
  return result;
};
