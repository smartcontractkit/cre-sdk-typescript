/**
 * WASM compile gate: a workflow importing the tool-generated DataStorage
 * binding must compile through the committed Javy plugin. Compiled by hand
 * (or CI) via:
 *   bun bin/cre-compile.ts --plugin ../cre-sdk-javy-plugin/dist/javy-chainlink-sdk.plugin.wasm \
 *     src/sdk/test/solana-binding-fixture/workflow-wasm-check.ts /tmp/solana-binding.wasm
 */
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime, SolanaClient } from '@cre/sdk/cre'
import { solanaAccountMeta } from '@cre/sdk/utils/capabilities/blockchain/solana/solana-helpers'
import { Runner } from '@cre/sdk/wasm'
import { DataStorage, type UserData } from './DataStorage'

const CHAIN_SELECTOR = SolanaClient.SUPPORTED_CHAIN_SELECTORS['solana-devnet']

const writeUserData = (runtime: Runtime<Uint8Array>) => {
	const binding = new DataStorage(new SolanaClient(CHAIN_SELECTOR))
	const accounts = [
		solanaAccountMeta(new Uint8Array(32).fill(1)),
		solanaAccountMeta(new Uint8Array(32).fill(2)),
		solanaAccountMeta(new Uint8Array(32).fill(3), true),
	]
	const input: UserData = { key: 'k', value: 'v' }
	const single = binding.writeReportFromUserData(runtime, input, accounts)
	const sliced = binding.writeReportFromUserDatas(runtime, [input, input], accounts)
	runtime.log(`single=${single.txStatus} sliced=${sliced.txStatus}`)
	return 'ok'
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	return [cre.handler(basicTrigger.trigger({}), writeUserData)]
}

export async function main() {
	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
