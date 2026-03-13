import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { $ } from 'bun'
import { parseCompileCliArgs, skipTypeChecksFlag } from './compile-cli-args'
import { assertWorkflowTypecheck } from './typecheck-workflow'
import { assertWorkflowRuntimeCompatibility } from './validate-workflow-runtime-compat'
import { wrapWorkflowCode } from './workflow-wrapper'

type CompileToJsOptions = {
	skipTypeChecks?: boolean
}

const printUsage = () => {
	console.error(
		`Usage: bun compile:ts-to-js <path-to-file> [output-file] [${skipTypeChecksFlag}]`,
	)
	console.error('Example:')
	console.error('  bun compile:ts-to-js src/tests/foo.ts dist/tests/foo.bundle.js')
	console.error(
		`  bun compile:ts-to-js src/tests/foo.ts dist/tests/foo.bundle.js ${skipTypeChecksFlag}`,
	)
}

export const main = async (
	tsFilePath?: string,
	outputFilePath?: string,
	options?: CompileToJsOptions,
) => {
	let parsedInputPath: string | undefined
	let parsedOutputPath: string | undefined
	let parsedSkipTypeChecks = false

	if (tsFilePath != null || outputFilePath != null || options?.skipTypeChecks != null) {
		parsedInputPath = tsFilePath
		parsedOutputPath = outputFilePath
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

	// Prefer function params, fallback to CLI args
	const inputPath = parsedInputPath
	const outputPathArg = parsedOutputPath

	if (!inputPath) {
		printUsage()
		process.exit(1)
	}

	const resolvedInput = path.resolve(inputPath)
	if (!parsedSkipTypeChecks) {
		assertWorkflowTypecheck(resolvedInput)
	}
	assertWorkflowRuntimeCompatibility(resolvedInput)
	console.info(`📁 Using input file: ${resolvedInput}`)

	// If no explicit output path → same dir, swap extension to .js
	const resolvedOutput =
		outputPathArg != null
			? path.resolve(outputPathArg)
			: path.join(
					path.dirname(resolvedInput),
					path.basename(resolvedInput).replace(/\.[^.]+$/, '.js'),
				)

	// Ensure the output directory exists
	await mkdir(path.dirname(resolvedOutput), { recursive: true })

	// Wrap workflow code with automatic error handling
	const originalCode = readFileSync(resolvedInput, 'utf-8')
	const wrappedCode = wrapWorkflowCode(originalCode, resolvedInput)

	// Write wrapped code to temp file (in the same directory as input for module resolution)
	const tempFile = path.join(
		path.dirname(resolvedInput),
		`.workflow-temp-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`,
	)
	writeFileSync(tempFile, wrappedCode, 'utf-8')

	try {
		// Build step (emit next to output file, then overwrite)
		await Bun.build({
			entrypoints: [tempFile],
			outdir: path.dirname(resolvedOutput),
			target: 'browser',
			format: 'esm',
			naming: path.basename(resolvedOutput),
		})

		if (!existsSync(resolvedOutput)) {
			console.error(`❌ Expected file not found: ${resolvedOutput}`)
			process.exit(1)
		}

		// Bundle into the final file (overwrite)
		await $`bun build ${resolvedOutput} --bundle --outfile=${resolvedOutput}`

		console.info(`✅ Built: ${resolvedOutput}`)
		return resolvedOutput
	} finally {
		// Clean up temp file
		if (existsSync(tempFile)) {
			unlinkSync(tempFile)
		}
	}
}
