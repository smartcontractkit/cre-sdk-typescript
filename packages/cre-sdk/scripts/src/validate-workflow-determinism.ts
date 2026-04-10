/**
 * Workflow Determinism Warning Analyzer
 *
 * CRE workflows execute on a Decentralized Oracle Network (DON) where multiple
 * nodes must reach consensus. Non-deterministic patterns — code that can produce
 * different results on different nodes — may prevent consensus.
 *
 * This module performs **static analysis** on workflow source code to detect
 * patterns that are likely non-deterministic and warns developers at build time.
 * Unlike the runtime compatibility validator, this module produces **warnings**
 * that do not block compilation.
 *
 * ## Detected patterns
 *
 * - `Promise.race()` / `Promise.any()` / `Promise.all()` — concurrent execution, timing-dependent
 * - `Date.now()` / `new Date()` — system clock varies across nodes
 * - `for...in` loops — iteration order is not guaranteed by the spec
 * - `Object.keys()` / `Object.values()` / `Object.entries()` without `.sort()`
 *
 * ## What is NOT detected
 *
 * - `Math.random()` — the Javy plugin overrides it with a seeded ChaCha8 CSPRNG
 *   that is deterministic in NODE mode. Safe by design.
 *
 * @see https://docs.chain.link/cre/concepts/non-determinism-ts
 */

import * as ts from 'typescript'
import {
	collectLocalSourceFiles,
	createValidationProgram,
	createViolation,
	formatViolations,
	toAbsolutePath,
	type Violation,
} from './validate-shared'

const DOCS_URL = 'https://docs.chain.link/cre/concepts/non-determinism-ts'

/**
 * A global object reference can be accessed directly (`Date`) or via
 * `globalThis.Date`.
 */
type GlobalObjectReference = {
	identifier: ts.Identifier
}

const bindingNameContains = (bindingName: ts.BindingName, name: string): boolean => {
	if (ts.isIdentifier(bindingName)) {
		return bindingName.text === name
	}

	if (ts.isObjectBindingPattern(bindingName)) {
		return bindingName.elements.some((element) => bindingNameContains(element.name, name))
	}

	return bindingName.elements.some(
		(element) => !ts.isOmittedExpression(element) && bindingNameContains(element.name, name),
	)
}

const importClauseDeclaresName = (importClause: ts.ImportClause, name: string): boolean => {
	if (importClause.name?.text === name) {
		return true
	}

	const namedBindings = importClause.namedBindings
	if (!namedBindings) {
		return false
	}

	if (ts.isNamespaceImport(namedBindings)) {
		return namedBindings.name.text === name
	}

	return namedBindings.elements.some((element) => element.name.text === name)
}

const variableDeclarationListDeclaresName = (
	declarationList: ts.VariableDeclarationList,
	name: string,
): boolean =>
	declarationList.declarations.some((declaration) => bindingNameContains(declaration.name, name))

const statementDeclaresRuntimeName = (statement: ts.Statement, name: string): boolean => {
	if (ts.isVariableStatement(statement)) {
		return variableDeclarationListDeclaresName(statement.declarationList, name)
	}

	if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
		return statement.name?.text === name
	}

	if (ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) {
		return statement.name.text === name
	}

	if (ts.isImportDeclaration(statement) && statement.importClause) {
		return importClauseDeclaresName(statement.importClause, name)
	}

	if (ts.isImportEqualsDeclaration(statement)) {
		return statement.name.text === name
	}

	if (
		(ts.isForStatement(statement) ||
			ts.isForInStatement(statement) ||
			ts.isForOfStatement(statement)) &&
		statement.initializer &&
		ts.isVariableDeclarationList(statement.initializer)
	) {
		return variableDeclarationListDeclaresName(statement.initializer, name)
	}

	if (ts.isSwitchStatement(statement)) {
		return statement.caseBlock.clauses.some((clause) =>
			clause.statements.some((clauseStatement) =>
				statementDeclaresRuntimeName(clauseStatement, name),
			),
		)
	}

	return false
}

/**
 * Checks whether a name is shadowed by a declaration that is actually visible
 * at the current use site. This avoids suppressing warnings due to unrelated
 * declarations in nested scopes elsewhere in the file.
 */
