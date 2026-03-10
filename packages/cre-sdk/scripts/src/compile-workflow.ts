import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { main as compileToJs } from './compile-to-js'
import { main as compileToWasm } from './compile-to-wasm'

export const main = async (inputFile?: string, outputWasmFile?: string) => {
	const cliArgs = process.argv.slice(3)

	// Resolve input/output from params or CLI
	const inputPath = inputFile ?? cliArgs[0]
	const outputPathArg = outputWasmFile ?? cliArgs[1]

	if (!inputPath) {
		console.error('Usage: bun compile:workflow <path/to/workflow.ts> [path/to/output.wasm]')
		console.error('Examples:')
		console.error('  bun compile:workflow src/standard_tests/secrets/test.ts')
		console.error(
			'  bun compile:workflow src/standard_tests/secrets/test.ts .temp/standard_tests/secrets/test.wasm',
		)
		process.exit(1)
	}

	const resolvedInput = path.resolve(inputPath)
	if (!existsSync(resolvedInput)) {
		console.error(`❌ File not found: ${resolvedInput}`)
		process.exit(1)
	}

	// Default final output = same dir, same basename, .wasm
	const defaultWasmOut = path.join(
		path.dirname(resolvedInput),
		path.basename(resolvedInput).replace(/\.[^.]+$/, '.wasm'),
	)
	const resolvedWasmOutput = outputPathArg ? path.resolve(outputPathArg) : defaultWasmOut

	// Put the intermediate JS next to the final wasm (so custom outputs stay together)
	const resolvedJsOutput = resolvedWasmOutput.replace(/\.wasm$/i, '.js')

	// Ensure directories exist (handles both intermediate JS dir and wasm dir)
	await mkdir(path.dirname(resolvedJsOutput), { recursive: true })

	console.info(`🚀 Compiling workflow`)
	console.info(`📁 Input:   ${resolvedInput}\n`)

	// Step 1: TS/JS → JS (bundled)
	console.info('📦 Step 1: Compiling JS...')
	await compileToJs(resolvedInput, resolvedJsOutput)

	// Step 2: JS → WASM
	console.info('\n🔨 Step 2: Compiling to WASM...')
	await compileToWasm(resolvedJsOutput, resolvedWasmOutput)

	console.info(`\n✅ Workflow built: ${resolvedWasmOutput}`)
	return resolvedWasmOutput
}
