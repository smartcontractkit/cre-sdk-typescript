import {
	bigintToProtoBigInt,
	EVMClient,
	type EVMLog,
	getNetwork,
	handler,
	protoBigIntToBigint,
	Runner,
	type Runtime,
	safeJsonStringify,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	evms: z.array(
		z.object({
			messageEmitterAddress: z.string(),
			chainSelectorName: z.string(),
		}),
	),
})

type Config = z.infer<typeof configSchema>

const initWorkflow = (config: Config) => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.evms[0].chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(
			`Network not found for chain selector name: ${config.evms[0].chainSelectorName}`,
		)
	}

	const evmClient = new EVMClient(network.chainSelector.selector)

	const onLogTrigger = (runtime: Runtime<Config>, payload: EVMLog): string => {
		runtime.log('Running LogTrigger')

		const topics = payload.topics

		if (topics.length < 3) {
			runtime.log('Log payload does not contain enough topics')
			throw new Error(`log payload does not contain enough topics ${topics.length}`)
		}

		runtime.log(`Log payload: ${safeJsonStringify(payload)}`)

		if (!payload.blockNumber) {
			throw new Error('Block number is required')
		}

		const blockNumber = protoBigIntToBigint(payload.blockNumber)
		runtime.log(`Block number: ${blockNumber}`)

		// Fetch block header to get timestamp
		const headerResponse = evmClient
			.headerByNumber(runtime, {
				blockNumber: bigintToProtoBigInt(blockNumber),
			})
			.result()

		const timestamp = headerResponse.header?.timestamp
		if (timestamp) {
			const date = new Date(Number(timestamp) * 1000)
			runtime.log(`Block timestamp: ${date.toISOString()}`)
		}

		return 'success'
	}

	return [
		handler(
			evmClient.logTrigger({
				addresses: [config.evms[0].messageEmitterAddress],
			}),
			onLogTrigger,
		),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}
