import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parseCompileFlags } from '../../../cre-sdk-javy-plugin/scripts/parse-compile-flags'
import { main as compileToJs } from './compile-to-js'
import { main as compileToWasm } from './compile-to-wasm'

export const main = async (
	inputFile?: string,
	outputWasmFile?: string,
	creExportsPaths?: string[],
	pluginPath?: string | null,
) => {
	const cliArgs = process.argv.slice(3)
	const { creExports: cliCreExports, plugin: cliPlugin, rest: cliRest } = parseCompileFlags(cliArgs)

	const inputPath = inputFile ?? cliRest[0]
	const outputPathArg = outputWasmFile ?? cliRest[1]
	const creExports = creExportsPaths ?? cliCreExports
	const plugin = pluginPath !== undefined ? pluginPath : cliPlugin

	if (plugin != null && plugin !== '' && creExports.length > 0) {
		console.error('❌ Error: --plugin and --cre-exports are mutually exclusive.')
		process.exit(1)
	}

	if (!inputPath) {
		console.error('Usage: bun compile:workflow <path/to/workflow.ts> [path/to/output.wasm]')
		process.exit(1)
	}

	const resolvedInput = path.resolve(inputPath)
	if (!existsSync(resolvedInput)) {
		console.error(`❌ File not found: ${resolvedInput}`)
		process.exit(1)
	}

	const defaultWasmOut = path.join(
		path.dirname(resolvedInput),
		path.basename(resolvedInput).replace(/\.[^.]+$/, '.wasm'),
	)
	const resolvedWasmOutput = outputPathArg ? path.resolve(outputPathArg) : defaultWasmOut
	const resolvedJsOutput = resolvedWasmOutput.replace(/\.wasm$/i, '.js')

	await mkdir(path.dirname(resolvedJsOutput), { recursive: true })

	console.info('🚀 Compiling workflow')
	console.info(`📁 Input:   ${resolvedInput}`)
	console.info(`🧪 JS out:  ${resolvedJsOutput}`)
	console.info(`🎯 WASM out:${resolvedWasmOutput}\n`)

	console.info('📦 Step 1: Compiling JS...')
	await compileToJs(resolvedInput, resolvedJsOutput)

	console.info('\n🔨 Step 2: Compiling to WASM...')
	await compileToWasm(resolvedJsOutput, resolvedWasmOutput, creExports, plugin)

	console.info(`\n✅ Workflow built: ${resolvedWasmOutput}`)
	return resolvedWasmOutput
}

if (import.meta.main) {
	main().catch((e) => {
		console.error(e)
		process.exit(1)
	})
}
