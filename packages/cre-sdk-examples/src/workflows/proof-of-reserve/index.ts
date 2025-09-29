import { type Timestamp, timestampNow } from "@bufbuild/protobuf/wkt";
import {
  type CronPayload,
  consensusMedianAggregation,
  cre,
  getNetwork,
  type EVMLog,
  type HTTPPayload,
  hexToBytes,
  type NodeRuntime,
  Runner,
  type Runtime,
  Value,
} from "@chainlink/cre-sdk";
import { z } from "zod";

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

async function fetchReserveInfo(nodeRuntime: NodeRuntime<Config>) {
  const httpCapability = new cre.capabilities.HTTPClient();
  const response = httpCapability
    .sendRequest(nodeRuntime, {
      url: nodeRuntime.config.url,
    })
    .result();
  return JSON.parse(Buffer.from(response.body).toString("utf-8").trim());
}

async function fetchNativeTokenBalance(
  runtime: Runtime<Config>,
  tokenHolderAddress: string
) {
  // Get the first EVM configuration from the list
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

  // TODO: Do we need a hexToAddress util?
  const balanceReaderAddress = hexToBytes(evmConfig.balanceReaderAddress);
  // balanceReader, err := balance_reader.NewBalanceReader(evmClient, balanceReaderAddress, nil) TODO: Where do we get a BalanceReader?
  // const balanceReader = new BalanceReader(evmClient, balanceReaderAddress)
  const tokenAddress = hexToBytes(tokenHolderAddress);
  // const balances = balanceReader.getNativeBalances(runtime, {addresses: [tokenAddress]});

  // return balances[0];

  return 0;
}

async function getTotalSupply(runtime: Runtime<Config>) {
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

    // TODO: Do we need hexToAddress util?
    const address = hexToBytes(evmConfig.tokenAddress);
    // const token = ierc20.NewIERC20(evmClient, address) // TODO: How do we do this?
    // const supply = await token.TotalSupply(runtime, big.NewInt(8771643))
    //
    // totalSupply += supply;
  }

  return totalSupply;
}

async function updateReserves(
  runtime: Runtime<Config>,
  totalSupply: bigint,
  totalReserveScaled: bigint
) {
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

  console.log(
    `Updating reserves totalSupply ${totalSupply} totalReserveScaled ${totalReserveScaled}`
  );

  // TODO: How do we generate a ReserveManager?
  // reserveManager, err := reserve_manager.NewReserveManager(evmClient, common.HexToAddress(evmCfg.ProxyAddress), nil)
  // 	resp, err := reserveManager.WriteReportFromUpdateReserves(runtime, reserve_manager.UpdateReserves{
  // 		TotalMinted:  totalSupply,
  // 		TotalReserve: totalReserveScaled,
  // 	}, nil).Await()
}

async function doPOR(runtime: Runtime<Config>, time: Timestamp) {
  console.log(`fetching por url ${runtime.config.url}`);

  const reserveInfo = await runtime.runInNodeMode(
    fetchReserveInfo,
    // consensusAggregationFromTags() // TODO: How do we do this from tags?
    consensusMedianAggregation()
  )();

  console.log(`ReserveInfo ${JSON.stringify(reserveInfo)}`);

  const totalSupply = await getTotalSupply(runtime);

  console.log(`TotalSupply ${totalSupply}`);

  // totalReserveScaled := reserveInfo.TotalReserve.Mul(decimal.NewFromUint64(1e18)).BigInt() // TODO get totalReserve
  const totalReserveScaled = 0n;

  console.log(`TotalReserveScaled ${totalReserveScaled}`);

  const nativeTokenBalance = await fetchNativeTokenBalance(
    runtime,
    runtime.config.evms[0].tokenAddress
  );

  console.log(`NativeTokenBalance ${nativeTokenBalance}`);

  const secretAddress = await runtime
    .getSecret({ id: "SECRET_ADDRESS" })
    .result();
  const secretAddressBalance = await fetchNativeTokenBalance(
    runtime,
    secretAddress.value
  );

  console.log(`SecretAddressBalance ${secretAddressBalance}`);

  updateReserves(runtime, totalSupply, totalReserveScaled);

  // Update reserves
  // if err := updateReserves(config, runtime, totalSupply, totalReserveScaled); err != nil {
  // 	return "", fmt.Errorf("failed to update reserves: %w", err)
  // }

  // return reserveInfo.TotalReserve.String(), nil

  return "TotalReserve 0";
}

function prepareMessageEmitter(runtime: Runtime<Config>) {
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
  const address = hexToBytes(evmConfig.messageEmitterAddress); // TODO: do we need a hexToAddress helper?

  // TODO: Where do we get a MessageEmitter
  // return new MessageEmitter(evmClient, address);
}

async function onCronTrigger(runtime: Runtime<Config>, payload: CronPayload) {
  if (!payload.scheduledExecutionTime) {
    throw new Error("Scheduled execution time is required");
  }

  return doPOR(runtime, payload.scheduledExecutionTime);
}

async function onLogTrigger(runtime: Runtime<Config>, payload: EVMLog) {
  console.log("Running LogTrigger");

  const messageEmitter = prepareMessageEmitter(runtime);
  const topics = payload.topics;

  if (topics.length < 3) {
    console.log("Log payload does not contain enough topics");
    throw new Error(
      `log payload does not contain enough topics ${topics.length}`
    );
  }

  const emitter = topics[1].slice(12);
  console.log(`Emitter ${emitter}`);
  // lastMessageInput := message_emitter.GetLastMessageInput{
  // 	Emitter: common.Address(emitter),
  // }
  // const lastMessageInput = messageEmitter.getLastMessageInput({
  //   emitter: address(emitter); // TODO: Do we need an address helper?
  // });
  // const message = messageEmitter.getLastMessage(runtime, lastMessageInput, 8771643n);
  const message = "FAKE_MESSAGE";

  console.log(`Message retrieved from the contract ${message}`);

  return message;
}

async function onHTTPTrigger(runtime: Runtime<Config>, _payload: HTTPPayload) {
  // TODO: Figure out why this won't run without erroring out
  console.log("Raw HTTP trigger received");

  return "FINISHED HTTP TRIGGER";
}

function initWorkflow(config: Config) {
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
}

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
