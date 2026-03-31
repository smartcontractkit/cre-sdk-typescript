import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'

const prepareRuntimePath = resolve(import.meta.dir, '../utils/prepare-runtime.ts')
const globalTypesPath = resolve(import.meta.dir, '../types/global.d.ts')

const parseSourceFile = (filePath: string) =>
	ts.createSourceFile(filePath, readFileSync(filePath, 'utf-8'), ts.ScriptTarget.Latest, true)

const collectPreparedGlobals = (sourceFile: ts.SourceFile) => {
	const preparedGlobals = new Set<string>()

	const visit = (node: ts.Node) => {
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isPropertyAccessExpression(node.left) &&
			ts.isIdentifier(node.left.expression) &&
			node.left.expression.text === 'globalThis'
		) {
			preparedGlobals.add(node.left.name.text)
		}

		ts.forEachChild(node, visit)
	}

	visit(sourceFile)
	return preparedGlobals
}

const collectDeclaredGlobals = (sourceFile: ts.SourceFile) => {
	const declaredGlobals = new Set<string>()

	const collectFromGlobalBlock = (node: ts.Node) => {
		if (ts.isFunctionDeclaration(node) && node.name) {
			declaredGlobals.add(node.name.text)
		}

		if (ts.isVariableStatement(node)) {
			for (const declaration of node.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					declaredGlobals.add(declaration.name.text)
				}
			}
		}

		ts.forEachChild(node, collectFromGlobalBlock)
	}

	const visit = (node: ts.Node) => {
		if (
			ts.isModuleDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === 'global' &&
			node.body
		) {
			collectFromGlobalBlock(node.body)
		}

		ts.forEachChild(node, visit)
	}

	visit(sourceFile)
	return declaredGlobals
}

describe('prepareRuntime globals contract', () => {
	test('every global exposed at runtime is declared in ambient types', () => {
		const preparedGlobals = collectPreparedGlobals(parseSourceFile(prepareRuntimePath))
		const declaredGlobals = collectDeclaredGlobals(parseSourceFile(globalTypesPath))
		const missingDeclarations = [...preparedGlobals]
			.filter((name) => !declaredGlobals.has(name))
			.sort()

		expect(preparedGlobals.size).toBeGreaterThan(0)
		expect(missingDeclarations).toEqual([])
	})
})
