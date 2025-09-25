import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { $ } from 'bun'

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		input: {
			type: 'string',
			default: 'main.ts',
		},
		output: {
			type: 'string',
			default: 'tmp.wasm',
		},
		platform: {
			type: 'string',
			default: 'arm-macos',
		},
	},
	strict: true,
	allowPositionals: true,
})

function getJavyBin(platform: string) {
	switch (platform) {
		case 'arm-macos':
			return 'javy-arm-macos-v5.0.4'
		case 'arm-linux':
			return 'javy-arm-linux-v5.0.4'
		default:
			throw new Error(`platform not supported: ${platform}`)
	}
}

async function main() {
	const outputFolder = 'dist'
	const inputTSFilename = values.input
	const outputWasmFilename = values.output
	const inputJSFilename = inputTSFilename.replace(/\.ts$/, '.js')
	const outputJSFilename = outputWasmFilename.replace(/\.wasm$/, '.js')
	const outputJSPath = join(outputFolder, outputJSFilename)
	const packagePath = join('node_modules', 'cre-sdk-typescript')
	const javy = join(packagePath, 'bin', getJavyBin(values.platform))
	const sdkPluginPath = join(packagePath, 'dist', 'javy-chainlink-sdk.plugin.wasm')
	const workflowWitPath = join(packagePath, 'src', 'workflows', 'workflow.wit')

	await mkdir(outputFolder, { recursive: true })
	await $`bun build ${inputTSFilename} --outdir=${outputFolder} --target=node --format=esm`
	await $`bun build ${inputJSFilename} --bundle --outfile=${outputJSPath}`
	await $`${javy} build -C wit=${workflowWitPath} -C wit-world=workflow -C plugin=${sdkPluginPath} ${outputJSPath} -o ${outputWasmFilename}`
}

main()
