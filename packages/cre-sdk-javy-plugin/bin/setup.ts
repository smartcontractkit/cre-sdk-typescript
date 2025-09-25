#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from '../scripts/ensure-javy.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const javyPath = await ensureJavy({ version: 'v5.0.4' })

// Compile javy with the Chainlink SDK plugin
const pluginWasmPath = resolve(__dirname, '../dist/javy_chainlink_sdk.wasm')
const pluginOutputPath = resolve(__dirname, '../dist/javy-chainlink-sdk.plugin.wasm')

await new Promise<void>((resolve, reject) => {
	const initPlugin = spawn(javyPath, ['init-plugin', pluginWasmPath, '-o', pluginOutputPath], {
		stdio: 'inherit',
	})

	initPlugin.on('exit', (code) => {
		if (code === 0) {
			resolve()
			return
		}

		reject(new Error(`❌ Failed to set up the CRE TS SDK. Error code: ${code}`))
	})
})

console.log('✅ CRE TS SDK is ready to use.')
