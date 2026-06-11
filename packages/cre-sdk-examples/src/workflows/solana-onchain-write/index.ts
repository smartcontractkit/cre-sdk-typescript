import {
	CronCapability,
	getNetwork,
	handler,
	Runner,
	type Runtime,
	type SolanaAccountMeta,
	SolanaClient,
	SolanaTxStatus,
	solanaAccountMeta,
} from '@chainlink/cre-sdk'
import { address } from '@solana/addresses'
import { getBase58Decoder } from '@solana/codecs'
import { z } from 'zod'
import { DataStorage, type UserData } from './DataStorage'

// Validates base58-encoded Solana addresses at config-parse time.
const base58Address = z.string().refine(
	(value) => {
		try {
			address(value)
			return true
		} catch {
			return false
		}
	},
	{ message: 'Invalid base58-encoded Solana address' },
)

const configSchema = z.object({
	schedule: z.string(),
	solana: z.object({
		chainSelectorName: z.string(),
		receiverProgramId: base58Address,
		forwarderState: base58Address,
		forwarderAuthority: base58Address,
		receiverAccounts: z.array(
			z.object({
				publicKey: base58Address,
				isWritable: z.boolean().optional(),
			}),
		),
	}),
})

type Config = z.infer<typeof configSchema>
type ConfiguredAccount = Config['solana']['receiverAccounts'][number]

const onCronTrigger = (runtime: Runtime<Config>) => {
	const solanaConfig = runtime.config.solana

	const network = getNetwork({
		chainFamily: 'solana',
		chainSelectorName: solanaConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${solanaConfig.chainSelectorName}`)
	}

	// DataStorage is a cre-cli generated binding (cre generate-bindings --language typescript).
	const dataStorage = new DataStorage(
		new SolanaClient(network.chainSelector.selector),
		solanaConfig.receiverProgramId,
	)

	// keystone-forwarder account layout: forwarder state account first, the
	// forwarder authority PDA second, then the accounts the receiver program's
	// on_report instruction needs. Order matters — the full list is hashed into
	// the report and verified on-chain.
	const accounts: SolanaAccountMeta[] = [
		solanaAccountMeta(solanaConfig.forwarderState, true),
		solanaAccountMeta(solanaConfig.forwarderAuthority),
		...solanaConfig.receiverAccounts.map((account: ConfiguredAccount) =>
			solanaAccountMeta(account.publicKey, account.isWritable ?? false),
		),
	]

	const input: UserData = {
		key: 'cre-example',
		value: 'hello from CRE',
	}

	runtime.log('Writing UserData report to the DataStorage program...')

	const resp = dataStorage.writeReportFromUserData(runtime, input, accounts)

	if (resp.txStatus !== SolanaTxStatus.SUCCESS) {
		throw new Error(`Failed to write report: ${resp.errorMessage || resp.txStatus}`)
	}

	const txSignature = resp.txSignature ? getBase58Decoder().decode(resp.txSignature) : ''

	runtime.log(`Successfully wrote report, tx signature: ${txSignature}`)

	return {
		Key: input.key,
		Value: input.value,
		TxSignature: txSignature,
	}
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()

	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}
