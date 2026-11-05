import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	extractTripleSlashRefs,
	isRestrictionRef,
	stripTripleSlashRefs,
	withTripleSlashRefs,
} from './build-types'

const globalRef = '/// <reference types="./sdk/types/global" />'
const restrictedApisRef = '/// <reference types="./sdk/types/restricted-apis" />'
const restrictedNodeModulesRef = '/// <reference types="./sdk/types/restricted-node-modules" />'

describe('extractTripleSlashRefs', () => {
	test('extracts reference lines and ignores other content', () => {
		const content = [globalRef, restrictedApisRef, '', "export * from './sdk'"].join('\n')
		expect(extractTripleSlashRefs(content)).toEqual([globalRef, restrictedApisRef])
	})

	test('returns empty array for content without references', () => {
		expect(extractTripleSlashRefs("export * from './sdk'")).toEqual([])
	})
})

describe('isRestrictionRef', () => {
	test('identifies restriction references', () => {
		expect(isRestrictionRef(restrictedApisRef)).toBe(true)
		expect(isRestrictionRef(restrictedNodeModulesRef)).toBe(true)
	})

	test('does not flag non-restriction references', () => {
		expect(isRestrictionRef(globalRef)).toBe(false)
	})
})

describe('stripTripleSlashRefs', () => {
	test('removes references and leading blank lines left behind', () => {
		const content = [globalRef, restrictedApisRef, '', "export * from './sdk'"].join('\n')
		expect(stripTripleSlashRefs(content)).toBe("export * from './sdk'")
	})

	test('is idempotent', () => {
		const once = stripTripleSlashRefs([globalRef, "export * from './sdk'"].join('\n'))
		expect(stripTripleSlashRefs(once)).toBe(once)
	})
})

describe('withTripleSlashRefs', () => {
	test('prepends references to content', () => {
		expect(withTripleSlashRefs([globalRef], "export * from './sdk'")).toBe(
			[globalRef, "export * from './sdk'"].join('\n'),
		)
	})

	test('returns content unchanged when there are no references', () => {
		expect(withTripleSlashRefs([], "export * from './sdk'")).toBe("export * from './sdk'")
	})
})

describe('entry point variants', () => {
	test('unrestricted entry keeps non-restriction references and omits restrictions', () => {
		const allRefs = [globalRef, restrictedApisRef, restrictedNodeModulesRef]
		const unrestrictedRefs = allRefs.filter((ref) => !isRestrictionRef(ref))
		expect(unrestrictedRefs).toEqual([globalRef])
	})

	test('package.json exposes the unrestricted and restricted-node-modules subpaths', () => {
		const packageJson = JSON.parse(
			readFileSync(join(import.meta.dir, '../../package.json'), 'utf-8'),
		) as { exports: Record<string, { types?: string; import?: string }> }

		expect(packageJson.exports['./unrestricted']).toEqual({
			types: './dist/index-unrestricted.d.ts',
			import: './dist/index-unrestricted.js',
		})
		expect(packageJson.exports['./restricted-node-modules']).toEqual({
			types: './dist/sdk/types/restricted-node-modules.d.ts',
			import: './dist/sdk/types/restricted-node-modules.js',
		})
	})
})
