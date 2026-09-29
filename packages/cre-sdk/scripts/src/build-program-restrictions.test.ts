import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const packageRoot = path.resolve(import.meta.dir, '../..')
const buildConfigPath = path.join(packageRoot, 'tsconfig.build.json')
const restrictedApisDts = path.join(packageRoot, 'src/sdk/types/restricted-apis.d.ts')
const restrictedNodeModulesDts = path.join(
	packageRoot,
	'src/sdk/types/restricted-node-modules.d.ts',
)

const formatDiagnostic = (diagnostic: ts.Diagnostic): string =>
	ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

const createBuildProgram = (extraRoot?: string): ts.Program => {
	let unrecoverableDiagnostic: ts.Diagnostic | null = null
	const parsed = ts.getParsedCommandLineOfConfigFile(
		buildConfigPath,
		{},
		{
			...ts.sys,
			onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
				unrecoverableDiagnostic = diagnostic
			},
		},
	)
	if (!parsed) {
		const details = unrecoverableDiagnostic ? formatDiagnostic(unrecoverableDiagnostic) : ''
		throw new Error(`Failed to parse tsconfig.build.json: ${details}`)
	}

	return ts.createProgram({
		rootNames: extraRoot != null ? [...parsed.fileNames, extraRoot] : parsed.fileNames,
		options: {
			...parsed.options,
			noEmit: true,
		},
	})
}

// tsconfig.build.json includes src/sdk/**/*, which pulls the restriction
// declarations into the SDK's own build program so that dist-bound source is
// checked against restricted Node.js modules and global APIs. A .ts stub
// sharing a name with a restriction .d.ts (e.g. one added to emit a subpath
// JS target) shadows the .d.ts in this program and silently removes that
// guard. These tests pin the guard.
describe('SDK build program restrictions', () => {
	test('includes the restriction declarations as program source files', () => {
		const program = createBuildProgram()

		expect(program.getSourceFile(restrictedApisDts)).toBeDefined()
		expect(program.getSourceFile(restrictedNodeModulesDts)).toBeDefined()
	})

	test('flags restricted Node module usage in SDK-style source', () => {
		const tempDir = mkdtempSync(path.join(packageRoot, '.tmp-build-restrictions-test-'))
		try {
			const syntheticPath = path.join(tempDir, 'restricted-usage.ts')
			writeFileSync(
				syntheticPath,
				[
					"import { readFileSync } from 'node:fs'",
					"export const content = readFileSync('x')",
					'',
				].join('\n'),
			)

			const program = createBuildProgram(syntheticPath)
			const diagnostics = ts
				.getPreEmitDiagnostics(program)
				.filter((diagnostic) => diagnostic.file?.fileName === syntheticPath)

			expect(diagnostics.length).toBeGreaterThan(0)

			const messages = diagnostics.map((diagnostic) =>
				ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
			)
			expect(messages.join('\n')).toContain('never')
		} finally {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})
})
