import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parseCompileCliArgs, skipTypeChecksFlag } from './compile-cli-args'
import { main as compileToJs } from './compile-to-js'
import { main as compileToWasm } from './compile-to-wasm'

type CompileWorkflowOptions = {
	skipTypeChecks?: boolean
}

const printUsage = () => {
	console.error(
		`Usage: bun compile:workflow <path/to/workflow.ts> [path/to/output.wasm] [${skipTypeChecksFlag}]`,
	)
	console.error('Examples:')
	console.error('  bun compile:workflow src/standard_tests/secrets/test.ts')
	console.error(
		'  bun compile:workflow src/standard_tests/secrets/test.ts .temp/standard_tests/secrets/test.wasm',
	)
	console.error(
		`  bun compile:workflow src/standard_tests/secrets/test.ts .temp/standard_tests/secrets/test.wasm ${skipTypeChecksFlag}`,
	)
}

export const main = async (
	inputFile?: string,
	outputWasmFile?: string,
	options?: CompileWorkflowOptions,
) => {
	let parsedInputPath: string | undefined
	let parsedOutputPath: string | undefined
	let parsedSkipTypeChecks = false

	if (inputFile != null || outputWasmFile != null || options?.skipTypeChecks != null) {
		parsedInputPath = inputFile
		parsedOutputPath = outputWasmFile
		parsedSkipTypeChecks = options?.skipTypeChecks ?? false
	} else {
		try {
			const parsed = parseCompileCliArgs(process.argv.slice(3))
			parsedInputPath = parsed.inputPath
			parsedOutputPath = parsed.outputPath
			parsedSkipTypeChecks = parsed.skipTypeChecks
		} catch (error) {
			console.error(error instanceof Error ? error.message : error)
			printUsage()
			process.exit(1)
		}
	}

	const inputPath = parsedInputPath
	const outputPathArg = parsedOutputPath

	if (!inputPath) {
		printUsage()
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
	if (parsedSkipTypeChecks) {
		console.info(`⚠️  Skipping TypeScript checks (${skipTypeChecksFlag})`)
	}

	// Step 1: TS/JS → JS (bundled)
	console.info('📦 Step 1: Compiling JS...')
	await compileToJs(resolvedInput, resolvedJsOutput, { skipTypeChecks: parsedSkipTypeChecks })

	// Step 2: JS → WASM
	console.info('\n🔨 Step 2: Compiling to WASM...')
	await compileToWasm(resolvedJsOutput, resolvedWasmOutput)

	console.info(`\n✅ Workflow built: ${resolvedWasmOutput}`)
	return resolvedWasmOutput
}