const hasLocalDeclarationInScope = (
	name: string,
	referenceNode: ts.Node,
	currentSourceFile: ts.SourceFile,
): boolean => {
	let current: ts.Node | undefined = referenceNode

	while (current) {
		if (
			(ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current)) &&
			current.name &&
			ts.isIdentifier(current.name) &&
			current.name.text === name
		) {
			return true
		}

		if (
			(ts.isClassDeclaration(current) || ts.isClassExpression(current)) &&
			current.name &&
			ts.isIdentifier(current.name) &&
			current.name.text === name
		) {
			return true
		}

		if (
			ts.isFunctionLike(current) &&
			current.parameters.some((param) => bindingNameContains(param.name, name))
		) {
			return true
		}

		if (ts.isCatchClause(current) && current.variableDeclaration) {
			if (bindingNameContains(current.variableDeclaration.name, name)) {
				return true
			}
		}

		if (
			(ts.isForStatement(current) ||
				ts.isForInStatement(current) ||
				ts.isForOfStatement(current)) &&
			current.initializer &&
			ts.isVariableDeclarationList(current.initializer)
		) {
			if (variableDeclarationListDeclaresName(current.initializer, name)) {
				return true
			}
		}

		if (ts.isSourceFile(current) || ts.isBlock(current) || ts.isModuleBlock(current)) {
			const refPos = referenceNode.pos
			if (
				current.statements.some((statement) => {
					if (!statementDeclaresRuntimeName(statement, name)) return false
					// Function declarations and imports are hoisted / always visible in scope.
					if (
						ts.isFunctionDeclaration(statement) ||
						ts.isImportDeclaration(statement) ||
						ts.isImportEqualsDeclaration(statement)
					) {
						return true
					}
					// Other declarations (const, let, var, class) are only a shadow once
					// they have been fully declared — i.e. the statement ends before the usage.
					return statement.end <= refPos
				})
			) {
				return true
			}
		}

		if (ts.isSwitchStatement(current)) {
			const refPos = referenceNode.pos
			if (
				current.caseBlock.clauses.some((clause) =>
					clause.statements.some((statement) => {
						if (!statementDeclaresRuntimeName(statement, name)) return false
						if (
							ts.isFunctionDeclaration(statement) ||
							ts.isImportDeclaration(statement) ||
							ts.isImportEqualsDeclaration(statement)
						) {
							return true
						}
						return statement.end <= refPos
					}),
				)
			) {
				return true
			}
		}

		if (current === currentSourceFile) {
			break
		}

		current = current.parent
	}

	return false
}

const hasLocalDeclarationViaChecker = (
	identifier: ts.Identifier,
	checker: ts.TypeChecker,
	localSourceFiles: Set<string>,
): boolean => {
	const symbol = checker.getSymbolAtLocation(identifier)
	return (
		symbol?.declarations?.some((declaration) => {
			if (!localSourceFiles.has(toAbsolutePath(declaration.getSourceFile().fileName))) {
				return false
			}
			// Function declarations and import bindings are hoisted / available throughout
			// their scope — always count as a shadow regardless of position.
			if (
				ts.isFunctionDeclaration(declaration) ||
				ts.isImportClause(declaration) ||
				ts.isImportSpecifier(declaration) ||
				ts.isNamespaceImport(declaration) ||
				ts.isImportEqualsDeclaration(declaration)
			) {
				return true
			}
			// const / let / var / class are only visible once their declaration is complete.
			// A usage that appears before the declaration (e.g. due to TDZ) still refers
			// to the global, so do not suppress the warning.
			return declaration.end <= identifier.pos
		}) ?? false
	)
}

const getGlobalObjectReference = (
	expression: ts.LeftHandSideExpression,
	objectName: string,
): GlobalObjectReference | null => {
	if (ts.isIdentifier(expression) && expression.text === objectName) {
		return { identifier: expression }
	}

	if (
		ts.isPropertyAccessExpression(expression) &&
		ts.isIdentifier(expression.expression) &&
		expression.expression.text === 'globalThis' &&
		expression.name.text === objectName
	) {
		return { identifier: expression.expression }
	}

	return null
}

