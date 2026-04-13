#!/usr/bin/env bun
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from '../scripts/ensure-javy.ts'
import { generateHostCrate, resolveExtensions } from '../scripts/generate-host-crate.ts'
import { parseCompileFlags } from '../scripts/parse-compile-flags.ts'
import { JAVY_VERSION, run } from '../scripts/shared.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEFAULT_PLUGIN_PATH = resolve(__dirname, '..', 'dist', 'javy-chainlink-sdk.plugin.wasm')

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
	const { creExports, plugin: pluginArg, rest } = parseCompileFlags(argv)

	if (rest.length < 2) {
		console.error(
			'Usage: compile-workflow.ts [--plugin <path>] [--cre-exports <crate-dir>]... <input.js> <output.wasm>',
		)
		console.error('  --plugin: use pre-built .plugin.wasm (mutually exclusive with --cre-exports)')
		console.error('  --cre-exports: path to a Rust extension crate directory (repeat for multiple)')
		console.error('  If neither given, uses default pre-built plugin from dist/')
		process.exit(1)
	}
	if (pluginArg !== null && creExports.length > 0) {
		console.error(
			'❌ Error: --plugin and --cre-exports are mutually exclusive. Use one or the other.',
		)
		process.exit(1)
	}

	const jsFile = rest[0]
	const wasmFile = rest[1]

	if (!existsSync(jsFile)) {
		console.error(`❌ Input file not found: ${jsFile}`)
		process.exit(1)
	}

	const pluginDir = resolve(__dirname, '..')
	const witPath = resolve(pluginDir, 'dist', 'workflow.wit')

	let pluginPath: string

	if (pluginArg !== null) {
		pluginPath = resolve(process.cwd(), pluginArg)
		if (!existsSync(pluginPath)) {
			console.error(`❌ Plugin file not found: ${pluginPath}`)
			process.exit(1)
		}
	} else if (creExports.length > 0) {
		const tmpDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
		const sharedTargetDir = resolve(pluginDir, '.cargo-target')
		try {
			const extensions = resolveExtensions(creExports)
			generateHostCrate(tmpDir, pluginDir, extensions)

			const [, javyPath] = await Promise.all([
				run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], tmpDir, {
					CARGO_TARGET_DIR: sharedTargetDir,
				}),
				ensureJavy({ version: JAVY_VERSION }),
			])

			const builtWasm = findBuiltWasm(sharedTargetDir)
			pluginPath = resolve(tmpDir, 'cre.plugin.wasm')
			await run(javyPath, ['init-plugin', '--deterministic', builtWasm, '-o', pluginPath], tmpDir)

			await run(
				javyPath,
				[
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
				],
				process.cwd(),
			)
		} finally {
			rmSync(tmpDir, { recursive: true, force: true })
		}
		return
	} else {
		pluginPath = DEFAULT_PLUGIN_PATH
		if (!existsSync(pluginPath)) {
			console.error(`❌ Default plugin not found: ${pluginPath}`)
			console.error('   Run: bun run build (in packages/cre-sdk-javy-plugin) or bun x cre-setup')
			process.exit(1)
		}
	}

	const javyPath = await ensureJavy({ version: JAVY_VERSION })
	await run(
		javyPath,
		[
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
		],
		process.cwd(),
	)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
