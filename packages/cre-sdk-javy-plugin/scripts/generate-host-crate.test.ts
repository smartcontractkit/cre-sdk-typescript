import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

		test('throws when extension is missing src/lib.rs', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				writeFileSync(join(extDir, 'Cargo.toml'), '[package]\nname = "bad_ext"\nversion = "0.1.0"')
				const extensions = [{ crateName: 'bad_ext', path: extDir }]
				expect(() => generateHostCrate(outDir, pluginDir, extensions)).toThrow(
					/missing src\/lib\.rs/,
				)
			} finally {
				rmSync(outDir, { recursive: true })
				rmSync(extDir, { recursive: true })
			}
		})

		test('throws when extension lacks pub fn register', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				writeFileSync(join(extDir, 'Cargo.toml'), '[package]\nname = "no_reg"\nversion = "0.1.0"')
				mkdirSync(join(extDir, 'src'))
				writeFileSync(join(extDir, 'src', 'lib.rs'), 'pub fn init() {}')
				const extensions = [{ crateName: 'no_reg', path: extDir }]
				expect(() => generateHostCrate(outDir, pluginDir, extensions)).toThrow(
					/does not export.*pub fn register/,
				)
			} finally {
				rmSync(outDir, { recursive: true })
				rmSync(extDir, { recursive: true })
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
				expect(libRs).toContain('javy_chainlink_sdk::config')
				expect(libRs).toContain('javy_chainlink_sdk::modify_runtime')
			} finally {
				rmSync(outDir, { recursive: true })
			}
		})

		test('copies rust-toolchain.toml into generated crate', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				writeFileSync(
					join(extDir, 'Cargo.toml'),
					'[package]\nname = "toolchain_ext"\nversion = "0.1.0"',
				)
				mkdirSync(join(extDir, 'src'))
				writeFileSync(join(extDir, 'src', 'lib.rs'), 'pub fn register(_ctx: &()) {}')
				const extensions = [{ crateName: 'toolchain_ext', path: extDir }]
				generateHostCrate(outDir, pluginDir, extensions)
				const toolchainPath = join(outDir, 'rust-toolchain.toml')
				expect(existsSync(toolchainPath)).toBe(true)
				const content = readFileSync(toolchainPath, 'utf8')
				expect(content).toContain('wasm32-wasip1')
			} finally {
				rmSync(outDir, { recursive: true })
				rmSync(extDir, { recursive: true })
			}
		})

		test('generated Cargo.toml paths use forward slashes', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const pluginDir = join(import.meta.dir, '..')
			const examplesDir = join(pluginDir, '..', 'cre-sdk-examples', 'rust-inject')
			const extensions = resolveExtensions([join(examplesDir, 'lib_alpha')])
			try {
				generateHostCrate(outDir, pluginDir, extensions)
				const cargo = readFileSync(join(outDir, 'Cargo.toml'), 'utf8')
				expect(cargo).not.toMatch(/path = "[^"]*\\/)
			} finally {
				rmSync(outDir, { recursive: true })
			}
		})
	})
})
