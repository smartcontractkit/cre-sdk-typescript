import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { $ } from 'bun'
import { wrapWorkflowCode } from './workflow-wrapper'

export const main = async (tsFilePath?: string, outputFilePath?: string) => {
	const cliArgs = process.argv.slice(3)

	// Prefer function params, fallback to CLI args
	const inputPath = tsFilePath ?? cliArgs[0]
	const outputPathArg = outputFilePath ?? cliArgs[1]

	if (!inputPath) {
		console.error('Usage: bun test:standard:compile:js <path-to-file> [output-file]')
		console.error('Example:')
		console.error('  bun test:standard:compile:js src/tests/foo.ts dist/tests/foo.bundle.js')
		process.exit(1)
	}

	const resolvedInput = path.resolve(inputPath)
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

		// The file Bun will emit before bundling
		const builtFile = path.join(path.dirname(resolvedOutput), path.basename(resolvedOutput))

		if (!existsSync(builtFile)) {
			console.error(`❌ Expected file not found: ${builtFile}`)
			process.exit(1)
		}

		// Bundle into the final file (overwrite)
		await $`bun build ${builtFile} --bundle --outfile=${resolvedOutput}`

		console.info(`✅ Built: ${resolvedOutput}`)
		return resolvedOutput
	} finally {
		// Clean up temp file
		if (existsSync(tempFile)) {
			unlinkSync(tempFile)
		}
	}
}
