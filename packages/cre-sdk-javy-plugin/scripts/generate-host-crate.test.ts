import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	generateHostCrate,
	parseToolchainVersion,
	readCrateName,
	resolveExtensions,
	resolveToolchain,
} from './generate-host-crate'

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

	describe('parseToolchainVersion', () => {
		test('parses semver channel from rust-toolchain.toml', () => {
			const tmp = mkdtempSync(join(tmpdir(), 'cre-tc-'))
			try {
				writeFileSync(
					join(tmp, 'rust-toolchain.toml'),
					'[toolchain]\nchannel = "1.85.0"\ntargets = ["wasm32-wasip1"]\n',
				)
				expect(parseToolchainVersion(join(tmp, 'rust-toolchain.toml'))).toEqual([1, 85, 0])
			} finally {
				rmSync(tmp, { recursive: true })
			}
		})

		test('returns null for non-semver channel (nightly)', () => {
			const tmp = mkdtempSync(join(tmpdir(), 'cre-tc-'))
			try {
				writeFileSync(
					join(tmp, 'rust-toolchain.toml'),
					'[toolchain]\nchannel = "nightly-2024-01-01"\n',
				)
				expect(parseToolchainVersion(join(tmp, 'rust-toolchain.toml'))).toBeNull()
			} finally {
				rmSync(tmp, { recursive: true })
			}
		})

		test('returns null for missing file', () => {
			expect(parseToolchainVersion('/nonexistent/rust-toolchain.toml')).toBeNull()
		})
	})

	describe('resolveToolchain', () => {
		test('uses SDK version when no extensions have toolchain files', () => {
			const sdkDir = mkdtempSync(join(tmpdir(), 'cre-sdk-'))
			try {
				writeFileSync(
					join(sdkDir, 'rust-toolchain.toml'),
					'[toolchain]\nchannel = "1.85.0"\ntargets = ["wasm32-wasip1"]\n',
				)
				const result = resolveToolchain(join(sdkDir, 'rust-toolchain.toml'), [])
				expect(result).toContain('channel = "1.85.0"')
				expect(result).toContain('wasm32-wasip1')
			} finally {
				rmSync(sdkDir, { recursive: true })
			}
		})

		test('picks higher extension version over SDK', () => {
			const sdkDir = mkdtempSync(join(tmpdir(), 'cre-sdk-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			try {
				writeFileSync(join(sdkDir, 'rust-toolchain.toml'), '[toolchain]\nchannel = "1.85.0"\n')
				writeFileSync(join(extDir, 'rust-toolchain.toml'), '[toolchain]\nchannel = "1.87.0"\n')
				const result = resolveToolchain(join(sdkDir, 'rust-toolchain.toml'), [
					{ crateName: 'ext', path: extDir },
				])
				expect(result).toContain('channel = "1.87.0"')
			} finally {
				rmSync(sdkDir, { recursive: true })
				rmSync(extDir, { recursive: true })
			}
		})

		test('keeps SDK version when extension is older', () => {
			const sdkDir = mkdtempSync(join(tmpdir(), 'cre-sdk-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			try {
				writeFileSync(join(sdkDir, 'rust-toolchain.toml'), '[toolchain]\nchannel = "1.85.0"\n')
				writeFileSync(join(extDir, 'rust-toolchain.toml'), '[toolchain]\nchannel = "1.80.0"\n')
				const result = resolveToolchain(join(sdkDir, 'rust-toolchain.toml'), [
					{ crateName: 'ext', path: extDir },
				])
				expect(result).toContain('channel = "1.85.0"')
			} finally {
				rmSync(sdkDir, { recursive: true })
				rmSync(extDir, { recursive: true })
			}
		})

		test('ignores extensions with nightly channel', () => {
			const sdkDir = mkdtempSync(join(tmpdir(), 'cre-sdk-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			try {
				writeFileSync(join(sdkDir, 'rust-toolchain.toml'), '[toolchain]\nchannel = "1.85.0"\n')
				writeFileSync(join(extDir, 'rust-toolchain.toml'), '[toolchain]\nchannel = "nightly"\n')
				const result = resolveToolchain(join(sdkDir, 'rust-toolchain.toml'), [
					{ crateName: 'ext', path: extDir },
				])
				expect(result).toContain('channel = "1.85.0"')
			} finally {
				rmSync(sdkDir, { recursive: true })
				rmSync(extDir, { recursive: true })
			}
		})
	})

	describe('generateHostCrate', () => {
		test('generates host crate with zero extensions (standalone)', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				generateHostCrate(outDir, pluginDir, [])
				const cargo = readFileSync(join(outDir, 'Cargo.toml'), 'utf8')
				expect(cargo).toContain('name = "cre_generated_host"')
				expect(cargo).toContain('crate-type = ["cdylib"]')
				expect(cargo).toContain('javy_chainlink_sdk = { path')
				expect(cargo).not.toContain('cre_wasm_exports')
				const libRs = readFileSync(join(outDir, 'src', 'lib.rs'), 'utf8')
				expect(libRs).toContain('javy_chainlink_sdk::config')
				expect(libRs).toContain('javy_chainlink_sdk::modify_runtime')
				expect(libRs).not.toContain('register')
				expect(libRs).not.toContain('context().with')
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

		test('Cargo.toml uses path deps for javy_chainlink_sdk and extensions', () => {
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
				expect(cargo).toContain('alpha = { path')
				expect(cargo).toContain('lib_beta = { path')
				const libRs = readFileSync(join(outDir, 'src', 'lib.rs'), 'utf8')
				expect(libRs).toContain('alpha::register')
				expect(libRs).toContain('lib_beta::register')
				expect(libRs).toContain('javy_chainlink_sdk::config')
				expect(libRs).toContain('javy_chainlink_sdk::modify_runtime')
			} finally {
				rmSync(outDir, { recursive: true })
			}
		})

		test('writes rust-toolchain.toml with resolved version', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				generateHostCrate(outDir, pluginDir, [])
				const toolchainPath = join(outDir, 'rust-toolchain.toml')
				expect(existsSync(toolchainPath)).toBe(true)
				const content = readFileSync(toolchainPath, 'utf8')
				expect(content).toContain('wasm32-wasip1')
				expect(content).toMatch(/channel = "\d+\.\d+\.\d+"/)
			} finally {
				rmSync(outDir, { recursive: true })
			}
		})

		test('rust-toolchain.toml picks higher extension version', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				writeFileSync(
					join(extDir, 'Cargo.toml'),
					'[package]\nname = "newer_ext"\nversion = "0.1.0"',
				)
				mkdirSync(join(extDir, 'src'))
				writeFileSync(join(extDir, 'src', 'lib.rs'), 'pub fn register(_ctx: &()) {}')
				writeFileSync(join(extDir, 'rust-toolchain.toml'), '[toolchain]\nchannel = "1.99.0"\n')
				const extensions = [{ crateName: 'newer_ext', path: extDir }]
				generateHostCrate(outDir, pluginDir, extensions)
				const content = readFileSync(join(outDir, 'rust-toolchain.toml'), 'utf8')
				expect(content).toContain('channel = "1.99.0"')
			} finally {
				rmSync(outDir, { recursive: true })
				rmSync(extDir, { recursive: true })
			}
		})

		test('Cargo.toml does not use default-features = false', () => {
			const outDir = mkdtempSync(join(tmpdir(), 'cre-host-'))
			const extDir = mkdtempSync(join(tmpdir(), 'cre-ext-'))
			const pluginDir = join(import.meta.dir, '..')
			try {
				writeFileSync(join(extDir, 'Cargo.toml'), '[package]\nname = "test_ext"\nversion = "0.1.0"')
				mkdirSync(join(extDir, 'src'))
				writeFileSync(join(extDir, 'src', 'lib.rs'), 'pub fn register(_ctx: &()) {}')
				const extensions = [{ crateName: 'test_ext', path: extDir }]
				generateHostCrate(outDir, pluginDir, extensions)
				const cargo = readFileSync(join(outDir, 'Cargo.toml'), 'utf8')
				expect(cargo).not.toContain('default-features')
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
