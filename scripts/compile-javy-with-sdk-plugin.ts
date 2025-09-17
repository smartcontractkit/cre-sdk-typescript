import { $ } from 'bun'

const cwd = process.cwd()

export const main = async () => {
	console.info('\n\n---> Compile Javy SDK plugin \n\n')

	await $`mkdir -p dist`

	await $`chmod +x ${cwd}/bin/javy-arm-macos-v5.0.4`
	// for each platform compile the plugin

	const currentPlatform = process.platform

	if (currentPlatform === 'darwin') {
		await $`bun javy init-plugin plugins/javy_chainlink_sdk/target/wasm32-wasip1/release/javy_chainlink_sdk.wasm -o dist/javy-chainlink-sdk-darwin.plugin.wasm`
	}

	if (currentPlatform === 'linux') {
		await $`bun javy:linux init-plugin plugins/javy_chainlink_sdk/target/wasm32-wasip1/release/javy_chainlink_sdk.wasm -o dist/javy-chainlink-sdk-linux.plugin.wasm`
	}

	console.info('Done!')
}
