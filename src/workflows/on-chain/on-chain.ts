import { z } from 'zod'
import { cre } from '@cre/sdk/cre'
import { sendResponseValue } from '@cre/sdk/utils/send-response-value'
import { Value, consensusMedianAggregation } from '@cre/sdk/utils'
import { encodeFunctionData, decodeFunctionResult, zeroAddress } from 'viem'
import { bytesToHex } from '@cre/sdk/utils/hex-utils'
import type { NodeRuntime, Runtime } from '@cre/sdk/runtime/runtime'
import { hexToBase64 } from '@cre/sdk/utils/hex-utils'
import { withErrorBoundary } from '@cre/sdk/utils/error-boundary'

// TODO: In production, load ABI from external file or contract metadata
import { STORAGE_ABI } from './abi'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
	evms: z.array(
		z.object({
			storageAddress: z.string(),
			chainSelector: z.string(),
		}),
	),
})

type Config = z.infer<typeof configSchema>

async function fetchMathResult(nodeRuntime: NodeRuntime, config: Config): Promise<number> {
	const response = await cre.utils.fetch({
		url: config.apiUrl,
	})
	return Number.parseFloat(response.body.trim())
}

const onCronTrigger = async (config: Config, runtime: Runtime): Promise<void> => {
	if (!config.evms?.length) {
		throw new Error('No EVM configuration provided')
	}

	// Step 1: Fetch offchain data using consensus (from Part 2)
	const offchainValue = await cre.runInNodeMode(
		fetchMathResult,
		consensusMedianAggregation(),
	)(config)

	runtime.logger.log(`Successfully fetched offchain value: ${offchainValue}`)

	// Get the first EVM configuration from the list
	const evmConfig = config.evms[0]

	// Step 2: Read onchain data using the EVM client with chainSelector
	const evmClient = new cre.capabilities.EVMClient(
		undefined, // use default mode
		BigInt(evmConfig.chainSelector), // pass chainSelector as BigInt
	)

	// Encode the contract call data for the 'get' function
	const callData = encodeFunctionData({
		abi: STORAGE_ABI,
		functionName: 'get',
	})

	const contractCall = await evmClient.callContract({
		call: {
			from: hexToBase64(zeroAddress),
			to: hexToBase64(evmConfig.storageAddress),
			data: hexToBase64(callData),
		},
		blockNumber: {
			absVal: Buffer.from([3]).toString('base64'), // 3 for finalized block
			sign: '-1', // negative for finalized
		},
	})

	// Decode the result
	const onchainValue = decodeFunctionResult({
		abi: STORAGE_ABI,
		functionName: 'get',
		data: bytesToHex(contractCall.data),
	})

	runtime.logger.log(`Successfully read onchain value: ${onchainValue.toString()}`)

	// Step 3: Combine the results - convert offchain float to bigint and add
	const offchainBigInt = BigInt(Math.floor(offchainValue))
	const finalResult = onchainValue + offchainBigInt

	sendResponseValue(
		Value.from({
			FinalResult: finalResult,
		}),
	)
}

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability()

	return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await cre.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}

withErrorBoundary(main)
