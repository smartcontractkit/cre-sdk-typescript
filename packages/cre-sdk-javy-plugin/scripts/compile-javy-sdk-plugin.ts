#!/usr/bin/env bun

import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ensureJavy } from './ensure-javy.ts'

const pluginDir = join(import.meta.dir, '..')
const crateDir = join(pluginDir, 'src', 'javy_chainlink_sdk')
/** Uninitialized cdylib; only passed to `javy init-plugin` (not copied to dist — see .gitignore). */
const builtWasmPath = join(
	crateDir,
	'target',
	'wasm32-wasip1',
	'release',
	'javy_chainlink_sdk.wasm',
)
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

	await run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], crateDir)

	const distDir = join(pluginDir, 'dist')
	mkdirSync(distDir, { recursive: true })
	copyFileSync(witFilePath, distWitFilePath)

	const javyPath = await ensureJavy({ version: 'v8.1.0' })
	await run(
		javyPath,
		['init-plugin', '--deterministic', builtWasmPath, '-o', distPluginWasmPath],
		pluginDir,
	)

	console.info('✅ Done!')
}

main()
