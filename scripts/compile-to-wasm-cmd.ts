import { execFileSync } from 'node:child_process'
import path from 'node:path'
import fg from 'fast-glob'

export const main = async () => {
	console.info('\n\n---> Compile JS workflows to WASM \n\n')

	const workflowJSFiles = fg.sync('dist/workflows/**/*.js')

	for (const jsFile of workflowJSFiles) {
		if (jsFile.includes('abi')) continue

		const wasmFile = jsFile.replace(/\.js$/, '.wasm')

		console.log(`\n\n🔨 Building WASM for: ${jsFile}`)

		const javyBinary =
			process.platform === 'darwin'
				? './.bin/javy-arm-macos-v5.0.4'
				: './.bin/javy-arm-linux-v5.0.4'

		const javyPath = path.join(process.cwd(), 'node_modules', javyBinary)
		console.log(`Javy path: ${javyPath}`)

		/**
		 * -C wit=src/workflows/workflow.wit — points to the WIT file (definition of what will be available for the Host).
		 * -C wit-world=workflow — specifies the WIT world name (world "workflow" which is defined in the .wit file).
		 * -C plugin=... — uses your custom runtime (bundled javy chainlink sdk plugin)
		 */
		// await $`bun javy build -C wit=src/workflows/workflow.wit -C wit-world=workflow -C plugin=dist/javy-chainlink-sdk.plugin.wasm ${jsFile} -o ${wasmFile}`
		// await $`./bin/javy-arm-macos-v5.0.4 build -C wit=src/workflows/workflow.wit -C wit-world=workflow -C plugin=dist/javy-chainlink-sdk.plugin.wasm ${jsFile} -o ${wasmFile}`

		execFileSync(
			javyPath,
			[
				'build',
				'-C',
				'wit=src/workflows/workflow.wit',
				'-C',
				'wit-world=workflow',
				'-C',
				'plugin=node_modules/@chainlink/cre-sdk/javy-chainlink-sdk.plugin.wasm',
				jsFile,
				'-o',
				wasmFile,
			],
			{
				stdio: 'inherit',
			},
		)
	}

	console.info('Done!')
}