/**
 * Determines whether an expression resolves to a true global object (e.g.
 * `Date`, `Promise`, `Object`) rather than a user-defined local with the
 * same name.
 *
 * Uses a two-layer approach:
 * 1. **Type-checker** (`hasLocalDeclarationViaChecker`) — the authoritative
 *    source when the checker can resolve the symbol. This handles most TS
 *    files with full type information.
 * 2. **AST scope walk** (`hasLocalDeclarationInScope`) — a syntactic fallback
 *    for cases where the type-checker cannot resolve the symbol (e.g. loose
 *    JS files, files outside the compilation root, or declaration-less
 *    globals). This mirrors the scoping rules manually so we still suppress
 *    warnings for locally-shadowed names.
 *
 * The runtime compat validator only needs the type-checker layer because it
 * checks simple identifier names (`fetch`, `setTimeout`). This validator
 * additionally needs the AST fallback because it checks property-access
 * patterns on globals (`Date.now()`, `Promise.race()`) where the root
 * identifier may not have a resolvable symbol.
 */
const resolvesToGlobalObject = (
	expression: ts.LeftHandSideExpression,
	objectName: string,
	checker: ts.TypeChecker,
	localSourceFiles: Set<string>,
	currentSourceFile: ts.SourceFile,
): boolean => {
	const reference = getGlobalObjectReference(expression, objectName)
	if (!reference) {
		return false
	}

	if (hasLocalDeclarationViaChecker(reference.identifier, checker, localSourceFiles)) {
		return false
	}

	const fallbackName = reference.identifier.text
	return !hasLocalDeclarationInScope(fallbackName, reference.identifier, currentSourceFile)
}

/**
 * Checks whether a `CallExpression` is a method call on a global object.
 * For example, `Promise.race(...)` or `globalThis.Promise.race(...)`.
 *
 * Returns the method name if matched, otherwise `null`.
 */
const getGlobalMethodCall = (
	node: ts.CallExpression,
	objectName: string,
	methodNames: Set<string>,
	checker: ts.TypeChecker,
	localSourceFiles: Set<string>,
	currentSourceFile: ts.SourceFile,
): string | null => {
	if (!ts.isPropertyAccessExpression(node.expression)) return null

	const propAccess = node.expression
	if (!methodNames.has(propAccess.name.text)) return null
	if (
		!resolvesToGlobalObject(
			propAccess.expression,
			objectName,
			checker,
			localSourceFiles,
			currentSourceFile,
		)
	) {
		return null
	}

	return propAccess.name.text
}

/**
 * Checks whether a call to `Object.keys/values/entries()` is followed anywhere
 * in the method chain by `.sort()` or `.toSorted()`, which makes the iteration
 * order deterministic.
 *
 * Handles both direct chaining (`Object.keys(obj).sort()`) and intermediate
 * calls (`Object.keys(obj).filter(...).sort()`). A `.sort()` that appears after
 * any number of intermediate method calls still produces a deterministically
 * ordered result.
 *
 * Note: this check is syntactic — it does not verify that the array returned
 * by `Object.keys/values/entries()` is the same one eventually sorted.
 * Patterns such as assigning to a variable and sorting later are not detected.
 *
 * The chain walk is capped at {@link MAX_CHAIN_DEPTH} iterations to guard
 * against degenerate or malformed ASTs.
 */
const MAX_CHAIN_DEPTH = 50
const isFollowedBySort = (callNode: ts.CallExpression): boolean => {
	let current: ts.Node = callNode

	for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
		const parent = current.parent
		if (!ts.isPropertyAccessExpression(parent)) return false
		// The PropertyAccessExpression must be the callee of a CallExpression
		if (!ts.isCallExpression(parent.parent)) return false

		if (parent.name.text === 'sort' || parent.name.text === 'toSorted') return true

		// Some other chained method call — keep walking up the chain
		current = parent.parent
	}

	return false
}

/**
 * Collects determinism warnings from all local source files in the program.
 */
