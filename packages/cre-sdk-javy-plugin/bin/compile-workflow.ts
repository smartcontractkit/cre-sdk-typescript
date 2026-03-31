#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from '../scripts/ensure-javy.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const [jsFile, wasmFile] = process.argv.slice(2)

if (!jsFile || !wasmFile) {
	console.error('Usage: compile-workflow <input.js> <output.wasm>')
	process.exit(1)
}

const javyPath = await ensureJavy({ version: 'v8.1.0' })
const witPath = resolve(__dirname, '../dist/workflow.wit')
const pluginPath = resolve(__dirname, '../dist/javy-chainlink-sdk.plugin.wasm')

if (!existsSync(pluginPath)) {
	console.error(
		`❌ CRE SDK Javy plugin not found at: ${pluginPath}\n\n` +
			'The pre-built plugin WASM should be included in the package.\n' +
			'Try reinstalling @chainlink/cre-sdk-javy-plugin.\n' +
			'See: https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-javy-plugin/README.md#quick-start',
	)
	process.exit(1)
}

const javyArgs = [
	'build',
	'-C',
	`wit=${witPath}`,
	'-C',
	'wit-world=workflow',
	'-C',
	`plugin=${pluginPath}`,
	'-C',
	'deterministic=y',
	jsFile,
	'-o',
	wasmFile,
]

const child = spawn(javyPath, javyArgs, { stdio: 'inherit' })

child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal)
	else process.exit(code ?? 1)
})
