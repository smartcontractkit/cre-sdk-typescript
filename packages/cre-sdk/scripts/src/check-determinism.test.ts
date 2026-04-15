import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

let tempDir: string

const scriptsDir = path.resolve(import.meta.dir, '..')
const runScript = path.join(scriptsDir, 'run.ts')

beforeEach(() => {
	tempDir = mkdtempSync(path.join(tmpdir(), 'cre-check-determinism-test-'))
})

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true })
})

const runCheckDeterminism = (filePath: string) =>
	spawnSync(process.execPath, [runScript, 'check-determinism', filePath], {
		cwd: scriptsDir,
		encoding: 'utf-8',
	})

describe('check-determinism CLI', () => {
	test('fails when the input file does not exist', () => {
		const missingFile = path.join(tempDir, 'does-not-exist.ts')
		const result = runCheckDeterminism(missingFile)

		expect(result.status).toBe(1)
		expect(result.stdout).not.toContain('No non-determinism warnings found.')
		expect(result.stderr).toContain(`❌ File not found: ${missingFile}`)
	})

	test('prints warnings for non-deterministic patterns and exits 0', () => {
		const filePath = path.join(tempDir, 'workflow.ts')
		writeFileSync(filePath, `const result = await Promise.race([]);\n`, 'utf-8')
		const result = runCheckDeterminism(filePath)

		expect(result.status).toBe(0)
		expect(result.stderr).toContain('Non-determinism warnings')
		expect(result.stderr).toContain('Promise.race()')
	})

	test('prints success message for clean workflow and exits 0', () => {
		const filePath = path.join(tempDir, 'workflow.ts')
		writeFileSync(filePath, `const x = 1;\n`, 'utf-8')
		const result = runCheckDeterminism(filePath)

		expect(result.status).toBe(0)
		expect(result.stdout).toContain('No non-determinism warnings found.')
	})

	test('fails when no input file is provided', () => {
		const result = spawnSync(process.execPath, [runScript, 'check-determinism'], {
			cwd: scriptsDir,
			encoding: 'utf-8',
		})

		expect(result.status).toBe(1)
		expect(result.stderr).toContain('Usage:')
	})
})
