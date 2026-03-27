export const skipTypeChecksFlag = '--skip-type-checks'

export type ParsedCompileArgs = {
	inputPath?: string
	outputPath?: string
	skipTypeChecks: boolean
}

export const parseCompileCliArgs = (args: string[]): ParsedCompileArgs => {
	const positionalArgs: string[] = []
	let skipTypeChecks = false

	for (const arg of args) {
		if (arg === skipTypeChecksFlag) {
			skipTypeChecks = true
			continue
		}

		if (arg.startsWith('-')) {
			throw new Error(`Unknown option: ${arg}`)
		}

		positionalArgs.push(arg)
	}

	if (positionalArgs.length > 2) {
		throw new Error('Too many positional arguments.')
	}

	return {
		inputPath: positionalArgs[0],
		outputPath: positionalArgs[1],
		skipTypeChecks,
	}
}