const collectDeterminismWarnings = (
	program: ts.Program,
	localSourceFiles: Set<string>,
	warnings: Violation[],
) => {
	const checker = program.getTypeChecker()

	const promiseMethods = new Set(['race', 'any', 'all'])
	const dateMethods = new Set(['now'])
	const objectIterationMethods = new Set(['keys', 'values', 'entries'])

	for (const sourceFile of program.getSourceFiles()) {
		const resolvedSourcePath = toAbsolutePath(sourceFile.fileName)
		if (!localSourceFiles.has(resolvedSourcePath)) continue

		const visit = (node: ts.Node) => {
			// --- Promise.race() / Promise.any() ---
			if (ts.isCallExpression(node)) {
				const promiseMethod = getGlobalMethodCall(
					node,
					'Promise',
					promiseMethods,
					checker,
					localSourceFiles,
					sourceFile,
				)
				if (promiseMethod) {
					const promiseWarning =
						promiseMethod === 'all'
							? `Promise.all() executes promises concurrently — side effects may occur in different orders across nodes.`
							: `Promise.${promiseMethod}() is non-deterministic — the first ${promiseMethod === 'race' ? 'settled' : 'fulfilled'} promise wins, and timing varies across nodes.`
					warnings.push(
						createViolation(
							resolvedSourcePath,
							node.expression.getStart(sourceFile),
							sourceFile,
							promiseWarning,
						),
					)
				}

				// --- Date.now() ---
				const dateMethod = getGlobalMethodCall(
					node,
					'Date',
					dateMethods,
					checker,
					localSourceFiles,
					sourceFile,
				)
				if (dateMethod) {
					warnings.push(
						createViolation(
							resolvedSourcePath,
							node.expression.getStart(sourceFile),
							sourceFile,
							'Date.now() uses the system clock which varies across nodes.',
						),
					)
				}

				// --- Object.keys/values/entries() without .sort() ---
				const objectMethod = getGlobalMethodCall(
					node,
					'Object',
					objectIterationMethods,
					checker,
					localSourceFiles,
					sourceFile,
				)
				if (objectMethod && !isFollowedBySort(node)) {
					warnings.push(
						createViolation(
							resolvedSourcePath,
							node.expression.getStart(sourceFile),
							sourceFile,
							`Object.${objectMethod}() returns items in an order that may vary across engines. Chain with .sort() for deterministic ordering.`,
						),
					)
				}
			}

			// --- new Date() with no arguments ---
			if (
				ts.isNewExpression(node) &&
				resolvesToGlobalObject(node.expression, 'Date', checker, localSourceFiles, sourceFile) &&
				(!node.arguments || node.arguments.length === 0)
			) {
				warnings.push(
					createViolation(
						resolvedSourcePath,
						node.getStart(sourceFile),
						sourceFile,
						'new Date() without arguments uses the system clock which varies across nodes. Pass an explicit timestamp instead.',
					),
				)
			}

			// --- for...in loops ---
			if (ts.isForInStatement(node)) {
				warnings.push(
					createViolation(
						resolvedSourcePath,
						node.getStart(sourceFile),
						sourceFile,
						'for...in loop iteration order is not guaranteed by the spec and may vary across engines. Use for...of with Object.keys().sort() instead.',
					),
				)
			}

			ts.forEachChild(node, visit)
		}

		visit(sourceFile)
	}
}

/**
 * Analyzes a workflow entry file (and all local files it transitively imports)
 * for non-deterministic patterns that may prevent DON consensus.
 *
 * Returns an array of warnings. Does **not** throw — compilation should
 * continue regardless of warnings.
 */
export const checkWorkflowDeterminism = (entryFilePath: string): Violation[] => {
	const rootFile = toAbsolutePath(entryFilePath)
	const localSourceFiles = collectLocalSourceFiles(rootFile)
	const program = createValidationProgram(rootFile, localSourceFiles)
	const warnings: Violation[] = []

	collectDeterminismWarnings(program, localSourceFiles, warnings)

	return warnings
}

/**
 * Prints determinism warnings to stderr in a user-friendly format.
 */
export const printDeterminismWarnings = (warnings: Violation[]) => {
	console.warn(
		`\n⚠️  Non-determinism warnings (compilation will continue):
These patterns may prevent nodes from reaching consensus on the DON.
See ${DOCS_URL}

${formatViolations(warnings)}\n`,
	)
}
