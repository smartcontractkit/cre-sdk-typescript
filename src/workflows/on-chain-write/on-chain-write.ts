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
import {
  encodeFunctionData,
  decodeFunctionResult,
  type Hex,
  toHex,
  encodeAbiParameters,
} from "viem";
import { bytesToHex } from "@cre/sdk/utils/hex-utils";
import { CALCULATOR_CONSUMER_ABI, STORAGE_ABI } from "./abi";
import type { Runtime } from "@cre/sdk/workflow";
import { capability } from "@cre/generated/tools/generator/v1alpha/cre_metadata_pb";
// Storage contract ABI - we only need the 'get' function
// TODO: In production, load ABI from external file or contract metadata
// following Go SDK patterns for ABI management

// Config struct defines the parameters that can be passed to the workflow
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
  evms: z.array(
    z.object({
      storageAddress: z.string(),
      calculatorConsumerAddress: z.string(),
      chainSelector: z.number(),
      gasLimit: z.number(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

// // updateCalculatorResult handles the logic for writing data to the CalculatorConsumer contract.
// func updateCalculatorResult(env *sdk.Environment[*Config], runtime sdk.Runtime, evmConfig EvmConfig, offchainValue *big.Int, onchainValue *big.Int, finalResult *big.Int) (string, error) {
// 	env.Logger.Info("Updating calculator result", "consumerAddress", evmConfig.CalculatorConsumerAddress)
// ​
// 	evmClient := &evm.Client{
// 		ChainSelector: evmConfig.ChainSelector,
// 	}
// ​
// 	// Create a contract binding instance pointed at the CalculatorConsumer address.
// 	consumerContract, err := calculator_consumer.NewCalculatorConsumer(evmClient, common.HexToAddress(evmConfig.CalculatorConsumerAddress).Bytes(), nil)
// 	if err != nil {
// 		return "", fmt.Errorf("failed to create consumer contract instance: %w", err)
// 	}
// ​
// 	gasConfig := &evm.GasConfig{
// 		GasLimit: evmConfig.GasLimit,
// 	}
// ​
// 	env.Logger.Info("Writing report to consumer contract", "offchainValue", offchainValue, "onchainValue", onchainValue, "finalResult", finalResult)
// 	// Call the `WriteReport` method on the binding. This sends a secure report to the consumer.
// 	writeReportPromise, err := consumerContract.WriteReportCalculatorConsumerCalculatorResult(runtime, calculator_consumer.CalculatorConsumerCalculatorResult{
// 		OffchainValue: offchainValue,
// 		OnchainValue:  onchainValue,
// 		FinalResult:   finalResult,
// 	}, gasConfig)
// ​
// 	if err != nil {
// 		env.Logger.Error("WriteReport failed", "error", err)
// 		return "", fmt.Errorf("failed to write report: %w", err)
// 	}
// ​
// 	env.Logger.Info("Waiting for write report response")
// 	resp, err := writeReportPromise.Await()
// 	if err != nil {
// 		env.Logger.Error("WriteReport await failed", "error", err)
// 		return "", fmt.Errorf("failed to await write report: %w", err)
// 	}
// 	env.Logger.Info("Write report to consumer succeeded", "response", resp)
// 	txHash := fmt.Sprintf("0x%x", resp.TxHash)
// 	env.Logger.Info("Write report transaction succeeded", "txHash", txHash)
// 	return txHash, nil
// }

async function updateCalculatorResult(
  env: Environment<Config>,
  evmConfig: Config["evms"][number],
  offchainValue: bigint,
  onchainValue: bigint,
  finalResult: bigint
) {
  const evmClient = new cre.capabilities.EVMClient(
    undefined, // use default mode
    BigInt(evmConfig.chainSelector) // pass chainSelector as BigInt
  );

  // Encode the contract call data for the 'onReport' function
  const callData2 = encodeFunctionData({
    abi: CALCULATOR_CONSUMER_ABI,
    functionName: "isResultAnomalous",
    args: [
      {
        offchainValue: offchainValue,
        onchainValue: onchainValue,
        finalResult: finalResult,
      },
    ],
  });

  // Encode the contract call data for the 'get' function
  const callData = encodeFunctionData({
    abi: CALCULATOR_CONSUMER_ABI,
    functionName: "onReport",
    // The `metadata` (first) parameter is unused here but is required by the IReceiver interface.
    args: [toHex("0x"), callData2],
  });

  // dry run the call to ensure the value is not anomalous
  const dryRunCall = await evmClient.callContract({
    call: {
      from: "0x0000000000000000000000000000000000000000", // zero address for view calls
      to: evmConfig.calculatorConsumerAddress,
      data: callData,
    },
    blockNumber: {
      absVal: "03", // 3 for finalized block
      sign: "-1", // negative
    },
  });

  const resp = await evmClient.writeReport({
    receiver: evmConfig.calculatorConsumerAddress,
    report: {
      rawReport: callData,
    },
  });

  return resp.txHash;
}

// onCronTrigger is the callback function that gets executed when the cron trigger fires
const onCronTrigger = async (env: Environment<Config>): Promise<void> => {
  env.logger?.log("Hello, Calculator! Workflow triggered.");

  if (!env.config?.evms || env.config.evms.length === 0) {
    throw new Error("No EVM configuration provided");
  }

  // Step 1: Fetch offchain data using consensus (from Part 2)
  const offchainValue = await runInNodeMode(async () => {
    const http = new cre.capabilities.HTTPClient();
    const resp = await http.sendRequest({
      url: env.config?.apiUrl,
      method: "GET",
    });

    const bodyStr = new TextDecoder().decode(resp.body);
    const num = Number.parseFloat(bodyStr.trim());

    return create(SimpleConsensusInputsSchema, {
      observation: observationValue(val.float64(num)),
      descriptors: consensusDescriptorMedian,
    });
  });

  env.logger?.log("Successfully fetched offchain value");

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
  env.logger?.log("Successfully read onchain value");

  // Step 3: Combine the results - convert offchain float to bigint and add
  const offchainFloat =
    offchainValue.value.case === "float64Value" ? offchainValue.value.value : 0;

  const offchainBigInt = BigInt(Math.floor(offchainFloat));
  const finalResult = onchainValue + offchainBigInt;

  env.logger?.log("Final calculated result");

  // Step 4: Write to the calculator consumer
  const writeData = encodeFunctionData({
    abi: CALCULATOR_CONSUMER_ABI,
    functionName: "onReport",
    args: [toHex(finalResult), toHex(finalResult)],
  });

  const txHash = await updateCalculatorResult(
    env,
    evmConfig,
    offchainBigInt,
    onchainValue,
    finalResult
  );

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
