#!/usr/bin/env bun
/**
 * Builds a Rust extension crate and extracts its rlib for distribution.
 *
 * Usage: build-rlib.ts --cre-exports <path> -o <output.rlib>
 *
 * The rlib can later be linked via --cre-rlib name=path when compiling a workflow,
 * enabling closed-source distribution of Rust extensions.
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path, { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
	let cratePath: string | null = null
	let outputPath: string | null = null
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--cre-exports' && i + 1 < argv.length) {
			cratePath = argv[i + 1]
			i++
		} else if (argv[i] === '-o' && i + 1 < argv.length) {
			outputPath = argv[i + 1]
			i++
		}
	}
	if (!cratePath || !outputPath) {
		console.error('Usage: build-rlib.ts --cre-exports <path-to-crate> -o <output.rlib>')
		process.exit(1)
	}

	const extensions = resolveExtensions([cratePath])
	const ext = extensions[0]
	console.info(`📦 Building rlib for crate: ${ext.crateName} (${ext.path})`)

	const tmpDir = resolve(pluginDir, '.tmp-rlib-' + Date.now())
	mkdirSync(tmpDir, { recursive: true })
	try {
		generateHostCrate(tmpDir, pluginDir, extensions)

		await run('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], tmpDir)

		const depsDir = resolve(tmpDir, 'target', 'wasm32-wasip1', 'release', 'deps')
		const rlibPattern = `lib${ext.crateName}-`
		const files = readdirSync(depsDir).filter(
			(f) => f.startsWith(rlibPattern) && f.endsWith('.rlib'),
		)
		if (files.length === 0) {
			throw new Error(`rlib not found for ${ext.crateName} in ${depsDir}`)
		}
		const rlibFile = files[0]
		const rlibSrc = resolve(depsDir, rlibFile)

		const outAbs = resolve(process.cwd(), outputPath)
		mkdirSync(path.dirname(outAbs), { recursive: true })
		copyFileSync(rlibSrc, outAbs)
		console.info(`✅ rlib built: ${outAbs}`)
	} finally {
		rmSync(tmpDir, { recursive: true, force: true })
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
