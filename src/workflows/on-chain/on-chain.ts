import { z } from "zod";
import { cre, type Environment } from "@cre/sdk/cre";
import { runInNodeMode } from "@cre/sdk/runtime/run-in-node-mode";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create } from "@bufbuild/protobuf";
import {
  consensusDescriptorMedian,
  observationValue,
} from "@cre/sdk/utils/values/consensus";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { val } from "@cre/sdk/utils/values/value";
import { encodeFunctionData, decodeFunctionResult, type Hex } from "viem";
import { bytesToHex } from "@cre/sdk/utils/hex-utils";
import type { Runtime } from "@cre/sdk/runtime";
import { useMedianConsensus } from "@cre/sdk/utils/values/consensus-hooks";

// Storage contract ABI - we only need the 'get' function
// TODO: In production, load ABI from external file or contract metadata
// following Go SDK patterns for ABI management
const STORAGE_ABI = [
  {
    inputs: [],
    name: "get",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Config struct defines the parameters that can be passed to the workflow
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
  evms: z.array(
    z.object({
      storageAddress: z.string(),
      chainSelector: z.number(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

const fetchMathResult = useMedianConsensus(async (config: Config) => {
  const response = await cre.utils.fetch({
    url: config.apiUrl,
  });
  return Number.parseFloat(response.body.trim());
}, "float64");

// onCronTrigger is the callback function that gets executed when the cron trigger fires
const onCronTrigger = async (
  env: Environment<Config>,
  runtime: Runtime
): Promise<void> => {
  runtime.logger.log("Hello, Calculator! Workflow triggered.");

  if (!env.config.evms?.length) {
    throw new Error("No EVM configuration provided");
  }

  // Step 1: Fetch offchain data using consensus (from Part 2)
  const offchainValue = await fetchMathResult(env.config);

  runtime.logger.log("Successfully fetched offchain value");

  // Get the first EVM configuration from the list
  const evmConfig = env.config.evms[0];

  // Step 2: Read onchain data using the EVM client with chainSelector
  const evmClient = new cre.capabilities.EVMClient(
    undefined, // use default mode
    BigInt(evmConfig.chainSelector) // pass chainSelector as BigInt
  );

  // Encode the contract call data for the 'get' function
  const callData = encodeFunctionData({
    abi: STORAGE_ABI,
    functionName: "get",
  });

  const contractCall = await evmClient.callContract({
    call: {
      from: "0x0000000000000000000000000000000000000000", // zero address for view calls
      to: evmConfig.storageAddress,
      data: callData,
    },
    blockNumber: {
      absVal: "03", // 3 for finalized block
      sign: "-1", // negative
    },
  });

  // Decode the result
  const decodedResult = decodeFunctionResult({
    abi: STORAGE_ABI,
    functionName: "get",
    data: bytesToHex(contractCall.data) as Hex,
  });

  const onchainValue = decodedResult as bigint;
  runtime.logger.log("Successfully read onchain value");

  // Step 3: Combine the results - convert offchain float to bigint and add
  const offchainFloat =
    offchainValue.value.case === "float64Value" ? offchainValue.value.value : 0;

  const offchainBigInt = BigInt(Math.floor(offchainFloat));
  const finalResult = onchainValue + offchainBigInt;

  runtime.logger.log("Final calculated result");

  sendResponseValue(
    val.mapValue({
      FinalResult: val.bigint(finalResult),
    })
  );
};

// InitWorkflow is the required entry point for a CRE workflow
// The runner calls this function to initialize the workflow and register its handlers
const initWorkflow = (env: Environment<Config>) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(
      // Use the schedule from our config file
      cron.trigger({ schedule: env.config?.schedule }),
      onCronTrigger
    ),
  ];
};

// main is the entry point for the workflow
export async function main() {
  try {
    const runner = await cre.newRunner<Config>({
      configSchema: configSchema,
    });
    await runner.run(initWorkflow);
  } catch (error) {
    console.log("error", JSON.stringify(error, null, 2));
  }
}

main();
