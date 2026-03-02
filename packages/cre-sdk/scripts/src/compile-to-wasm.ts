import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { $ } from 'bun'
import { parseCompileFlags } from '../../../cre-sdk-javy-plugin/scripts/parse-compile-flags'

const isJsFile = (p: string) => ['.js', '.mjs', '.cjs'].includes(path.extname(p).toLowerCase())

export const main = async (
	inputFile?: string,
	outputFile?: string,
	creExportsPaths?: string[],
	pluginPath?: string | null,
) => {
	const cliArgs = process.argv.slice(3)
	const { creExports: cliCreExports, plugin: cliPlugin, rest: cliRest } = parseCompileFlags(cliArgs)

	const inputPath = inputFile ?? cliRest[0]
	const outputPathArg = outputFile ?? cliRest[1]
	const creExports = creExportsPaths ?? cliCreExports
	const plugin = pluginPath !== undefined ? pluginPath : cliPlugin

	if (plugin !== null && plugin !== undefined && creExports.length > 0) {
		console.error('❌ Error: --plugin and --cre-exports are mutually exclusive.')
		process.exit(1)
	}

	if (!inputPath) {
		console.error(
			'Usage: bun compile:js-to-wasm <path/to/input.(js|mjs|cjs)> [path/to/output.wasm]',
		)
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

	const defaultOut = path.join(
		path.dirname(resolvedInput),
		path.basename(resolvedInput).replace(/\.(m|c)?js$/i, '.wasm'),
	)
	const resolvedOutput = outputPathArg ? path.resolve(outputPathArg) : defaultOut

	await mkdir(path.dirname(resolvedOutput), { recursive: true })

	console.info('🔨 Compiling to WASM')
	console.info(`📁 Input:  ${resolvedInput}`)
	console.info(`🎯 Output: ${resolvedOutput}`)

	const compileArgs: string[] = []
	if (plugin != null && plugin !== '') {
		compileArgs.push('--plugin', path.resolve(plugin))
	} else {
		compileArgs.push(...creExports.flatMap((p) => ['--cre-exports', path.resolve(p)]))
	}
	compileArgs.push(resolvedInput, resolvedOutput)
	try {
		await $`bun cre-compile-workflow ${compileArgs}`
	} catch {
		const scriptDir = import.meta.dir
		const compilerPath = path.resolve(
			scriptDir,
			'../../../cre-sdk-javy-plugin/bin/compile-workflow.ts',
		)
		await $`bun --bun ${compilerPath} ${compileArgs}`
	}

	console.info(`✅ Compiled: ${resolvedOutput}`)

	return resolvedOutput
}
