import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

type Violation = {
	filePath: string
	line: number
	column: number
	message: string
}

const restrictedModuleSpecifiers = new Set([
	'crypto',
	'node:crypto',
	'fs',
	'node:fs',
	'fs/promises',
	'node:fs/promises',
	'net',
	'node:net',
	'http',
	'node:http',
	'https',
	'node:https',
	'child_process',
	'node:child_process',
	'os',
	'node:os',
	'stream',
	'node:stream',
	'worker_threads',
	'node:worker_threads',
	'dns',
	'node:dns',
	'zlib',
	'node:zlib',
])

const restrictedGlobalApis = new Set([
	'fetch',
	'window',
	'document',
	'XMLHttpRequest',
	'localStorage',
	'sessionStorage',
	'setTimeout',
	'setInterval',
])

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']

class WorkflowRuntimeCompatibilityError extends Error {
	constructor(violations: Violation[]) {
		const sortedViolations = [...violations].sort((a, b) => {
			if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath)
			if (a.line !== b.line) return a.line - b.line
			return a.column - b.column
		})

		const formattedViolations = sortedViolations
			.map((violation) => {
				const relativePath = path.relative(process.cwd(), violation.filePath)
				return `- ${relativePath}:${violation.line}:${violation.column} ${violation.message}`
			})
			.join('\n')

		super(
			'Unsupported API usage found in workflow source.\n' +
				'CRE workflows run on Javy (QuickJS), not full Node.js.\n' +
				'Use CRE capabilities instead (for example, HTTPClient instead of fetch/node:http).\n' +
				'See https://docs.chain.link/cre/concepts/typescript-wasm-runtime\n\n' +
				formattedViolations,
		)
		this.name = 'WorkflowRuntimeCompatibilityError'
	}
}

const toAbsolutePath = (filePath: string) => path.resolve(filePath)

const getScriptKind = (filePath: string): ts.ScriptKind => {
	switch (path.extname(filePath).toLowerCase()) {
		case '.js':
			return ts.ScriptKind.JS
		case '.jsx':
			return ts.ScriptKind.JSX
		case '.mjs':
			return ts.ScriptKind.JS
		case '.cjs':
			return ts.ScriptKind.JS
		case '.tsx':
			return ts.ScriptKind.TSX
		case '.mts':
			return ts.ScriptKind.TS
		case '.cts':
			return ts.ScriptKind.TS
		default:
			return ts.ScriptKind.TS
	}
}

const createViolation = (
	filePath: string,
	pos: number,
	sourceFile: ts.SourceFile,
	message: string,
): Violation => {
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos)
	return {
		filePath: toAbsolutePath(filePath),
		line: line + 1,
		column: character + 1,
		message,
	}
}

const isRelativeImport = (specifier: string) => {
	return specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')
}

const resolveRelativeImport = (fromFilePath: string, specifier: string): string | null => {
	const basePath = specifier.startsWith('/')
		? path.resolve(specifier)
		: path.resolve(path.dirname(fromFilePath), specifier)

	if (existsSync(basePath)) {
		return toAbsolutePath(basePath)
	}

	for (const extension of sourceExtensions) {
		const withExtension = `${basePath}${extension}`
		if (existsSync(withExtension)) {
			return toAbsolutePath(withExtension)
		}
	}

	for (const extension of sourceExtensions) {
		const asIndex = path.join(basePath, `index${extension}`)
		if (existsSync(asIndex)) {
			return toAbsolutePath(asIndex)
		}
	}

	return null
}

const getStringLiteralFromCall = (node: ts.CallExpression): string | null => {
	const [firstArg] = node.arguments
	if (!firstArg || !ts.isStringLiteral(firstArg)) return null
	return firstArg.text
}

const collectModuleUsage = (
	sourceFile: ts.SourceFile,
	filePath: string,
	violations: Violation[],
	enqueueFile: (nextFile: string) => void,
) => {
	const checkModuleSpecifier = (specifier: string, pos: number) => {
		if (restrictedModuleSpecifiers.has(specifier)) {
			violations.push(
				createViolation(
					filePath,
					pos,
					sourceFile,
					`'${specifier}' is not available in CRE workflow runtime.`,
				),
			)
		}

		if (!isRelativeImport(specifier)) return
		const resolved = resolveRelativeImport(filePath, specifier)
		if (resolved) {
			enqueueFile(resolved)
		}
	}

	const visit = (node: ts.Node) => {
		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			checkModuleSpecifier(node.moduleSpecifier.text, node.moduleSpecifier.getStart(sourceFile))
		}

		if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			checkModuleSpecifier(node.moduleSpecifier.text, node.moduleSpecifier.getStart(sourceFile))
		}

		if (
			ts.isImportEqualsDeclaration(node) &&
			ts.isExternalModuleReference(node.moduleReference) &&
			node.moduleReference.expression &&
			ts.isStringLiteral(node.moduleReference.expression)
		) {
			checkModuleSpecifier(
				node.moduleReference.expression.text,
				node.moduleReference.expression.getStart(sourceFile),
			)
		}

		if (ts.isCallExpression(node)) {
			if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
				const requiredModule = getStringLiteralFromCall(node)
				if (requiredModule) {
					checkModuleSpecifier(requiredModule, node.arguments[0].getStart(sourceFile))
				}
			}

			if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
				const importedModule = getStringLiteralFromCall(node)
				if (importedModule) {
					checkModuleSpecifier(importedModule, node.arguments[0].getStart(sourceFile))
				}
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(sourceFile)
}

