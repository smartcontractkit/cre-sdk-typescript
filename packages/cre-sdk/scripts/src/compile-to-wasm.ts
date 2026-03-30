import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

function runBun(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn('bun', args, {
			stdio: 'inherit',
			env: process.env,
		})
		child.on('error', reject)
		child.on('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`bun exited with code ${code ?? 'unknown'}`))
		})
	})
}

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

	// Prefer the sibling @chainlink/cre-sdk-javy-plugin install (same as monorepo layout).
	// Bun's shell `$` template can throw EINVAL on some Linux/arm64 Docker setups; use spawn.
	const scriptDir = import.meta.dir
	const compilerPath = path.resolve(
		scriptDir,
		'../../../cre-sdk-javy-plugin/bin/compile-workflow.ts',
	)
	if (existsSync(compilerPath)) {
		await runBun(['--bun', compilerPath, resolvedInput, resolvedOutput])
	} else {
		await runBun(['x', 'cre-compile-workflow', resolvedInput, resolvedOutput])
	}

	console.info(`✅ Compiled: ${resolvedOutput}`)

	return resolvedOutput
}
