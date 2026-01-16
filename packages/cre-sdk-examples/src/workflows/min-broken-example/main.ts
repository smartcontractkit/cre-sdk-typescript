import {
	bytesToHex,
	type CronPayload,
	consensusMedianAggregation,
	cre,
	encodeCallMsg,
	getNetwork,
	LAST_FINALIZED_BLOCK_NUMBER,
	ok,
	Runner,
	type Runtime,
	text,
} from "@chainlink/cre-sdk";
import {
	type Address,
	createPublicClient,
	custom,
	decodeFunctionResult,
	encodeFunctionData,
	type Transport,
	type PublicClient as ViemPublicClient,
	zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { z } from "zod";

const IERC20 = [
	{
		inputs: [],
		name: "totalSupply",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

const configSchema = z.object({
	schedule: z.string(),
});

type Config = z.infer<typeof configSchema>;

const CONTRACT_ADDRESS =
	"0x4700A50d858Cb281847ca4Ee0938F80DEfB3F1dd" as Address;

const createHttpTransport = (
	runtime: Runtime<Config>,
	url: string,
): Transport => {
	let requestId = 0;
	return custom({
		async request({ method, params }) {
			requestId++;
			const body = {
				jsonrpc: "2.0",
				id: requestId,
				method: method,
				params,
			};

			const httpClient = new cre.capabilities.HTTPClient();

			const fetcher = (
				sendRequester: Parameters<
					Parameters<typeof httpClient.sendRequest>[1]
				>[0],
				_config: Config,
			) => {
				const bodyString = JSON.stringify(body);
				const bodyBase64 = Buffer.from(bodyString, "utf-8").toString("base64");

				const response = sendRequester
					.sendRequest({
						url,
						method: "POST",
						body: bodyBase64,
						headers: {
							"Content-Type": "application/json",
						},
					} as {
						url: string;
						method: string;
						body: string;
						headers: Record<string, string>;
					})
					.result();

				if (!ok(response)) {
					throw new Error(
						`HTTP request failed with status: ${response.statusCode}`,
					);
				}

				const responseBody: Record<string, unknown> = JSON.parse(
					text(response),
				);

				// Convert hex string result to BigInt for median aggregation
				// viem will handle the conversion when it processes the result
				const resultHex = responseBody.result as string;
				return BigInt(resultHex);
			};

			const result = httpClient
				.sendRequest(
					runtime,
					fetcher,
					consensusMedianAggregation(),
				)(runtime.config)
				.result();

			// Convert BigInt back to hex string, padded to 32 bytes (64 hex chars) for uint256
			const hex = result.toString(16);
			const paddedHex = hex.padStart(64, "0");
			return `0x${paddedHex}`;
		},
	});
};

const createPublicClientWithCRE = (
	runtime: Runtime<Config>,
	rpcUrl: string,
): ViemPublicClient => {
	return createPublicClient({
		chain: sepolia,
		transport: createHttpTransport(runtime, rpcUrl),
	});
};

const getTotalSupply = (runtime: Runtime<Config>): bigint => {
	const network = getNetwork({
		chainFamily: "evm",
		chainSelectorName: "ethereum-testnet-sepolia",
		isTestnet: true,
	}) as NonNullable<ReturnType<typeof getNetwork>>;

	const evmClient = new cre.capabilities.EVMClient(
		network.chainSelector.selector,
	);

	const callData = encodeFunctionData({
		abi: IERC20,
		functionName: "totalSupply",
	});

	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: CONTRACT_ADDRESS,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result();

	return decodeFunctionResult({
		abi: IERC20,
		functionName: "totalSupply",
		data: bytesToHex(contractCall.data),
	});
};

const onCronTrigger = async (
	runtime: Runtime<Config>,
	_payload: CronPayload,
): Promise<string> => {
	const rpcUrl =
		"https://por.bcy-p.metalhosts.com/cre-alpha/MvqtrdftrbxcP3ZgGBJb3bK5/ethereum/sepolia";

	const publicClient = createPublicClientWithCRE(runtime, rpcUrl);

	const viemResultPromise = publicClient
		.readContract({
			address: CONTRACT_ADDRESS,
			abi: IERC20,
			functionName: "totalSupply",
		})
		.then((result) => result + 1n);

	const capabilityResult = getTotalSupply(runtime);

	const viemResult = await viemResultPromise.then((result) => result - 1n);

	return `Viem result: ${viemResult}, Capability result: ${capabilityResult}`;
};

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability();

	return [
		cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
	];
};

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema });
	await runner.run(initWorkflow);
}

await main();
