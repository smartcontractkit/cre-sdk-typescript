import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateHostCrate, readCrateName, resolveExtensions } from './generate-host-crate'

describe('generate-host-crate', () => {
	describe('readCrateName', () => {
		test('reads crate name from Cargo.toml', () => {
			const pluginDir = join(import.meta.dir, '..')
			const cargoPath = join(pluginDir, 'src', 'javy_chainlink_sdk', 'Cargo.toml')
			expect(readCrateName(cargoPath)).toBe('javy_chainlink_sdk')
		})

		test('throws when Cargo.toml has no name', () => {
			const tmp = mkdtempSync(join(tmpdir(), 'cre-test-'))
			try {
				writeFileSync(join(tmp, 'Cargo.toml'), '[package]\nversion = "0.1.0"')
				expect(() => readCrateName(join(tmp, 'Cargo.toml'))).toThrow(/Could not find/)
			} finally {
				rmSync(tmp, { recursive: true })
			}
		})
	})

	describe('resolveExtensions', () => {
		test('resolves directory path to crate name and path', () => {
			const pluginDir = join(import.meta.dir, '..')
			const libAlphaDir = join(pluginDir, '..', 'cre-sdk-examples', 'rust-inject', 'lib_alpha')
			const resolved = resolveExtensions([libAlphaDir])
			expect(resolved).toHaveLength(1)
			expect(resolved[0].crateName).toBe('alpha')
			expect(resolved[0].path).toBe(libAlphaDir)
		})

		test('resolves Cargo.toml path', () => {
			const pluginDir = join(import.meta.dir, '..')
			const cargoPath = join(
				pluginDir,
				'..',
				'cre-sdk-examples',
				'rust-inject',
				'lib_alpha',
				'Cargo.toml',
			)
			const resolved = resolveExtensions([cargoPath])
			expect(resolved).toHaveLength(1)
			expect(resolved[0].crateName).toBe('alpha')
		})
	})

	describe('generateHostCrate', () => {
		test('requires at least one extension', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				expect(() => generateHostCrate(outDir, pluginDir, [])).toThrow(/at least one --cre-exports/)
			} finally {
				rmSync(outDir, { recursive: true })
			}
		})

		test('Cargo.toml uses path deps for javy_chainlink_sdk, cre_wasm_exports, and extensions', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const pluginDir = join(import.meta.dir, '..')
			const examplesDir = join(pluginDir, '..', 'cre-sdk-examples', 'rust-inject')
			const extensions = resolveExtensions([
				join(examplesDir, 'lib_alpha'),
				join(examplesDir, 'lib_beta'),
			])
			try {
				generateHostCrate(outDir, pluginDir, extensions)
				const cargo = readFileSync(join(outDir, 'Cargo.toml'), 'utf8')
				expect(cargo).toContain('name = "cre_generated_host"')
				expect(cargo).toContain('crate-type = ["cdylib"]')
				expect(cargo).toContain('javy-plugin-api = "6.0.0"')
				expect(cargo).toContain('javy = "7.0.0"')
				expect(cargo).toContain('javy_chainlink_sdk = { path')
				expect(cargo).toContain('cre_wasm_exports = { path')
				expect(cargo).toContain('alpha = { path')
				expect(cargo).toContain('lib_beta = { path')
				const libRs = readFileSync(join(outDir, 'src', 'lib.rs'), 'utf8')
				expect(libRs).toContain('alpha::register')
				expect(libRs).toContain('lib_beta::register')
				expect(libRs).toContain('cre_wasm_exports::reset_registry')
				expect(libRs).toContain('cre_wasm_exports::check_duplicates')
			} finally {
				rmSync(outDir, { recursive: true })
			}
		})
	})
})
