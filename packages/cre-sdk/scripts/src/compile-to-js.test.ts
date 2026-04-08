import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { main as compileToJs } from './compile-to-js'
import { WorkflowTypecheckError } from './typecheck-workflow'

let tempDir: string

beforeEach(() => {
	tempDir = mkdtempSync(path.join(process.cwd(), '.tmp-cre-compile-to-js-test-'))
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

describe('compile-to-js typecheck behavior', () => {
	test('fails on type errors by default', async () => {
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
						types: [],
						lib: ['ESNext'],
					},
					include: ['src/**/*.ts'],
				},
				null,
				2,
			),
		)
		const entry = writeTemp('src/workflow.ts', "export const shouldBeNumber: number = 'oops'\n")
		const output = path.join(tempDir, 'dist/workflow.js')

		await expect(compileToJs(entry, output)).rejects.toBeInstanceOf(WorkflowTypecheckError)
	})

	test('continues when --skip-type-checks is enabled', async () => {
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
						types: [],
						lib: ['ESNext'],
					},
					include: ['src/**/*.ts'],
				},
				null,
				2,
			),
		)
		const entry = writeTemp('src/workflow.ts', "export const shouldBeNumber: number = 'oops'\n")
		const output = path.join(tempDir, 'dist/workflow.js')

		let thrownError: unknown
		let result: string | undefined
		try {
			result = await compileToJs(entry, output, {
				skipTypeChecks: true,
			})
		} catch (error) {
			thrownError = error
		}

		expect(thrownError).not.toBeInstanceOf(WorkflowTypecheckError)
		if (typeof result === 'string') {
			expect(result).toEqual(output)
			expect(existsSync(output)).toBeTrue()
		}
	})
})
