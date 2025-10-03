import {
	bytesToHex,
	consensusMedianAggregation,
	cre,
	encodeCallMsg,
	getNetwork,
	type HTTPSendRequester,
	hexToBase64,
	LAST_FINALIZED_BLOCK_NUMBER,
	ok,
	Runner,
	type Runtime,
	text,
	TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, toHex, zeroAddress } from 'viem'
import { z } from 'zod'
import { CALCULATOR_CONSUMER_ABI, STORAGE_ABI } from './abi'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
	evms: z.array(
		z.object({
			storageAddress: z.string(),
			calculatorConsumerAddress: z.string(),
			chainSelectorName: z.string(),
			gasLimit: z.string(),
		}),
	),
})

type Config = z.infer<typeof configSchema>

const fetchMathResult = (sendRequester: HTTPSendRequester, config: Config) => {
	const response = sendRequester.sendRequest({ url: config.apiUrl }).result()

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

	runtime.log('Successfully fetched offchain value')

	// Get the first EVM configuration from the list
	const evmConfig = runtime.config.evms[0]
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
	const finalResult = onchainValue + offchainBigInt

	runtime.log('Final calculated result')

	runtime.log('Updating calculator result...')

	// Encode the contract call data for the 'onReport' function
	const dryRunCallData = encodeFunctionData({
		abi: CALCULATOR_CONSUMER_ABI,
		functionName: 'isResultAnomalous',
		args: [
			{
				offchainValue: offchainBigInt,
				onchainValue: onchainValue,
				finalResult: finalResult,
			},
		],
	})

	runtime.log('Dry running call to ensure the value is not anomalous...')

	// dry run the call to ensure the value is not anomalous
	const dryRunCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.calculatorConsumerAddress as Address,
				data: dryRunCallData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const dryRunResponse = decodeFunctionResult({
		abi: CALCULATOR_CONSUMER_ABI,
		functionName: 'isResultAnomalous',
		data: bytesToHex(dryRunCall.data),
	})

	runtime.log(`Dry run response: ${dryRunResponse ? 'Anomalous' : 'Not anomalous'}`)

	if (dryRunResponse) {
		throw new Error('Result is anomalous')
	}

	// Encode the contract call data for the 'get' function
	const writeCallData = encodeFunctionData({
		abi: CALCULATOR_CONSUMER_ABI,
		functionName: 'onReport',
		// The `metadata` (first) parameter is unused here but is required by the IReceiver interface.
		args: [toHex('0x'), dryRunCallData],
	})

	const report = runtime
		.report({
			encodedPayload: hexToBase64(writeCallData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.calculatorConsumerAddress,
			report: report,
		})
		.result()

	const txStatus = resp.txStatus

	if (txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to write report: ${resp.errorMessage || txStatus}`)
	}

	const txHash = resp.txHash || new Uint8Array(32)

	return {
		OffchainValue: offchainBigInt,
		OnchainValue: onchainValue,
		FinalResult: finalResult,
		TxHash: txHash.toString(),
	}
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

main()
