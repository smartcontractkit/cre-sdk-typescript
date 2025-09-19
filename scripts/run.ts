#!/usr/bin/env bun

const availableScripts = [
	'compile-javy-sdk-plugin',
	'compile-javy-with-sdk-plugin',
	'compile-javy-linux-with-sdk-plugin',
	'compile-to-js',
	'compile-to-wasm',
	'build-single-workflow-js',
	'compile-single-workflow-to-wasm',
	'build-single-workflow',
]

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
		const scriptPath = `./${scriptName}.ts`
		const script = await import(scriptPath)

		if (typeof script.main === 'function') {
			await script.main()
		} else {
			console.error(`Script ${scriptName} does not export a main function`)
			process.exit(1)
		}
	} catch (error) {
		console.error(`Failed to load script ${scriptName}:`, error)
		process.exit(1)
	}
}

main()
