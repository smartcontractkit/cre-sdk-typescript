#!/usr/bin/env bun

import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from './ensure-javy.ts'
import { generateHostCrate } from './generate-host-crate.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginDir = resolve(__dirname, '..')

const distWasmPath = join(pluginDir, 'dist', 'javy_chainlink_sdk.wasm')
const distPluginWasmPath = join(pluginDir, 'dist', 'javy-chainlink-sdk.plugin.wasm')
const witFilePath = join(pluginDir, 'src', 'workflow.wit')
const distWitFilePath = join(pluginDir, 'dist', 'workflow.wit')

function run(cmd: string, args: string[], cwd: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true })
		p.on('close', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`${cmd} exited with ${code}`))
		})
		p.on('error', reject)
	})
}

export const main = async () => {
	console.info('\n\n---> Compiling Chainlink SDK Javy plugin (Rust) \n\n')

	const tmpDir = join(pluginDir, '.tmp-host-build-' + Date.now())
	mkdirSync(tmpDir, { recursive: true })

	try {
		generateHostCrate(tmpDir, pluginDir, [])

		await run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], tmpDir)

		let builtWasm = join(tmpDir, 'target', 'wasm32-wasip1', 'release', 'libcre_generated_host.wasm')
		if (!existsSync(builtWasm)) {
			const alt = join(tmpDir, 'target', 'wasm32-wasip1', 'release', 'cre_generated_host.wasm')
			if (existsSync(alt)) {
				builtWasm = alt
			} else {
				throw new Error(`Build succeeded but WASM not found at ${builtWasm}`)
			}
		}

		mkdirSync(join(pluginDir, 'dist'), { recursive: true })
		copyFileSync(builtWasm, distWasmPath)
		copyFileSync(witFilePath, distWitFilePath)

		const javyPath = await ensureJavy({ version: 'v5.0.4' })
		await run(javyPath, ['init-plugin', distWasmPath, '-o', distPluginWasmPath], pluginDir)

		console.info('✅ Done!')
	} finally {
		rmSync(tmpDir, { recursive: true, force: true })
	}
}

main()
