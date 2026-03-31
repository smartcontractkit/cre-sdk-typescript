/**
 * Workflow Runtime Compatibility Validator
 *
 * CRE (Compute Runtime Environment) workflows are compiled from TypeScript to
 * WebAssembly and executed inside a Javy/QuickJS sandbox — NOT a full Node.js
 * runtime. This means many APIs that developers take for granted (filesystem,
 * network sockets, crypto, child processes, etc.) are simply not available at
 * runtime and will silently fail or crash.
 *
 * This module performs **static analysis** on workflow source code to catch
 * these issues at build time, before the workflow is compiled to WASM. It
 * operates in two passes:
 *
 * 1. **Module import analysis** — walks the AST of every reachable source file
 *    (starting from the workflow entry point) and flags imports from restricted
 *    Node.js built-in modules (e.g. `node:fs`, `node:crypto`, `node:http`).
 *    This catches `import`, `export ... from`, `require()`, and dynamic
 *    `import()` syntax.
 *
 * 2. **Global API analysis** — uses the TypeScript type-checker to detect
 *    references to browser/Node globals that don't exist in QuickJS (e.g.
 *    `fetch`, `setTimeout`, `window`, `document`). Only flags identifiers
 *    that resolve to non-local declarations, so user-defined variables with
 *    the same name (e.g. `const fetch = cre.capabilities.HTTPClient`) are
 *    not flagged.
 *
 * The validator follows relative imports transitively so that violations in
 * helper files reachable from the entry point are also caught.
 *
 * ## How it's used
 *
 * This validator runs automatically as part of the `cre-compile` build pipeline:
 *
 * ```
 * cre-compile <path/to/workflow.ts> [path/to/output.wasm]
 * ```
 *
 * The pipeline is: `cre-compile` (CLI) -> `compile-workflow` -> `compile-to-js`
 * -> **`assertWorkflowRuntimeCompatibility()`** -> bundle -> compile to WASM.
 *
 * The validation happens before any bundling or WASM compilation, so developers
 * get fast, actionable error messages pointing to exact file:line:column
 * locations instead of cryptic WASM runtime failures.
 *
 * ## Layers of protection
 *
 * This validator is one of two complementary mechanisms that prevent usage of
 * unavailable APIs:
 *
 * 1. **Compile-time types** (`restricted-apis.d.ts` and `restricted-node-modules.d.ts`)
 *    — mark restricted APIs as `never` so the TypeScript compiler flags them
 *    with red squiggles in the IDE. This gives instant feedback while coding.
 *
 * 2. **Build-time validation** (this module) — performs AST-level static
 *    analysis during `cre-compile`. This catches cases that type-level
 *    restrictions can't cover, such as `require()` calls, dynamic `import()`,
 *    and usage inside plain `.js` files that don't go through `tsc`.
 *
 * @example
 * ```ts
 * import { assertWorkflowRuntimeCompatibility } from './validate-workflow-runtime-compat'
 *
 * // Throws WorkflowRuntimeCompatibilityError if violations are found
 * assertWorkflowRuntimeCompatibility('./src/workflow.ts')
 * ```
 *
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

/**
 * A single detected violation: a location in the source code where a
 * restricted API is referenced.
 */
type Violation = {
	/** Absolute path to the file containing the violation. */
	filePath: string
	/** 1-based line number. */
	line: number
	/** 1-based column number. */
	column: number
	/** Human-readable description of the violation. */
	message: string
}

/**
 * Node.js built-in module specifiers that are not available in the QuickJS
 * runtime. Both bare (`fs`) and prefixed (`node:fs`) forms are included
 * because TypeScript/bundlers accept either.
 */
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

/**
 * Global identifiers (browser and Node.js) that do not exist in the QuickJS
 * runtime. For network requests, workflows should use `cre.capabilities.HTTPClient`;
 * for scheduling, `cre.capabilities.CronCapability`.
 */
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

/** File extensions treated as scannable source code. */
const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']

