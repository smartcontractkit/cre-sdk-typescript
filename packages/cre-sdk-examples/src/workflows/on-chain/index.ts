import {
  bytesToHex,
  consensusMedianAggregation,
  cre,
  hexToBase64,
  type NodeRuntime,
  Runner,
  type Runtime,
  getNetwork,
} from "@chainlink/cre-sdk";
import { decodeFunctionResult, encodeFunctionData, zeroAddress } from "viem";
import { z } from "zod";

import { STORAGE_ABI } from "./abi";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
  evms: z.array(
    z.object({
      storageAddress: z.string(),
      chainSelectorName: z.string(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

async function fetchMathResult(
  nodeRuntime: NodeRuntime<Config>
): Promise<number> {
  const httpCapability = new cre.capabilities.HTTPClient();
  const response = httpCapability
    .sendRequest(nodeRuntime, {
      url: nodeRuntime.config.apiUrl,
    })
    .result();
  return Number.parseFloat(Buffer.from(response.body).toString("utf-8").trim());
}

const onCronTrigger = async (runtime: Runtime<Config>): Promise<bigint> => {
  // Step 1: Fetch offchain data using consensus (from Part 2)
  const offchainValue = await runtime.runInNodeMode(
    fetchMathResult,
    consensusMedianAggregation()
  )();

  runtime.log(`Successfully fetched offchain value: ${offchainValue}`);

  // Get the first EVM configuration from the list
  const evmConfig = runtime.config.evms[0];
  const network = getNetwork({
    chainSelectorName: evmConfig.chainSelectorName,
  });

  if (!network) {
    throw new Error(
      `Network not found for chain selector name: ${evmConfig.chainSelectorName}`
    );
  }

  // Step 2: Read onchain data using the EVM client with chainSelector
  const evmClient = new cre.capabilities.EVMClient(
    BigInt(network.chainSelector.selector)
  );

  // Encode the contract call data for the 'get' function
  const callData = encodeFunctionData({
    abi: STORAGE_ABI,
    functionName: "get",
  });

  const contractCall = evmClient
    .callContract(runtime, {
      call: {
        from: hexToBase64(zeroAddress),
        to: hexToBase64(evmConfig.storageAddress),
        data: hexToBase64(callData),
      },
      blockNumber: {
        absVal: Buffer.from([3]).toString("base64"), // 3 for finalized block
        sign: "-1", // negative for finalized
      },
    })
    .result();

  // Decode the result
  const onchainValue = decodeFunctionResult({
    abi: STORAGE_ABI,
    functionName: "get",
    data: bytesToHex(contractCall.data),
  });

  runtime.log(`Successfully read onchain value: ${onchainValue.toString()}`);

  // Step 3: Combine the results - convert offchain float to bigint and add
  const offchainBigInt = BigInt(Math.floor(offchainValue));
  return onchainValue + offchainBigInt;
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configSchema,
  });
  await runner.run(initWorkflow);
}

main();
