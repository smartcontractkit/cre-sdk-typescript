#!/usr/bin/env bun

import { WorkflowTypecheckError } from './src/typecheck-workflow'
import { WorkflowRuntimeCompatibilityError } from './src/validate-workflow-runtime-compat'

const availableScripts = [
	'build-types',
	'check-determinism', // Check for non-deterministic patterns in workflow source
	'compile-to-js',
	'compile-to-wasm',
	'compile-workflow', // TS -> JS -> WASM compilation in single script
	'compile-all-standard-tests', // Do the above but for all standard tests
	'fix-imports', // Fix @cre/* imports to relative paths
	'generate-chain-selectors',
	'generate-sdks',
]

/**
 * Main entry point for scripts related to the development of the SDK.
 */
const main = async () => {
	const scriptName = process.argv[2]

	if (!scriptName) {
		console.error('Usage: bun run.ts <script-name>')
		console.error('Available scripts:')
		availableScripts.forEach((script) => {
			console.error(`  ${script}`)
		})
		process.exit(1)
	}

	try {
		const scriptPath = `./src/${scriptName}.ts`
		const script = await import(scriptPath)

		if (typeof script.main === 'function') {
			await script.main()
		} else {
			console.error(`Script ${scriptName} does not export a main function`)
			process.exit(1)
		}
	} catch (error) {
		if (
			error instanceof WorkflowRuntimeCompatibilityError ||
			error instanceof WorkflowTypecheckError
		) {
			console.error(`\n❌ ${error.message}`)
		} else {
			console.error(`Failed to run script ${scriptName}:`, error)
		}
		process.exit(1)
	}
}

main()
