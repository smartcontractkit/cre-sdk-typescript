import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { assertWorkflowTypecheck, WorkflowTypecheckError } from './typecheck-workflow'

let tempDir: string

beforeEach(() => {
	tempDir = mkdtempSync(path.join(tmpdir(), 'cre-typecheck-test-'))
})

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true })
})

const writeTemp = (filename: string, content: string): string => {
	const filePath = path.join(tempDir, filename)
	mkdirSync(path.dirname(filePath), { recursive: true })
	writeFileSync(filePath, content, 'utf-8')
	return filePath
}

describe('assertWorkflowTypecheck', () => {
	test('passes for valid project using nearby tsconfig', () => {
		writeTemp(
			'tsconfig.json',
			JSON.stringify(
				{
					compilerOptions: {
						target: 'ES2022',
						module: 'ESNext',
						moduleResolution: 'Bundler',
						skipLibCheck: true,
					},
					include: ['src/**/*.ts'],
				},
				null,
				2,
			),
		)
		const entry = writeTemp('src/workflow.ts', 'export const value: number = 42\n')
		expect(() => assertWorkflowTypecheck(entry)).not.toThrow()
	})

	test('fails when tsconfig cannot be found', () => {
		const entry = writeTemp('src/workflow.ts', 'export const value = 1\n')
		expect(() => assertWorkflowTypecheck(entry)).toThrow(WorkflowTypecheckError)
		expect(() => assertWorkflowTypecheck(entry)).toThrow('Could not find tsconfig.json')
	})

	test('fails on whole-project type errors outside entry file', () => {
		writeTemp(
			'tsconfig.json',
			JSON.stringify(
				{
					compilerOptions: {
						target: 'ES2022',
						module: 'ESNext',
						moduleResolution: 'Bundler',
						skipLibCheck: true,
						strict: true,
					},
					include: ['src/**/*.ts'],
				},
				null,
				2,
			),
		)

		const entry = writeTemp('src/workflow.ts', 'export const value: number = 1\n')
		writeTemp('src/unrelated.ts', "export const shouldBeNumber: number = 'not-a-number'\n")

		expect(() => assertWorkflowTypecheck(entry)).toThrow(WorkflowTypecheckError)
		expect(() => assertWorkflowTypecheck(entry)).toThrow('unrelated.ts')
	})
})
