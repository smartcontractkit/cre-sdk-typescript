import { $ } from 'bun'

const cwd = process.cwd()

export const main = async () => {
	console.info('\n\n---> Compile Javy SDK plugin \n\n')

	await $`mkdir -p dist`

	await $`bun javy:linux init-plugin plugins/javy_chainlink_sdk/target/wasm32-wasip1/release/javy_chainlink_sdk.wasm -o dist/javy-chainlink-sdk.plugin.wasm`

	console.info('Done!')
}
