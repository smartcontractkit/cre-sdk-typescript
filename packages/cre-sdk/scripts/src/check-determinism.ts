import { existsSync } from 'node:fs'
import path from 'node:path'
import { checkWorkflowDeterminism, printDeterminismWarnings } from './validate-workflow-determinism'

const printUsage = () => {
	console.error('Usage: bun scripts/run.ts check-determinism <path/to/workflow.ts>')
	console.error('Example:')
	console.error('  bun scripts/run.ts check-determinism src/workflows/my-workflow/index.ts')
}

export const main = () => {
	const inputPath = process.argv[3]

	if (!inputPath) {
		printUsage()
		process.exit(1)
	}

	const resolvedInput = path.resolve(inputPath)
	if (!existsSync(resolvedInput)) {
		console.error(`❌ File not found: ${resolvedInput}`)
		process.exit(1)
	}

	const warnings = checkWorkflowDeterminism(resolvedInput)

	if (warnings.length > 0) {
		printDeterminismWarnings(warnings)
	} else {
		console.info('No non-determinism warnings found.')
	}
}
