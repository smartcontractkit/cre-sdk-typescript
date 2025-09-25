#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from '../scripts/ensure-javy.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const [, , jsFile, wasmFile] = process.argv

if (!jsFile || !wasmFile) {
	console.error('Usage: compile.js <input.js> <output.wasm>')
	process.exit(1)
}

const javyPath = await ensureJavy({ version: 'v5.0.4' })
const witPath = resolve(__dirname, '../dist/workflow.wit')
const pluginPath = resolve(__dirname, '../dist/javy-chainlink-sdk.plugin.wasm')

const child = spawn(
	javyPath,
	[
		'build',
		'-C',
		`wit=${witPath}`,
		'-C',
		'wit-world=workflow',
		'-C',
		`plugin=${pluginPath}`,
		jsFile,
		'-o',
		wasmFile,
	],
	{ stdio: 'inherit' },
)

child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal)
	else process.exit(code ?? 1)
})