const isDeclarationName = (identifier: ts.Identifier): boolean => {
	const parent = identifier.parent

	if (
		(ts.isFunctionDeclaration(parent) && parent.name === identifier) ||
		(ts.isFunctionExpression(parent) && parent.name === identifier) ||
		(ts.isClassDeclaration(parent) && parent.name === identifier) ||
		(ts.isClassExpression(parent) && parent.name === identifier) ||
		(ts.isInterfaceDeclaration(parent) && parent.name === identifier) ||
		(ts.isTypeAliasDeclaration(parent) && parent.name === identifier) ||
		(ts.isEnumDeclaration(parent) && parent.name === identifier) ||
		(ts.isModuleDeclaration(parent) && parent.name === identifier) ||
		(ts.isTypeParameterDeclaration(parent) && parent.name === identifier) ||
		(ts.isVariableDeclaration(parent) && parent.name === identifier) ||
		(ts.isParameter(parent) && parent.name === identifier) ||
		(ts.isBindingElement(parent) && parent.name === identifier) ||
		(ts.isImportClause(parent) && parent.name === identifier) ||
		(ts.isImportSpecifier(parent) && parent.name === identifier) ||
		(ts.isNamespaceImport(parent) && parent.name === identifier) ||
		(ts.isImportEqualsDeclaration(parent) && parent.name === identifier) ||
		(ts.isNamespaceExport(parent) && parent.name === identifier) ||
		(ts.isEnumMember(parent) && parent.name === identifier) ||
		(ts.isPropertyDeclaration(parent) && parent.name === identifier) ||
		(ts.isPropertySignature(parent) && parent.name === identifier) ||
		(ts.isMethodDeclaration(parent) && parent.name === identifier) ||
		(ts.isMethodSignature(parent) && parent.name === identifier) ||
		(ts.isGetAccessorDeclaration(parent) && parent.name === identifier) ||
		(ts.isSetAccessorDeclaration(parent) && parent.name === identifier) ||
		(ts.isPropertyAssignment(parent) && parent.name === identifier) ||
		(ts.isShorthandPropertyAssignment(parent) && parent.name === identifier) ||
		(ts.isLabeledStatement(parent) && parent.label === identifier)
	) {
		return true
	}

	if (
		(ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
		(ts.isQualifiedName(parent) && parent.right === identifier) ||
		(ts.isTypeReferenceNode(parent) && parent.typeName === identifier)
	) {
		return true
	}

	return false
}

const collectGlobalApiUsage = (
	program: ts.Program,
	localSourceFiles: Set<string>,
	violations: Violation[],
) => {
	const checker = program.getTypeChecker()

	for (const sourceFile of program.getSourceFiles()) {
		const resolvedSourcePath = toAbsolutePath(sourceFile.fileName)
		if (!localSourceFiles.has(resolvedSourcePath)) continue

		const visit = (node: ts.Node) => {
			if (
				ts.isIdentifier(node) &&
				restrictedGlobalApis.has(node.text) &&
				!isDeclarationName(node)
			) {
				const symbol = checker.getSymbolAtLocation(node)
				const hasLocalDeclaration =
					symbol?.declarations?.some((declaration) =>
						localSourceFiles.has(toAbsolutePath(declaration.getSourceFile().fileName)),
					) ?? false

				if (!hasLocalDeclaration) {
					violations.push(
						createViolation(
							resolvedSourcePath,
							node.getStart(sourceFile),
							sourceFile,
							`'${node.text}' is not available in CRE workflow runtime.`,
						),
					)
				}
			}

			if (
				ts.isPropertyAccessExpression(node) &&
				ts.isIdentifier(node.expression) &&
				node.expression.text === 'globalThis' &&
				restrictedGlobalApis.has(node.name.text)
			) {
				violations.push(
					createViolation(
						resolvedSourcePath,
						node.name.getStart(sourceFile),
						sourceFile,
						`'globalThis.${node.name.text}' is not available in CRE workflow runtime.`,
					),
				)
			}

			ts.forEachChild(node, visit)
		}

		visit(sourceFile)
	}
}

export const assertWorkflowRuntimeCompatibility = (entryFilePath: string) => {
	const rootFile = toAbsolutePath(entryFilePath)
	const filesToScan = [rootFile]
	const scannedFiles = new Set<string>()
	const localSourceFiles = new Set<string>()
	const violations: Violation[] = []

	while (filesToScan.length > 0) {
		const currentFile = filesToScan.pop()
		if (!currentFile || scannedFiles.has(currentFile)) continue
		scannedFiles.add(currentFile)

		if (!existsSync(currentFile)) continue
		localSourceFiles.add(currentFile)

		const fileContents = readFileSync(currentFile, 'utf-8')
		const sourceFile = ts.createSourceFile(
			currentFile,
			fileContents,
			ts.ScriptTarget.Latest,
			true,
			getScriptKind(currentFile),
		)

		collectModuleUsage(sourceFile, currentFile, violations, (nextFile) => {
			if (!scannedFiles.has(nextFile)) {
				filesToScan.push(nextFile)
			}
		})
	}

	const program = ts.createProgram({
		rootNames: [...localSourceFiles],
		options: {
			allowJs: true,
			checkJs: true,
			noEmit: true,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
		},
	})

	collectGlobalApiUsage(program, localSourceFiles, violations)

	if (violations.length > 0) {
		throw new WorkflowRuntimeCompatibilityError(violations)
	}
}

export { WorkflowRuntimeCompatibilityError }
