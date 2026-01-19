import * as ts from 'typescript'

/**
 * Wraps workflow code with automatic error boundary.
 * This function:
 * 1. Detects if `sendErrorResponse` import from `@chainlink/cre-sdk` exists in the workflow code.
 * 2. Detects if `main()` function is exported.
 * 3. Detects if there's already a top-level `main()` call with `.catch()` handler.
 * 4. Adds `sendErrorResponse` to imports if missing.
 * 5. Replaces top-level `main()` or `await main()` with `main().catch(sendErrorResponse)`.
 * 6. Appends `main().catch(sendErrorResponse)` only if no error handling exists and no call exists.
 *
 * @param sourceCode - The TypeScript source code to wrap
 * @param filePath - The file path (used for source file creation)
 * @returns The wrapped source code
 */
export function wrapWorkflowCode(sourceCode: string, filePath: string): string {
	const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true)

	// Analysis state
	let hasMainExport = false
	let hasExistingErrorHandling = false
	const mainCallStatements: { start: number; end: number; useAwait: boolean }[] = []

	// Helper to check if a node is a main() call expression
	const isMainCall = (node: ts.Node): boolean => {
		return (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'main'
		)
	}

	// Helper to check if a call expression is wrapped with .catch()
	const isWrappedWithCatch = (node: ts.Node): boolean => {
		if (ts.isCallExpression(node)) {
			const expr = node.expression
			if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'catch') {
				// Check if the object being called with .catch is main()
				return isMainCall(expr.expression)
			}
		}
		return false
	}

	const getMainCallFromExpression = (expr: ts.Expression): { useAwait: boolean } | null => {
		if (isMainCall(expr)) {
			return { useAwait: false }
		}
		if (ts.isAwaitExpression(expr) && isMainCall(expr.expression)) {
			return { useAwait: true }
		}
		return null
	}

	// First pass: analyze AST
	for (const statement of sourceFile.statements) {
		// Check for main() export
		if (ts.isFunctionDeclaration(statement) && statement.name?.text === 'main') {
			if (statement.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
				hasMainExport = true
			}
		}

		// Check for top-level main() call with error handling
		if (ts.isExpressionStatement(statement)) {
			const expr = statement.expression
			const exprToCheck = ts.isAwaitExpression(expr) ? expr.expression : expr

			// Check for main().catch(...)
			if (isWrappedWithCatch(exprToCheck)) {
				hasExistingErrorHandling = true
			}

			// Also check for: main().then(...).catch(...) or other chained patterns
			if (ts.isCallExpression(exprToCheck)) {
				// Walk the chain to find if there's a .catch anywhere
				let current: ts.Expression = exprToCheck
				while (ts.isCallExpression(current)) {
					const propAccess = current.expression
					if (ts.isPropertyAccessExpression(propAccess)) {
						if (propAccess.name.text === 'catch') {
							// Find if main() is somewhere in this chain
							let innerCurrent: ts.Expression = propAccess.expression
							while (ts.isCallExpression(innerCurrent)) {
								if (isMainCall(innerCurrent)) {
									hasExistingErrorHandling = true
									break
								}
								if (ts.isPropertyAccessExpression(innerCurrent.expression)) {
									innerCurrent = innerCurrent.expression.expression
								} else {
									break
								}
							}
						}
						current = propAccess.expression
					} else {
						break
					}
				}
			}

			if (!hasExistingErrorHandling) {
				const mainCall = getMainCallFromExpression(expr)
				if (mainCall) {
					mainCallStatements.push({
						start: statement.getStart(sourceFile),
						end: statement.end,
						useAwait: mainCall.useAwait,
					})
				}
			}
		}
	}

	// Build the transformed code
	let result = sourceCode

	if (!hasExistingErrorHandling && mainCallStatements.length > 0) {
		for (const statement of [...mainCallStatements].sort((a, b) => b.start - a.start)) {
			const replacement = `${statement.useAwait ? 'await ' : ''}main().catch(sendErrorResponse)`
			result = result.slice(0, statement.start) + replacement + result.slice(statement.end)
		}
	}

	// If we need to add sendErrorResponse import
	const nextSourceFile = ts.createSourceFile(filePath, result, ts.ScriptTarget.Latest, true)
	let hasSendErrorResponseImport = false
	let creSdkImportDeclaration: ts.ImportDeclaration | null = null

	for (const statement of nextSourceFile.statements) {
		// Check for @chainlink/cre-sdk import
		if (ts.isImportDeclaration(statement)) {
			const moduleSpecifier = statement.moduleSpecifier
			if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === '@chainlink/cre-sdk') {
				creSdkImportDeclaration = statement
				if (
					statement.importClause?.namedBindings &&
					ts.isNamedImports(statement.importClause.namedBindings)
				) {
					hasSendErrorResponseImport = statement.importClause.namedBindings.elements.some(
						(element) => element.name.text === 'sendErrorResponse',
					)
				}
			}
		}
	}

	if (!hasSendErrorResponseImport) {
		if (creSdkImportDeclaration) {
			// Add to existing import
			const importClause = creSdkImportDeclaration.importClause
			if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
				const elements = importClause.namedBindings.elements
				const lastElement = elements[elements.length - 1]
				const lastElementEnd = lastElement.end

				// Insert sendErrorResponse after the last import element
				result =
					result.slice(0, lastElementEnd) + ', sendErrorResponse' + result.slice(lastElementEnd)
			}
		} else {
			// Add new import at the beginning or after existing imports
			const importLine = "import { sendErrorResponse } from '@chainlink/cre-sdk'\n"

			// Find the last import declaration to insert after it
			let lastImportEnd = 0
			for (const statement of nextSourceFile.statements) {
				if (ts.isImportDeclaration(statement)) {
					lastImportEnd = statement.end
				}
			}

			if (lastImportEnd > 0) {
				// Insert after the last import, handling newlines
				const afterImport = result.slice(lastImportEnd)
				const leadingNewlines = afterImport.match(/^[\r\n]*/)?.[0] || ''
				result =
					result.slice(0, lastImportEnd) +
					leadingNewlines +
					importLine +
					afterImport.slice(leadingNewlines.length)
			} else {
				// No imports exist, add at the beginning
				result = importLine + result
			}
		}
	}

	// Append main().catch(sendErrorResponse) if no error handling exists
	if (!hasExistingErrorHandling && mainCallStatements.length === 0) {
		const trimmedResult = result.trimEnd()
		result = trimmedResult + '\n\nmain().catch(sendErrorResponse)\n'
	}

	return result
}
