#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from '../scripts/ensure-javy.ts'
import type { ExtensionInfo } from '../scripts/generate-host-crate.ts'
import { generateHostCrate, resolveExtensions } from '../scripts/generate-host-crate.ts'
import { parseCompileFlags } from '../scripts/parse-compile-flags.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEFAULT_PLUGIN_PATH = resolve(__dirname, '..', 'dist', 'javy-chainlink-sdk.plugin.wasm')

async function run(
	cmd: string,
	args: string[],
	cwd: string,
	env?: Record<string, string>,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } })
		p.on('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`${cmd} exited with ${code}`))
		})
		p.on('error', reject)
	})
}

function buildRustflags(extensions: ExtensionInfo[]): string | undefined {
	const rlibDeps = extensions.filter((e) => e.type === 'rlib')
	if (rlibDeps.length === 0) return undefined
	const flags = rlibDeps.map((r) => `--extern ${r.crateName}=${r.path}`)
	const existing = process.env.RUSTFLAGS ?? ''
	return [existing, ...flags].filter(Boolean).join(' ')
}

async function main() {
	const argv = process.argv.slice(2)
	const { creExports, plugin: pluginArg, rest } = parseCompileFlags(argv)

	if (rest.length < 2) {
		console.error(
			'Usage: compile-workflow.ts [--plugin <path>] [--cre-exports <path|rlib>]... <input.js> <output.wasm>',
		)
		console.error('  --plugin: use pre-built .plugin.wasm (mutually exclusive with --cre-exports)')
		console.error('  --cre-exports: source crate dir or .rlib file (auto-detected, can mix both)')
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
		const tmpDir = resolve(pluginDir, '.tmp-host-' + Date.now())
		mkdirSync(tmpDir, { recursive: true })
		try {
			const extensions = resolveExtensions(creExports)
			generateHostCrate(tmpDir, pluginDir, extensions)

			const cargoEnv: Record<string, string> = {}
			const rustflags = buildRustflags(extensions)
			if (rustflags) {
				cargoEnv.RUSTFLAGS = rustflags
			}

			await run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], tmpDir, cargoEnv)

			let builtWasm = resolve(
				tmpDir,
				'target',
				'wasm32-wasip1',
				'release',
				'libcre_generated_host.wasm',
			)
			if (!existsSync(builtWasm)) {
				const alt = resolve(tmpDir, 'target', 'wasm32-wasip1', 'release', 'cre_generated_host.wasm')
				if (existsSync(alt)) {
					builtWasm = alt
				} else {
					throw new Error(`Build succeeded but WASM not found at ${builtWasm}`)
				}
			}

			const javyPath = await ensureJavy({ version: 'v5.0.4' })
			pluginPath = resolve(tmpDir, 'cre.plugin.wasm')
			await run(javyPath, ['init-plugin', builtWasm, '-o', pluginPath], tmpDir)

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

	const javyPath = await ensureJavy({ version: 'v5.0.4' })
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
