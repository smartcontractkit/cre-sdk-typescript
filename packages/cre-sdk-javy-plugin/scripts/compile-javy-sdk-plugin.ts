#!/usr/bin/env bun

import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ensureJavy } from './ensure-javy.ts'
import { JAVY_VERSION, run } from './shared.ts'

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

export const main = async () => {
	console.info('\n\n---> Compiling Chainlink SDK Javy plugin (Rust) \n\n')

	const [, javyPath] = await Promise.all([
		run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], crateDir),
		ensureJavy({ version: JAVY_VERSION }),
	])

	const distDir = join(pluginDir, 'dist')
	mkdirSync(distDir, { recursive: true })
	copyFileSync(witFilePath, distWitFilePath)

	await run(
		javyPath,
		['init-plugin', '--deterministic', builtWasmPath, '-o', distPluginWasmPath],
		pluginDir,
	)

	console.info('✅ Done!')
}

main()
