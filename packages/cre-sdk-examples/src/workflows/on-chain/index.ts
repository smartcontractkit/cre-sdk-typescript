import {
	bytesToHex,
	consensusMedianAggregation,
	cre,
	encodeCallMsg,
	getNetwork,
	type HTTPSendRequester,
	isChainSelectorSupported,
	LAST_FINALIZED_BLOCK_NUMBER,
	ok,
	Runner,
	type Runtime,
	text,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress } from 'viem'
import { z } from 'zod'

import { STORAGE_ABI } from './abi'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
	evms: z.array(
		z.object({
			storageAddress: z.string(),
			chainSelectorName: z.string(),
		}),
	),
})

type Config = z.infer<typeof configSchema>

const fetchMathResult = (sendRequester: HTTPSendRequester, config: Config) => {
	const response = sendRequester.sendRequest({ url: config.apiUrl, method: 'GET' }).result()

	// Check if the response is successful using the helper function
	if (!ok(response)) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	// Convert response body to text using the helper function
	const responseText = text(response)
	return Number.parseFloat(responseText)
}

const onCronTrigger = (runtime: Runtime<Config>) => {
	const httpCapability = new cre.capabilities.HTTPClient()
	const offchainValue = httpCapability
		.sendRequest(
			runtime,
			fetchMathResult,
			consensusMedianAggregation(),
		)(runtime.config)
		.result()

	runtime.log(`Successfully fetched offchain value: ${offchainValue}`)

	// Get the first EVM configuration from the list
	const evmConfig = runtime.config.evms[0]

	// Make sure we try to run on supported chain
	if (!isChainSelectorSupported(evmConfig.chainSelectorName)) {
		throw new Error(`Chain selector name: ${evmConfig.chainSelectorName} is not supported.`)
	}

	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
	}

	// Step 2: Read onchain data using the EVM client with chainSelector
	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	// Encode the contract call data for the 'get' function
	const callData = encodeFunctionData({
		abi: STORAGE_ABI,
		functionName: 'get',
	})

	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.storageAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	// Decode the result
	const onchainValue = decodeFunctionResult({
		abi: STORAGE_ABI,
		functionName: 'get',
		data: bytesToHex(contractCall.data),
	})

	runtime.log(`Successfully read onchain value: ${onchainValue.toString()}`)

	// Step 3: Combine the results - convert offchain float to bigint and add
	const offchainBigInt = BigInt(Math.floor(offchainValue))
	return onchainValue + offchainBigInt
}

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability()

	return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}
