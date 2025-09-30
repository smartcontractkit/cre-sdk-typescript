import {
  type CronPayload,
  median,
  ConsensusAggregationByFields,
  cre,
  getNetwork,
  type EVMLog,
  type HTTPPayload,
  Runner,
  type Runtime,
  type HTTPSendRequester,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk";
import { decodeFunctionResult, encodeFunctionData, zeroAddress } from "viem";
import { z } from "zod";
import {
  BALANCE_READER_ABI,
  IERC20_ABI,
  MESSAGE_EMITTER_ABI,
  RESERVE_MANAGER_ABI,
} from "./abi";

const configSchema = z.object({
  schedule: z.string(),
  url: z.string(),
  evms: z.array(
    z.object({
      tokenAddress: z.string(),
      porAddress: z.string(),
      proxyAddress: z.string(),
      balanceReaderAddress: z.string(),
      messageEmitterAddress: z.string(),
      chainSelectorName: z.string(),
      gasLimit: z.string(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

interface PORResponse {
  accountName: string;
  totalTrust: number;
  totalToken: number;
  ripcord: boolean;
  updatedAt: string;
}

interface ReserveInfo {
  lastUpdated: Date;
  totalReserve: number;
}

// Utility function to safely stringify objects with bigints
const safeJsonStringify = (obj: any): string =>
  JSON.stringify(
    obj,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );

const fetchReserveInfo = (
  sendRequester: HTTPSendRequester,
  config: Config
): ReserveInfo => {
  const response = sendRequester.sendRequest({ url: config.url }).result();

  if (response.statusCode !== 200) {
    throw new Error(`HTTP request failed with status: ${response.statusCode}`);
  }

  const responseText = Buffer.from(response.body).toString("utf-8");
  const porResp: PORResponse = JSON.parse(responseText);

  if (porResp.ripcord) {
    throw new Error("ripcord is true");
  }

  return {
    lastUpdated: new Date(porResp.updatedAt),
    totalReserve: porResp.totalToken
  };
};

const fetchNativeTokenBalance = (
  runtime: Runtime<Config>,
  evmConfig: Config["evms"][0],
  tokenHolderAddress: string
): bigint => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(
      `Network not found for chain selector name: ${evmConfig.chainSelectorName}`
    );
  }

  const evmClient = new cre.capabilities.EVMClient(
    network.chainSelector.selector
  );

  // Encode the contract call data for getNativeBalances
  const callData = encodeFunctionData({
    abi: BALANCE_READER_ABI,
    functionName: "getNativeBalances",
    args: [[tokenHolderAddress as `0x${string}`]],
  });

  const contractCall = evmClient
    .callContract(runtime, {
      call: {
        from: hexToBase64(zeroAddress),
        to: hexToBase64(evmConfig.balanceReaderAddress),
        data: hexToBase64(callData),
      },
      blockNumber: {
        absVal: Buffer.from([3]).toString("base64"), // 3 for finalized block
        sign: "-1", // negative for finalized
      },
    })
    .result();

  // Decode the result
  const balances = decodeFunctionResult({
    abi: BALANCE_READER_ABI,
    functionName: "getNativeBalances",
    data: bytesToHex(contractCall.data),
  });

  if (!balances || balances.length === 0) {
    throw new Error("No balances returned from contract");
  }

  return balances[0];
};

const getTotalSupply = (runtime: Runtime<Config>): bigint => {
  const evms = runtime.config.evms;
  let totalSupply = 0n;

  for (const evmConfig of evms) {
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });

    if (!network) {
      throw new Error(
        `Network not found for chain selector name: ${evmConfig.chainSelectorName}`
      );
    }

    const evmClient = new cre.capabilities.EVMClient(
      network.chainSelector.selector
    );

    // Encode the contract call data for totalSupply
    const callData = encodeFunctionData({
      abi: IERC20_ABI,
      functionName: "totalSupply",
    });

    const contractCall = evmClient
      .callContract(runtime, {
        call: {
          from: hexToBase64(zeroAddress),
          to: hexToBase64(evmConfig.tokenAddress),
          data: hexToBase64(callData),
        },
        blockNumber: {
          absVal: Buffer.from([3]).toString("base64"), // 3 for finalized block
          sign: "-1", // negative for finalized
        },
      })
      .result();

    // Decode the result
    const supply = decodeFunctionResult({
      abi: IERC20_ABI,
      functionName: "totalSupply",
      data: bytesToHex(contractCall.data),
    });

    totalSupply += supply;
  }

  return totalSupply;
};

const updateReserves = (
  runtime: Runtime<Config>,
  totalSupply: bigint,
  totalReserveScaled: bigint
): string => {
  const evmConfig = runtime.config.evms[0];
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(
      `Network not found for chain selector name: ${evmConfig.chainSelectorName}`
    );
  }

  const evmClient = new cre.capabilities.EVMClient(
    network.chainSelector.selector
  );

  runtime.log(
    `Updating reserves totalSupply ${totalSupply.toString()} totalReserveScaled ${totalReserveScaled.toString()}`
  );

  // Encode the contract call data for writeReportFromUpdateReserves
  const callData = encodeFunctionData({
    abi: RESERVE_MANAGER_ABI,
    functionName: "writeReportFromUpdateReserves",
    args: [
      {
        totalMinted: totalSupply,
        totalReserve: totalReserveScaled,
      },
    ],
  });

  const resp = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.proxyAddress,
      report: {
        rawReport: callData,
      },
    })
    .result();

  // TODO: Why does the writeReport fail with an "execution reverted" error?
  const txHash = resp.txHash || Uint8Array.from('0x000000000000000000000000000000')

  if (!txHash) {
    throw new Error(`Failed to write report: ${resp.errorMessage}`)
  }

  runtime.log(
    `Write report transaction succeeded at txHash: ${bytesToHex(txHash)}`
  );
  return txHash.toString()
};

