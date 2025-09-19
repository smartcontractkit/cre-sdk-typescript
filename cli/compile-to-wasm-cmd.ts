import { execFileSync } from 'node:child_process'
import path from 'node:path'
import fg from 'fast-glob'

const getPackagePath = (fileName: string) => {
	return path.join(process.cwd(), 'node_modules', '@chainlink', 'cre-sdk', fileName)
}

export const main = async () => {
	console.info('\n\n---> Compile JS workflows to WASM \n\n')

	const workflowJSFiles = fg.sync('dist/workflows/**/*.js')

	for (const jsFile of workflowJSFiles) {
		if (jsFile.includes('abi')) continue

		const wasmFile = jsFile.replace(/\.js$/, '.wasm')

		console.log(`\n\n🔨 Building WASM for: ${jsFile}`)

		const javyPath = getPackagePath('javy')
		const javyPluginPath = getPackagePath('javy-chainlink-sdk.plugin.wasm')
		const workflowWitPath = getPackagePath('dist/workflow.wit')

		/**
		 * -C wit=src/workflows/workflow.wit — points to the WIT file (definition of what will be available for the Host).
		 * -C wit-world=workflow — specifies the WIT world name (world "workflow" which is defined in the .wit file).
		 * -C plugin=... — uses your custom runtime (bundled javy chainlink sdk plugin)
		 */

		execFileSync(
			javyPath,
			[
				'build',
				'-C',
				`wit=${workflowWitPath}`,
				'-C',
				'wit-world=workflow',
				'-C',
				`plugin=${javyPluginPath}`,
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
