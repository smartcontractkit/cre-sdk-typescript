#!/usr/bin/env bun
/**
 * Builds a Javy plugin .plugin.wasm from extension crates.
 * Used by examples that need a pre-built plugin (e.g. lib_alpha).
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path, { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from './ensure-javy.ts'
import { generateHostCrate, resolveExtensions } from './generate-host-crate.ts'
import { JAVY_VERSION, run } from './shared.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginDir = resolve(__dirname, '..')

function findBuiltWasm(targetDir: string): string {
	const releaseDir = resolve(targetDir, 'wasm32-wasip1', 'release')
	for (const name of ['cre_generated_host.wasm', 'libcre_generated_host.wasm']) {
		const candidate = resolve(releaseDir, name)
		if (existsSync(candidate)) return candidate
	}
	throw new Error(`Build succeeded but WASM not found in ${releaseDir}`)
}

async function main() {
	const argv = process.argv.slice(2)
	const creExports: string[] = []
	let outputPath: string | null = null
	let lockfilePath: string | null = null
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--cre-exports' && i + 1 < argv.length) {
			creExports.push(argv[i + 1])
			i++
		} else if (argv[i] === '-o' && i + 1 < argv.length) {
			outputPath = argv[i + 1]
			i++
		} else if (argv[i] === '--lockfile' && i + 1 < argv.length) {
			lockfilePath = resolve(argv[i + 1])
			i++
		}
	}
	if (creExports.length === 0 || outputPath === null) {
		console.error(
			'Usage: build-plugin.ts --cre-exports <path>... -o <output.plugin.wasm> [--lockfile <path>]',
		)
		process.exit(1)
	}

	const tmpDir = mkdtempSync(join(tmpdir(), 'cre-plugin-'))
	const sharedTargetDir = resolve(pluginDir, '.cargo-target')
	try {
		const extensions = resolveExtensions(creExports)
		generateHostCrate(tmpDir, pluginDir, extensions)

		const cargoArgs = ['build', '--target', 'wasm32-wasip1', '--release']
		if (lockfilePath) {
			copyFileSync(lockfilePath, join(tmpDir, 'Cargo.lock'))
			cargoArgs.splice(1, 0, '--locked')
		}

		const [, javyPath] = await Promise.all([
			run('cargo', cargoArgs, tmpDir, {
				CARGO_TARGET_DIR: sharedTargetDir,
			}),
			ensureJavy({ version: JAVY_VERSION }),
		])

		const builtWasm = findBuiltWasm(sharedTargetDir)
		const outAbs = resolve(process.cwd(), outputPath)
		mkdirSync(path.dirname(outAbs), { recursive: true })
		await run(javyPath, ['init-plugin', '--deterministic', builtWasm, '-o', outAbs], tmpDir)
		console.info(`✅ Plugin built: ${outAbs}`)
	} finally {
		rmSync(tmpDir, { recursive: true, force: true })
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
