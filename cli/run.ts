#!/usr/bin/env bun
import { main as compileCmd } from './compile-cmd'
import { main as compileToJs } from './compile-to-js'
import { main as compileToWasm } from './compile-to-wasm-cmd'

const availableScripts = {
	'compile-to-js': compileToJs,
	'compile-to-wasm': compileToWasm,
	compile: compileCmd,
}

const main = async () => {
	const scriptName = process.argv[2]

	if (!scriptName) {
		console.error('Usage: bun run.ts <script-name>')
		console.error('Available scripts:')
		Object.keys(availableScripts).forEach((script) => {
			console.error(`  ${script}`)
		})
		process.exit(1)
	}

	try {
		const script = availableScripts[scriptName]

		if (!script) {
			console.error(`Script ${scriptName} not found`)
			process.exit(1)
		}

		await script()
	} catch (error) {
		console.error(`Failed to load script ${scriptName}:`, error)
		process.exit(1)
	}
}

main()
