#!/usr/bin/env bun
/**
 * Generates a temporary host crate that statically links javy_chainlink_sdk + optional extensions.
 * Used by compile-workflow.ts and compile-javy-sdk-plugin.ts.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
 * Each path can be a directory containing Cargo.toml or the Cargo.toml file itself.
 */
export function resolveExtensions(extensionPaths: string[]): ExtensionInfo[] {
	return extensionPaths.map((p) => {
		const resolved = resolve(p)
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
 * @param pluginDir - Absolute path to packages/cre-sdk-javy-plugin (for path refs)
 * @param extensions - Optional extension crates to include
 */
export function generateHostCrate(
	outDir: string,
	pluginDir: string,
	extensions: ExtensionInfo[] = [],
): void {
	mkdirSync(join(outDir, 'src'), { recursive: true })

	const sdkPath = join(pluginDir, 'src', 'javy_chainlink_sdk')
	const creWasmExportsPath = join(pluginDir, 'src', 'cre_wasm_exports')

	const depLines = [
		`javy-plugin-api = "3.1.0"`,
		`javy_chainlink_sdk = { path = "${sdkPath}" }`,
		`cre_wasm_exports = { path = "${creWasmExportsPath}" }`,
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

	const registerCalls = [
		'cre_wasm_exports::reset_registry();',
		'javy_chainlink_sdk::register(&ctx);',
		...extensions.map((e) => `${e.crateName}::register(&ctx);`),
		'cre_wasm_exports::check_duplicates();',
	].join('\n            ')

	const libRs = `use javy_plugin_api::{import_namespace, Config};

import_namespace!("javy_chainlink_sdk");

#[allow(unsafe_code)]
#[unsafe(no_mangle)]
pub unsafe extern "C" fn initialize_runtime() {
    let mut config = Config::default();
    config.event_loop(true).text_encoding(true).promise(true);

    javy_plugin_api::initialize_runtime(config, |runtime| {
        javy_chainlink_sdk::setup_runtime(&runtime);
        runtime.context().with(|ctx| {
            ${registerCalls}
        });
        runtime
    })
    .unwrap();
}
`

	writeFileSync(join(outDir, 'Cargo.toml'), cargoToml)
	writeFileSync(join(outDir, 'src', 'lib.rs'), libRs)
}
