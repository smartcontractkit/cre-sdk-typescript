import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parseCompileFlags } from '@chainlink/cre-sdk-javy-plugin/scripts/parse-compile-flags'
import { parseCompileCliArgs, skipTypeChecksFlag } from './compile-cli-args'
import { main as compileToJs } from './compile-to-js'
import { main as compileToWasm } from './compile-to-wasm'

type CompileWorkflowOptions = {
	skipTypeChecks?: boolean
	creExports?: string[]
	plugin?: string | null
}

const printUsage = () => {
	console.error(
		`Usage: bun compile:workflow [--plugin <path>] [--cre-exports <crate-dir>]... <path/to/workflow.ts> [path/to/output.wasm] [${skipTypeChecksFlag}]`,
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
	let parsedCreExports: string[] = []
	let parsedPlugin: string | null = null

	if (inputFile != null || outputWasmFile != null || options != null) {
		parsedInputPath = inputFile
		parsedOutputPath = outputWasmFile
		parsedSkipTypeChecks = options?.skipTypeChecks ?? false
		parsedCreExports = options?.creExports ?? []
		parsedPlugin = options?.plugin !== undefined ? options.plugin : null
	} else {
		try {
			const cliArgs = process.argv.slice(3)
			const { creExports, plugin, rest } = parseCompileFlags(cliArgs)
			const parsed = parseCompileCliArgs(rest)
			parsedInputPath = parsed.inputPath
			parsedOutputPath = parsed.outputPath
			parsedSkipTypeChecks = parsed.skipTypeChecks
			parsedCreExports = creExports
			parsedPlugin = plugin
		} catch (error) {
			console.error(error instanceof Error ? error.message : error)
			printUsage()
			process.exit(1)
		}
	}

	const inputPath = parsedInputPath
	const outputPathArg = parsedOutputPath

	if (parsedPlugin != null && parsedPlugin !== '' && parsedCreExports.length > 0) {
		console.error('❌ Error: --plugin and --cre-exports are mutually exclusive.')
		process.exit(1)
	}

	if (!inputPath) {
		printUsage()
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
	if (parsedSkipTypeChecks) {
		console.info(`⚠️  Skipping TypeScript checks (${skipTypeChecksFlag})`)
	}

	console.info('📦 Step 1: Compiling JS...')
	await compileToJs(resolvedInput, resolvedJsOutput, { skipTypeChecks: parsedSkipTypeChecks })

	console.info('\n🔨 Step 2: Compiling to WASM...')
	await compileToWasm(resolvedJsOutput, resolvedWasmOutput, parsedCreExports, parsedPlugin)

	console.info(`\n✅ Workflow built: ${resolvedWasmOutput}`)
	return resolvedWasmOutput
}

if (import.meta.main) {
	main().catch((e) => {
		console.error(e)
		process.exit(1)
	})
}