/**
 * Error thrown when one or more runtime-incompatible API usages are detected.
 * The message includes a docs link and a formatted list of every violation
 * with file path, line, column, and description.
 */
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
			`Unsupported API usage found in workflow source.
CRE workflows run on Javy (QuickJS), not full Node.js.
Use CRE capabilities instead (for example, HTTPClient instead of fetch/node:http).
See https://docs.chain.link/cre/concepts/typescript-wasm-runtime

${formattedViolations}`,
		)
		this.name = 'WorkflowRuntimeCompatibilityError'
	}
}

/** Resolves a file path to an absolute path using the current working directory. */
const toAbsolutePath = (filePath: string) => path.resolve(filePath)

const defaultValidationCompilerOptions: ts.CompilerOptions = {
	allowJs: true,
	checkJs: true,
	noEmit: true,
	skipLibCheck: true,
	target: ts.ScriptTarget.ESNext,
	module: ts.ModuleKind.ESNext,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
}

const formatDiagnostic = (diagnostic: ts.Diagnostic) => {
	const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
	if (!diagnostic.file || diagnostic.start == null) {
		return message
	}

	const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
	return `${toAbsolutePath(diagnostic.file.fileName)}:${line + 1}:${character + 1} ${message}`
}

/**
 * Loads compiler options from the nearest tsconfig.json so validation runs
 * against the same ambient/type environment as the workflow project.
 */
const loadClosestTsconfigCompilerOptions = (entryFilePath: string): ts.CompilerOptions | null => {
	const configPath = ts.findConfigFile(
		path.dirname(entryFilePath),
		ts.sys.fileExists,
		'tsconfig.json',
	)
	if (!configPath) {
		return null
	}

	let unrecoverableDiagnostic: ts.Diagnostic | null = null
	const parsed = ts.getParsedCommandLineOfConfigFile(
		configPath,
		{},
		{
			...ts.sys,
			onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
				unrecoverableDiagnostic = diagnostic
			},
		},
	)

	if (!parsed) {
		if (unrecoverableDiagnostic) {
			throw new Error(
				`Failed to parse TypeScript config for workflow validation.\n${formatDiagnostic(unrecoverableDiagnostic)}`,
			)
		}
		return null
	}

	return parsed.options
}

/**
 * Maps a file extension to the appropriate TypeScript {@link ts.ScriptKind}
 * so the parser handles JSX, CommonJS, and ESM files correctly.
 */
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

/**
 * Creates a {@link Violation} with 1-based line and column numbers derived
 * from a character position in the source file.
 */
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

/** Returns `true` if the specifier looks like a relative or absolute file path. */
const isRelativeImport = (specifier: string) => {
	return specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')
}

/**
 * Attempts to resolve a relative import specifier to an absolute file path.
 * Tries the path as-is first, then appends each known source extension, then
 * looks for an index file inside the directory. Returns `null` if nothing is
 * found on disk.
 */
const resolveRelativeImport = (fromFilePath: string, specifier: string): string | null => {
	const basePath = specifier.startsWith('/')
		? path.resolve(specifier)
		: path.resolve(path.dirname(fromFilePath), specifier)

	if (existsSync(basePath) && statSync(basePath).isFile()) {
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

/**
 * Extracts a string literal from the first argument of a call expression.
 * Used for `require('node:fs')` and `import('node:fs')` patterns.
 * Returns `null` if the first argument is not a static string literal.
 */
const getStringLiteralFromCall = (node: ts.CallExpression): string | null => {
	const [firstArg] = node.arguments
	if (!firstArg || !ts.isStringLiteral(firstArg)) return null
	return firstArg.text
}

/**
 * **Pass 1 — Module import analysis.**
 *
 * Walks the AST of a single source file and:
 * - Flags any import/export/require/dynamic-import of a restricted module.
 * - Enqueues relative imports for recursive scanning so the validator
 *   transitively covers the entire local dependency graph.
 *
 * Handles all module import syntaxes:
 * - `import ... from 'node:fs'`
 * - `export ... from 'node:fs'`
 * - `import fs = require('node:fs')`
 * - `require('node:fs')`
 * - `import('node:fs')`
 */
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
		// import ... from 'specifier'
		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			checkModuleSpecifier(node.moduleSpecifier.text, node.moduleSpecifier.getStart(sourceFile))
		}

		// export ... from 'specifier'
		if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			checkModuleSpecifier(node.moduleSpecifier.text, node.moduleSpecifier.getStart(sourceFile))
		}

		// import fs = require('specifier')
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
			// require('specifier')
			if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
				const requiredModule = getStringLiteralFromCall(node)
				if (requiredModule) {
					checkModuleSpecifier(requiredModule, node.arguments[0].getStart(sourceFile))
				}
			}

			// import('specifier')
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