const doPOR = (runtime: Runtime<Config>): string => {
  runtime.log(`fetching por url ${runtime.config.url}`);

  const httpCapability = new cre.capabilities.HTTPClient();
  const reserveInfo = httpCapability
    .sendRequest(
      runtime,
      fetchReserveInfo,
      ConsensusAggregationByFields<ReserveInfo>({
        lastUpdated: median,
        totalReserve: median,
      })
    )(runtime.config)
    .result();

  runtime.log(`ReserveInfo ${safeJsonStringify(reserveInfo)}`);

  const totalSupply = getTotalSupply(runtime);
  runtime.log(`TotalSupply ${totalSupply.toString()}`);

  const totalReserveScaled = BigInt(reserveInfo.totalReserve * 1e18);
  runtime.log(`TotalReserveScaled ${totalReserveScaled.toString()}`);

  const nativeTokenBalance = fetchNativeTokenBalance(
    runtime,
    runtime.config.evms[0],
    runtime.config.evms[0].tokenAddress
  );
  runtime.log(`NativeTokenBalance ${nativeTokenBalance.toString()}`);

  const secretAddress = runtime.getSecret({ id: "SECRET_ADDRESS" }).result();
  const secretAddressBalance = fetchNativeTokenBalance(
    runtime,
    runtime.config.evms[0],
    secretAddress.value
  );
  runtime.log(`SecretAddressBalance ${secretAddressBalance.toString()}`);

  updateReserves(runtime, totalSupply, totalReserveScaled);

  return reserveInfo.totalReserve.toString();
};

const getLastMessage = (
  runtime: Runtime<Config>,
  evmConfig: Config["evms"][0],
  emitter: string
): string => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(
      `Network not found for chain selector name: ${evmConfig.chainSelectorName}`
    );
  }

  const evmClient = new cre.capabilities.EVMClient(
    network.chainSelector.selector
  );

  // Encode the contract call data for getLastMessage
  const callData = encodeFunctionData({
    abi: MESSAGE_EMITTER_ABI,
    functionName: "getLastMessage",
    args: [emitter as `0x${string}`],
  });

  const contractCall = evmClient
    .callContract(runtime, {
      call: {
        from: hexToBase64(zeroAddress),
        to: hexToBase64(evmConfig.messageEmitterAddress),
        data: hexToBase64(callData),
      },
      blockNumber: {
        absVal: Buffer.from([3]).toString("base64"), // 3 for finalized block
        sign: "-1", // negative for finalized
      },
    })
    .result();

  // Decode the result
  const message = decodeFunctionResult({
    abi: MESSAGE_EMITTER_ABI,
    functionName: "getLastMessage",
    data: bytesToHex(contractCall.data),
  });

  return message;
};

const onCronTrigger = (
  runtime: Runtime<Config>,
  payload: CronPayload
): string => {
  if (!payload.scheduledExecutionTime) {
    throw new Error("Scheduled execution time is required");
  }

  runtime.log('Running CronTrigger');

  return doPOR(runtime);
};

const onLogTrigger = (runtime: Runtime<Config>, payload: EVMLog): string => {
  runtime.log("Running LogTrigger");

  const topics = payload.topics;

  if (topics.length < 3) {
    runtime.log("Log payload does not contain enough topics");
    throw new Error(
      `log payload does not contain enough topics ${topics.length}`
    );
  }

  // topics[1] is a 32-byte topic, but the address is the last 20 bytes
  const emitter = bytesToHex(topics[1].slice(12));
  runtime.log(`Emitter ${emitter}`);

  const message = getLastMessage(runtime, runtime.config.evms[0], emitter);

  runtime.log(`Message retrieved from the contract ${message}`);

  return message;
};

const onHTTPTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload
): string => {
  runtime.log("Raw HTTP trigger received");

  // If there's no input, fall back to "now"
  if (!payload.input || payload.input.length === 0) {
    runtime.log(
      "HTTP trigger payload is empty; defaulting execution time to now"
    );

    return doPOR(runtime);
  }

  	// Log the raw JSON for debugging (human-readable).
	runtime.log(`Payload bytes payloadBytes ${payload.input.toString()}`)

  try {
    runtime.log(`Parsed HTTP trigger received payload ${payload.input.toString()}`);
    return doPOR(runtime);
  } catch (error) {
    runtime.log("Failed to parse HTTP trigger payload");
    throw new Error("Failed to parse HTTP trigger payload");
  }
};

const initWorkflow = (config: Config) => {
  const cronTrigger = new cre.capabilities.CronCapability();
  const httpTrigger = new cre.capabilities.HTTPCapability();
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms[0].chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(
      `Network not found for chain selector name: ${config.evms[0].chainSelectorName}`
    );
  }

  const evmClient = new cre.capabilities.EVMClient(
    network.chainSelector.selector
  );

  return [
    cre.handler(
      cronTrigger.trigger({
        schedule: config.schedule,
      }),
      onCronTrigger
    ),
    cre.handler(
      evmClient.logTrigger({
        addresses: [config.evms[0].messageEmitterAddress],
      }),
      onLogTrigger
    ),
    cre.handler(httpTrigger.trigger({}), onHTTPTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configSchema,
  });
  await runner.run(initWorkflow);
}

main();
