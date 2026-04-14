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

import * as ts from 'typescript'
import {
	collectLocalSourceFiles,
	createValidationProgram,
	createViolation,
	formatViolations,
	isDeclarationName,
	toAbsolutePath,
	type Violation,
} from './validate-shared'

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

/**
 * Error thrown when one or more runtime-incompatible API usages are detected.
 * The message includes a docs link and a formatted list of every violation
 * with file path, line, column, and description.
 */
class WorkflowRuntimeCompatibilityError extends Error {
	constructor(violations: Violation[]) {
		super(
			`Unsupported API usage found in workflow source.
CRE workflows run on Javy (QuickJS), not full Node.js.
Use CRE capabilities instead (for example, HTTPClient instead of fetch/node:http).
See https://docs.chain.link/cre/concepts/typescript-wasm-runtime

${formatViolations(violations)}`,
		)
		this.name = 'WorkflowRuntimeCompatibilityError'
	}
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
	const violations: Violation[] = []

	// Pass 1: Walk the local import graph and collect module-level violations.
	const localSourceFiles = collectLocalSourceFiles(
		rootFile,
		(specifier, pos, sourceFile, filePath) => {
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
		},
	)

	// Pass 2: Use the type-checker to detect restricted global API usage.
	const program = createValidationProgram(rootFile, localSourceFiles)
	collectGlobalApiUsage(program, localSourceFiles, violations)

	if (violations.length > 0) {
		throw new WorkflowRuntimeCompatibilityError(violations)
	}
}

export { WorkflowRuntimeCompatibilityError }
