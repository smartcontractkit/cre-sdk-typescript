/**
 * Regression test for circular-dependency in the compiled barrel export.
 *
 * When users import both `@chainlink/cre-sdk/test` AND `@chainlink/cre-sdk`
 * (the standard pattern for writing tests), the ESM evaluation order can
 * trigger a circular dependency if generated files leave behind side-effectful
 * `import {} from '…/sdk'` (the residue of `import { type X }` under
 * verbatimModuleSyntax).  The symptom is:
 *
 *   ReferenceError: Cannot access 'RuntimeImpl' before initialization.
 *
 * Within the workspace, `@chainlink/cre-sdk/test` resolves to source via
 * tsconfig paths, masking the issue.  This test creates an isolated directory
 * with a node_modules symlink so both entry points resolve through the
 * compiled dist (matching npm consumers) to catch the cycle.
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
const tmpDir = mkdtempSync(join(tmpdir(), 'cre-sdk-barrel-test-'))

afterAll(() => {
	rmSync(tmpDir, { recursive: true, force: true })
})

describe('barrel import (end-user style)', () => {
	test('importing @chainlink/cre-sdk/test + @chainlink/cre-sdk together does not hit circular dependency', () => {
		mkdirSync(join(tmpDir, 'node_modules', '@chainlink'), { recursive: true })
		symlinkSync(pkgRoot, join(tmpDir, 'node_modules', '@chainlink', 'cre-sdk'))
		writeFileSync(
			join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'barrel-import-test', type: 'module' }),
		)

		const script = [
			"import { test, newTestRuntime } from '@chainlink/cre-sdk/test'",
			"import { Runner } from '@chainlink/cre-sdk'",
			'console.log(JSON.stringify({ Runner: typeof Runner, test: typeof test, newTestRuntime: typeof newTestRuntime }))',
		].join('\n')

		const result = spawnSync('bun', ['-e', script], { cwd: tmpDir })
		const stderr = result.stderr?.toString() ?? ''
		const stdout = result.stdout?.toString() ?? ''

		if (result.status !== 0) {
			throw new Error(`barrel import failed (status ${result.status}):\n${stderr}\n${stdout}`)
		}

		expect(stderr).not.toContain('ReferenceError')

		const output = JSON.parse(stdout)
		expect(output.Runner).toBe('function')
		expect(output.test).toBe('function')
		expect(output.newTestRuntime).toBe('function')
	})
})
