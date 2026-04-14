#!/usr/bin/env bun

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { ensureJavy } from './ensure-javy.ts'
import { generateHostCrate } from './generate-host-crate.ts'
import { JAVY_VERSION, run } from './shared.ts'

const pluginDir = join(import.meta.dir, '..')
const distPluginWasmPath = join(pluginDir, 'dist', 'javy-chainlink-sdk.plugin.wasm')
const witFilePath = join(pluginDir, 'src', 'workflow.wit')
const distWitFilePath = join(pluginDir, 'dist', 'workflow.wit')

function findBuiltWasm(targetDir: string): string {
	const releaseDir = resolve(targetDir, 'wasm32-wasip1', 'release')
	for (const name of ['cre_generated_host.wasm', 'libcre_generated_host.wasm']) {
		const candidate = resolve(releaseDir, name)
		if (existsSync(candidate)) return candidate
	}
	throw new Error(`Build succeeded but WASM not found in ${releaseDir}`)
}

export const main = async () => {
	console.info('\n\n---> Compiling Chainlink SDK Javy plugin (Rust) \n\n')

	const tmpDir = mkdtempSync(join(tmpdir(), 'cre-plugin-'))
	const sharedTargetDir = resolve(pluginDir, '.cargo-target')

	try {
		generateHostCrate(tmpDir, pluginDir, [])

		const [, javyPath] = await Promise.all([
			run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], tmpDir, {
				CARGO_TARGET_DIR: sharedTargetDir,
			}),
			ensureJavy({ version: JAVY_VERSION }),
		])

		const builtWasm = findBuiltWasm(sharedTargetDir)
		const distDir = join(pluginDir, 'dist')
		mkdirSync(distDir, { recursive: true })
		copyFileSync(witFilePath, distWitFilePath)

		await run(
			javyPath,
			['init-plugin', '--deterministic', builtWasm, '-o', distPluginWasmPath],
			tmpDir,
		)

		console.info('✅ Done!')
	} finally {
		rmSync(tmpDir, { recursive: true, force: true })
	}
}

main()
