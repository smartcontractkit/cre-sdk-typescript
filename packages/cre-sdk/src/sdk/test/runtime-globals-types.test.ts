/**
 * Regression test for runtime globals exposed through the published type surface.
 *
 * Requires a prior `bun run build` so dist/ exists.
 * `bun run full-checks` (and CI) always build before testing.
 */

import { afterAll, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const pkgRoot = resolve(import.meta.dir, '../../..')
const tscBin = resolve(pkgRoot, '../../node_modules/typescript/bin/tsc')
const tmpDir = mkdtempSync(join(tmpdir(), 'cre-sdk-runtime-globals-test-'))

afterAll(() => {
	rmSync(tmpDir, { recursive: true, force: true })
})

describe('runtime globals types (end-user style)', () => {
	test('published package exposes allowed globals without Node ambient types', () => {
		mkdirSync(join(tmpDir, 'node_modules', '@chainlink'), { recursive: true })
		symlinkSync(pkgRoot, join(tmpDir, 'node_modules', '@chainlink', 'cre-sdk'))
		writeFileSync(
			join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'runtime-globals-types-test', type: 'module' }),
		)
		writeFileSync(
			join(tmpDir, 'tsconfig.json'),
			JSON.stringify(
				{
					compilerOptions: {
						lib: ['ESNext'],
						module: 'ESNext',
						moduleResolution: 'Bundler',
						noEmit: true,
						skipLibCheck: true,
						target: 'ESNext',
						types: [],
					},
				},
				null,
				2,
			),
		)
		writeFileSync(
			join(tmpDir, 'workflow.ts'),
			[
				"import '@chainlink/cre-sdk'",
				"const payload = Buffer.from(new Uint8Array([1, 2, 3])).toString('base64')",
				"const copy = Buffer.concat([Buffer.from('hi'), Buffer.from(payload, 'base64')])",
				'const length = Buffer.byteLength(payload, "base64")',
				'const isBuffer = Buffer.isBuffer(copy)',
				'const decoded = atob(payload)',
				"const encoded = btoa('hello')",
				"const url = new URL('https://example.com/path?foo=bar')",
				'const params = new URLSearchParams({ foo: "bar" })',
				'void [length, isBuffer, decoded, encoded, url.hostname, params.toString()]',
				'// @ts-expect-error fetch is intentionally unavailable in CRE workflows',
				"fetch('https://example.com')",
				"import { readFileSync } from 'node:fs'",
				'// @ts-expect-error node:fs exports are intentionally unavailable in CRE workflows',
				"readFileSync('/tmp/test.txt', 'utf8')",
				'export {}',
			].join('\n'),
		)

		const result = spawnSync('bun', [tscBin, '--project', join(tmpDir, 'tsconfig.json')], {
			cwd: tmpDir,
		})
		const stderr = result.stderr?.toString() ?? ''
		const stdout = result.stdout?.toString() ?? ''

		if (result.status !== 0) {
			throw new Error(
				`runtime globals typecheck failed (status ${result.status}):\n${stderr}\n${stdout}`,
			)
		}

		expect(stderr).toBe('')
	})
})