/**
 * Checks whether an identifier AST node is the **name being declared** (as
 * opposed to a reference/usage). For example, in `const fetch = ...` the
 * `fetch` token is a declaration name, while in `fetch(url)` it is a usage.
 *
 * This distinction is critical so that user-defined variables that shadow
 * restricted global names are not flagged as violations.
 */
const isDeclarationName = (identifier: ts.Identifier): boolean => {
	const parent = identifier.parent

	// Variable, function, class, interface, type alias, enum, module,
	// type parameter, parameter, binding element, import names, enum member,
	// property/method declarations, property assignments, and labels.
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

	// Property access (obj.fetch), qualified names (Ns.fetch), and type
	// references (SomeType) — the right-hand identifier is not a standalone
	// usage of the global name.
	if (
		(ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
		(ts.isQualifiedName(parent) && parent.right === identifier) ||
		(ts.isTypeReferenceNode(parent) && parent.typeName === identifier)
	) {
		return true
	}

	return false
}

/**
 * **Pass 2 — Global API analysis.**
 *
 * Uses the TypeScript type-checker to find references to restricted global
 * identifiers (e.g. `fetch`, `setTimeout`, `window`). An identifier is only
 * flagged if:
 * - It matches a name in {@link restrictedGlobalApis}.
 * - It is **not** a declaration name (see {@link isDeclarationName}).
 * - Its symbol resolves to a declaration outside the local source files,
 *   meaning it comes from the global scope rather than user code.
 *
 * This also catches `globalThis.fetch`-style access patterns.
 */
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
			// Direct usage: fetch(...), setTimeout(...)
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

			// Property access on globalThis: globalThis.fetch(...)
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

/**
 * Validates that a workflow entry file (and all local files it transitively
 * imports) only uses APIs available in the CRE QuickJS/WASM runtime.
 *
 * The check runs in two passes:
 *
 * 1. **Module import scan** — starting from `entryFilePath`, recursively
 *    parses every reachable local source file and flags imports from
 *    restricted Node.js built-in modules.
 *
 * 2. **Global API scan** — creates a TypeScript program from the collected
 *    source files and uses the type-checker to flag references to restricted
 *    global identifiers that resolve to non-local (i.e. global) declarations.
 *
 * @param entryFilePath - Path to the workflow entry file (absolute or relative).
 * @throws {WorkflowRuntimeCompatibilityError} If any violations are found.
 *   The error message includes a link to the CRE runtime docs and a formatted
 *   list of every violation with file:line:column and description.
 *
 * @example
 * ```ts
 * // During the cre-compile build step:
 * assertWorkflowRuntimeCompatibility('./src/workflow.ts')
 * // Throws if the workflow (or any file it imports) uses fetch, node:fs, etc.
 * ```
 *
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
export const assertWorkflowRuntimeCompatibility = (entryFilePath: string) => {
	const rootFile = toAbsolutePath(entryFilePath)
	const projectCompilerOptions = loadClosestTsconfigCompilerOptions(rootFile) ?? {}
	const filesToScan = [rootFile]
	const scannedFiles = new Set<string>()
	const localSourceFiles = new Set<string>()
	const violations: Violation[] = []

	// Pass 1: Walk the local import graph and collect module-level violations.
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

	// Pass 2: Use the type-checker to detect restricted global API usage.
	const program = ts.createProgram({
		rootNames: [...localSourceFiles],
		options: {
			...defaultValidationCompilerOptions,
			...projectCompilerOptions,
			allowJs: true,
			checkJs: true,
			noEmit: true,
			skipLibCheck: true,
		},
	})

	collectGlobalApiUsage(program, localSourceFiles, violations)

	if (violations.length > 0) {
		throw new WorkflowRuntimeCompatibilityError(violations)
	}
}

export { WorkflowRuntimeCompatibilityError }
