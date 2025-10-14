import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { $ } from 'bun'

const isJsFile = (p: string) => ['.js', '.mjs', '.cjs'].includes(path.extname(p).toLowerCase())

export const main = async (inputFile?: string, outputFile?: string) => {
	const cliArgs = process.argv.slice(3)

	// Resolve input/output from params or CLI
	const inputPath = inputFile ?? cliArgs[0]
	const outputPathArg = outputFile ?? cliArgs[1]

	if (!inputPath) {
		console.error(
			'Usage: bun compile:js-to-wasm <path/to/input.(js|mjs|cjs)> [path/to/output.wasm]',
		)
		console.error('Examples:')
		console.error('  bun compile:js-to-wasm ./build/workflows/test.js')
		console.error('  bun compile:js-to-wasm ./build/workflows/test.mjs ./artifacts/test.wasm')
		process.exit(1)
	}

	const resolvedInput = path.resolve(inputPath)

	if (!isJsFile(resolvedInput)) {
		console.error('❌ Input must be a JavaScript file (.js, .mjs, or .cjs)')
		process.exit(1)
	}
	if (!existsSync(resolvedInput)) {
		console.error(`❌ File not found: ${resolvedInput}`)
		process.exit(1)
	}

	// Default output = same dir, same basename, .wasm extension
	const defaultOut = path.join(
		path.dirname(resolvedInput),
		path.basename(resolvedInput).replace(/\.(m|c)?js$/i, '.wasm'),
	)
	const resolvedOutput = outputPathArg ? path.resolve(outputPathArg) : defaultOut

	// Ensure output directory exists
	await mkdir(path.dirname(resolvedOutput), { recursive: true })

	console.info(`🔨 Compiling to WASM`)
	console.info(`📁 Input:  ${resolvedInput}`)
	console.info(`🎯 Output: ${resolvedOutput}`)

	// Run compilation
	try {
		await $`bun cre-compile-workflow ${resolvedInput} ${resolvedOutput}`
	} catch {
		// Fallback: locate compile-workflow.ts relative to this script file
		// From: packages/cre-sdk/scripts/src/compile-to-wasm.ts
		// To:   packages/cre-sdk-javy-plugin/bin/compile-workflow.ts
		const scriptDir = import.meta.dir
		const compilerPath = path.resolve(
			scriptDir,
			'../../../cre-sdk-javy-plugin/bin/compile-workflow.ts',
		)
		await $`bun --bun ${compilerPath} ${resolvedInput} ${resolvedOutput}`
	}

	console.info(`✅ Compiled: ${resolvedOutput}`)

	return resolvedOutput
}
