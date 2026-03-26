import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parseCompileFlags } from '../../../cre-sdk-javy-plugin/scripts/parse-compile-flags'

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

	const scriptDir = import.meta.dir
	const javyPluginRoot = process.env.CRE_SDK_JAVY_PLUGIN_HOME
		? path.resolve(process.env.CRE_SDK_JAVY_PLUGIN_HOME)
		: path.resolve(scriptDir, '../../../cre-sdk-javy-plugin')
	const compilerPath = path.join(javyPluginRoot, 'bin/compile-workflow.ts')
	if (existsSync(compilerPath)) {
		await runBun(['--bun', compilerPath, ...compileArgs])
	} else {
		await runBun(['x', 'cre-compile-workflow', ...compileArgs])
	}

	console.info(`✅ Compiled: ${resolvedOutput}`)

	return resolvedOutput
}
