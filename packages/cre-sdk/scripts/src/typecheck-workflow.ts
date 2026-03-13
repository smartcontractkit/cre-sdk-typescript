import path from 'node:path'
import * as ts from 'typescript'
import { skipTypeChecksFlag } from './compile-cli-args'

const toAbsolutePath = (filePath: string) => path.resolve(filePath)

const formatDiagnostic = (diagnostic: ts.Diagnostic): string => {
	const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
	if (!diagnostic.file || diagnostic.start == null) {
		return message
	}

	const absoluteFilePath = toAbsolutePath(diagnostic.file.fileName)
	const relativeFilePath = path.relative(process.cwd(), absoluteFilePath)
	const displayPath = relativeFilePath || absoluteFilePath
	const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
	return `${displayPath}:${line + 1}:${character + 1} ${message}`
}

class WorkflowTypecheckError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'WorkflowTypecheckError'
	}
}

const findNearestTsconfigPath = (entryFilePath: string): string | null => {
	const configPath = ts.findConfigFile(
		path.dirname(entryFilePath),
		ts.sys.fileExists,
		'tsconfig.json',
	)
	return configPath ?? null
}

export const assertWorkflowTypecheck = (entryFilePath: string) => {
	const rootFile = toAbsolutePath(entryFilePath)
	const configPath = findNearestTsconfigPath(rootFile)
	if (!configPath) {
		throw new WorkflowTypecheckError(
			`TypeScript typecheck failed before workflow compilation.
Could not find tsconfig.json near: ${rootFile}
Create a tsconfig.json in your workflow project, or re-run compile with ${skipTypeChecksFlag}.`,
		)
	}

	let unrecoverableDiagnostic: ts.Diagnostic | null = null
	const parsedConfig = ts.getParsedCommandLineOfConfigFile(
		configPath,
		{},
		{
			...ts.sys,
			onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
				unrecoverableDiagnostic = diagnostic
			},
		},
	)

	if (!parsedConfig) {
		const details = unrecoverableDiagnostic ? formatDiagnostic(unrecoverableDiagnostic) : ''
		throw new WorkflowTypecheckError(
			`TypeScript typecheck failed before workflow compilation.
Failed to parse tsconfig.json: ${configPath}
${details}
Fix your tsconfig.json, or re-run compile with ${skipTypeChecksFlag}.`,
		)
	}

	const program = ts.createProgram({
		rootNames: parsedConfig.fileNames,
		options: {
			...parsedConfig.options,
			noEmit: true,
		},
		projectReferences: parsedConfig.projectReferences,
	})

	const diagnostics = [
		...parsedConfig.errors,
		...ts.getPreEmitDiagnostics(program),
	].filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)

	if (diagnostics.length > 0) {
		const formatted = diagnostics.map(formatDiagnostic).join('\n')
		const relativeConfigPath = path.relative(process.cwd(), toAbsolutePath(configPath))
		const displayConfigPath = relativeConfigPath || toAbsolutePath(configPath)
		throw new WorkflowTypecheckError(
			`TypeScript typecheck failed before workflow compilation.
Using tsconfig: ${displayConfigPath}
Fix TypeScript errors, or re-run compile with ${skipTypeChecksFlag}.

${formatted}`,
		)
	}
}

export { WorkflowTypecheckError }
