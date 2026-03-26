#!/usr/bin/env bun
/**
 * Generates a temporary host crate that statically links javy_chainlink_sdk + cre_wasm_exports + optional extensions.
 * Core crates use path dependencies into this package's `src/` (see pluginDir).
 * Used by compile-workflow.ts when `--cre-exports` is set.
 */

import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

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
 * Generates the host crate at outDir.
 * @param outDir - Directory to write Cargo.toml and src/lib.rs
 * @param pluginDir - Absolute path to packages/cre-sdk-javy-plugin (for path deps to src/javy_chainlink_sdk + src/cre_wasm_exports)
 * @param extensions - Extension crates (source trees, as returned by resolveExtensions)
 */
export function generateHostCrate(
	outDir: string,
	pluginDir: string,
	extensions: ExtensionInfo[] = [],
): void {
	if (extensions.length === 0) {
		throw new Error('generateHostCrate requires at least one --cre-exports extension')
	}

	mkdirSync(join(outDir, 'src'), { recursive: true })

	// Resolve pluginDir symlinks so all Cargo path deps use canonical real paths.
	// Without this, a node_modules symlink path and the real .packaged/ path would appear as
	// two different cre_wasm_exports packages to Cargo and cause a lockfile collision.
	const realPluginDir = realpathSync(resolve(pluginDir))
	const javySdkPath = resolve(realPluginDir, 'src', 'javy_chainlink_sdk')
	const creExportsPath = resolve(realPluginDir, 'src', 'cre_wasm_exports')

	const depLines = [
		`javy-plugin-api = "6.0.0"`,
		`javy = "7.0.0"`,
		// Disable the "standalone" default feature so javy_chainlink_sdk does NOT export
		// initialize-runtime; the host crate exports its own initialize-runtime instead.
		`javy_chainlink_sdk = { path = "${javySdkPath}", default-features = false }`,
		`cre_wasm_exports = { path = "${creExportsPath}" }`,
	]
	for (const ext of extensions) {
		depLines.push(`${ext.crateName} = { path = "${ext.path}" }`)
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

	const extensionRegisterLines = extensions
		.map((e) => `${e.crateName}::register(&ctx);`)
		.join('\n            ')

	const libRs = `use javy_plugin_api::Config;

// import_namespace!("javy_chainlink_sdk") is already emitted by the javy_chainlink_sdk path dep.
// Repeating it here would cause duplicate WIT namespace exports that break plugin initialisation.

// Must use export_name = "initialize-runtime" (hyphen, WIT style) so javy init-plugin calls this
// function instead of the javy_chainlink_sdk rlib's own initialize-runtime export.
#[allow(unsafe_code)]
#[unsafe(export_name = "initialize-runtime")]
pub unsafe extern "C" fn initialize_runtime() {
    javy_plugin_api::initialize_runtime(
        || {
            let mut config = Config::default();
            config.event_loop(true).text_encoding(true).promise(true);
            config
        },
        |runtime| {
            let runtime = javy_chainlink_sdk::modify_runtime(runtime);
            runtime.context().with(|ctx| {
                cre_wasm_exports::reset_registry();
                ${extensionRegisterLines}
                cre_wasm_exports::check_duplicates();
            });
            runtime
        },
    )
    .unwrap();
}
`

	writeFileSync(join(outDir, 'Cargo.toml'), cargoToml)
	writeFileSync(join(outDir, 'src', 'lib.rs'), libRs)
}
