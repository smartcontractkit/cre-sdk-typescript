#!/usr/bin/env bun

/**
 * Generates a temporary host crate that statically links javy_chainlink_sdk + cre_wasm_exports + optional extensions.
 * Core crates use path dependencies into this package's `src/` (see pluginDir).
 * Used by compile-workflow.ts, build-plugin.ts, and the Dockerfile.
 */

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { semver } from 'bun'

/** Normalizes a path for use in TOML strings (backslashes → forward slashes). */
function toTomlPath(p: string): string {
	return p.replace(/\\/g, '/')
}

export interface ExtensionInfo {
	crateName: string
	path: string
}

/**
 * Reads the crate name from a Rust crate's Cargo.toml.
 */
export function readCrateName(cargoTomlPath: string): string {
	const content = readFileSync(cargoTomlPath, 'utf8')
	const match = content.match(/^name\s*=\s*"([^"]+)"/m)
	if (!match) {
		throw new Error(`Could not find [package] name in ${cargoTomlPath}`)
	}
	return match[1]
}

/**
 * Resolves extension paths to { crateName, path }.
 *
 * Accepts:
 *   - directory containing Cargo.toml (or path to Cargo.toml)
 */
export function resolveExtensions(extensionPaths: string[]): ExtensionInfo[] {
	return extensionPaths.map((p) => {
		// Resolve symlinks (e.g. node_modules file: symlinks) to canonical real paths so Cargo
		// lockfile entries match the real paths resolved by path deps in dependent crates.
		const resolved = realpathSync(resolve(p))

		let cargoPath = resolved
		if (!cargoPath.endsWith('Cargo.toml')) {
			cargoPath = join(resolved, 'Cargo.toml')
		}
		const crateName = readCrateName(cargoPath)
		const dir = cargoPath.endsWith('Cargo.toml') ? dirname(cargoPath) : resolved
		return { crateName, path: dir }
	})
}

/**
 * Parses the `channel` field from a rust-toolchain.toml file as a semver triple.
 * Returns null if the file doesn't exist or the channel isn't a simple x.y.z version.
 */
export function parseToolchainVersion(toolchainPath: string): [number, number, number] | null {
	if (!existsSync(toolchainPath)) return null
	const content = readFileSync(toolchainPath, 'utf8')
	const match = content.match(/^channel\s*=\s*"(\d+)\.(\d+)\.(\d+)"/m)
	if (!match) return null
	return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function versionString(v: [number, number, number]): string {
	return `${v[0]}.${v[1]}.${v[2]}`
}

/**
 * Resolves the Rust toolchain version to use for the generated host crate.
 * Takes the maximum of the SDK's pinned version and any extension crate rust-toolchain.toml files.
 * Always includes wasm32-wasip1 in targets.
 */
export function resolveToolchain(sdkToolchainPath: string, extensions: ExtensionInfo[]): string {
	const sdkVersion = parseToolchainVersion(sdkToolchainPath)
	if (!sdkVersion) {
		throw new Error(`SDK rust-toolchain.toml missing or has no semver channel: ${sdkToolchainPath}`)
	}

	let best = sdkVersion

	for (const ext of extensions) {
		const extToolchain = join(ext.path, 'rust-toolchain.toml')
		const extVersion = parseToolchainVersion(extToolchain)
		if (extVersion && semver.order(versionString(extVersion), versionString(best)) > 0) {
			best = extVersion
		}
	}

	return `[toolchain]\nchannel = "${versionString(best)}"\ntargets = ["wasm32-wasip1"]\n`
}

/**
 * Generates the host crate at outDir.
 * @param outDir - Directory to write Cargo.toml, src/lib.rs, and rust-toolchain.toml
 * @param pluginDir - Absolute path to packages/cre-sdk-javy-plugin (for path deps to src/javy_chainlink_sdk + src/cre_wasm_exports)
 * @param extensions - Extension crates (source trees, as returned by resolveExtensions). May be empty for the default standalone plugin.
 */
export function generateHostCrate(
	outDir: string,
	pluginDir: string,
	extensions: ExtensionInfo[] = [],
): void {
	for (const ext of extensions) {
		const libRsPath = join(ext.path, 'src', 'lib.rs')
		if (!existsSync(libRsPath)) {
			throw new Error(
				`Extension "${ext.crateName}" is missing src/lib.rs at ${ext.path}. ` +
					'Each --cre-exports crate must have a src/lib.rs file.',
			)
		}
		const src = readFileSync(libRsPath, 'utf8')
		if (!/pub\s+fn\s+register\s*\(/.test(src)) {
			throw new Error(
				`Extension "${ext.crateName}" does not export \`pub fn register(ctx: &Ctx<'_>)\` in ${libRsPath}. ` +
					'Each --cre-exports crate must expose this function for the generated host crate to call.',
			)
		}
	}

	mkdirSync(join(outDir, 'src'), { recursive: true })

	// Resolve pluginDir symlinks so all Cargo path deps use canonical real paths.
	// Without this, a node_modules symlink path and the real .packaged/ path would appear as
	// two different cre_wasm_exports packages to Cargo and cause a lockfile collision.
	const realPluginDir = realpathSync(resolve(pluginDir))
	const javySdkPath = toTomlPath(resolve(realPluginDir, 'src', 'javy_chainlink_sdk'))

	const depLines = [
		`javy-plugin-api = "6.0.0"`,
		`javy = "7.0.0"`,
		`javy_chainlink_sdk = { path = "${javySdkPath}" }`,
	]
	for (const ext of extensions) {
		depLines.push(`${ext.crateName} = { path = "${toTomlPath(ext.path)}" }`)
	}

	const cargoToml = `[package]
name = "cre_generated_host"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib"]

[dependencies]
${depLines.join('\n')}
`

	let extensionBlock = ''
	if (extensions.length > 0) {
		const registerLines = extensions
			.map((e) => `${e.crateName}::register(&ctx);`)
			.join('\n            ')
		extensionBlock = `
            runtime.context().with(|ctx| {
                ${registerLines}
            });`
	}

	const libRs = `// import_namespace!("javy_chainlink_sdk") is already emitted by the javy_chainlink_sdk path dep.
// Repeating it here would cause duplicate WIT namespace exports that break plugin initialisation.

#[allow(unsafe_code)]
#[unsafe(export_name = "initialize-runtime")]
pub unsafe extern "C" fn initialize_runtime() {
    javy_plugin_api::initialize_runtime(
        javy_chainlink_sdk::config,
        |runtime| {
            let runtime = javy_chainlink_sdk::modify_runtime(runtime);${extensionBlock}
            runtime
        },
    )
    .unwrap();
}
`

	writeFileSync(join(outDir, 'Cargo.toml'), cargoToml)
	writeFileSync(join(outDir, 'src', 'lib.rs'), libRs)

	const sdkToolchainPath = resolve(
		realPluginDir,
		'src',
		'javy_chainlink_sdk',
		'rust-toolchain.toml',
	)
	const toolchainContent = resolveToolchain(sdkToolchainPath, extensions)
	writeFileSync(join(outDir, 'rust-toolchain.toml'), toolchainContent)
}
