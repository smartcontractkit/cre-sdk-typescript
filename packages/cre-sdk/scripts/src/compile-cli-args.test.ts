import { describe, expect, test } from 'bun:test'
import { parseCompileCliArgs } from './compile-cli-args'

describe('parseCompileCliArgs', () => {
	test('parses positional input and output', () => {
		const parsed = parseCompileCliArgs(['src/workflow.ts', 'dist/workflow.wasm'])
		expect(parsed).toEqual({
			inputPath: 'src/workflow.ts',
			outputPath: 'dist/workflow.wasm',
			skipTypeChecks: false,
		})
	})

	test('parses --skip-type-checks flag', () => {
		const parsed = parseCompileCliArgs(['src/workflow.ts', '--skip-type-checks'])
		expect(parsed).toEqual({
			inputPath: 'src/workflow.ts',
			outputPath: undefined,
			skipTypeChecks: true,
		})
	})

	test('throws on unknown flags', () => {
		expect(() => parseCompileCliArgs(['src/workflow.ts', '--foo'])).toThrow('Unknown option: --foo')
	})

	test('throws on too many positional args', () => {
		expect(() =>
			parseCompileCliArgs(['src/workflow.ts', 'dist/workflow.wasm', 'extra']),
		).toThrow('Too many positional arguments.')
	})
})
