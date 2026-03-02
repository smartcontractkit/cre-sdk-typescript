#!/usr/bin/env bun
/**
 * Builds a Javy plugin .plugin.wasm from extension crates.
 * Used by examples that need a pre-built plugin (e.g. lib_alpha).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import path, { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureJavy } from './ensure-javy.ts'
import { generateHostCrate, resolveExtensions } from './generate-host-crate.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginDir = resolve(__dirname, '..')

function run(cmd: string, args: string[], cwd: string): Promise<void> {
	return new Promise((res, rej) => {
		const p = spawn(cmd, args, { cwd, stdio: 'inherit' })
		p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))))
		p.on('error', rej)
	})
}

async function main() {
	const argv = process.argv.slice(2)
	const creExports: string[] = []
	let outputPath: string | null = null
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--cre-exports' && i + 1 < argv.length) {
			creExports.push(argv[i + 1])
			i++
		} else if (argv[i] === '-o' && i + 1 < argv.length) {
			outputPath = argv[i + 1]
			i++
		}
	}
	if (creExports.length === 0 || outputPath === null) {
		console.error('Usage: build-plugin.ts --cre-exports <path>... -o <output.plugin.wasm>')
		process.exit(1)
	}

	const tmpDir = resolve(pluginDir, '.tmp-plugin-' + Date.now())
	mkdirSync(tmpDir, { recursive: true })
	try {
		const extensions = resolveExtensions(creExports)
		generateHostCrate(tmpDir, pluginDir, extensions)

		await run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], tmpDir)

		let builtWasm = resolve(
			tmpDir,
			'target',
			'wasm32-wasip1',
			'release',
			'libcre_generated_host.wasm',
		)
		if (!existsSync(builtWasm)) {
			const alt = resolve(tmpDir, 'target', 'wasm32-wasip1', 'release', 'cre_generated_host.wasm')
			builtWasm = existsSync(alt) ? alt : builtWasm
		}
		if (!existsSync(builtWasm)) {
			throw new Error(`WASM not found`)
		}

		const javyPath = await ensureJavy({ version: 'v5.0.4' })
		const outAbs = resolve(process.cwd(), outputPath)
		mkdirSync(path.dirname(outAbs), { recursive: true })
		await run(javyPath, ['init-plugin', builtWasm, '-o', outAbs], tmpDir)
		console.info(`✅ Plugin built: ${outAbs}`)
	} finally {
		rmSync(tmpDir, { recursive: true, force: true })
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
