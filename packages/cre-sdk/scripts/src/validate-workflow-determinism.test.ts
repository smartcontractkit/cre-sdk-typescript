import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { checkWorkflowDeterminism } from './validate-workflow-determinism'

let tempDir: string

beforeEach(() => {
	tempDir = mkdtempSync(path.join(tmpdir(), 'cre-determinism-test-'))
})

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true })
})

/** Write a file in the temp directory and return its absolute path. */
const writeTemp = (filename: string, content: string): string => {
	const filePath = path.join(tempDir, filename)
	const dir = path.dirname(filePath)
	mkdirSync(dir, { recursive: true })
	writeFileSync(filePath, content, 'utf-8')
	return filePath
}

/** Assert that the analyzer returns warnings matching the given patterns. */
const expectWarnings = (entryPath: string, expectedPatterns: (string | RegExp)[]) => {
	const warnings = checkWorkflowDeterminism(entryPath)
	expect(warnings.length).toBeGreaterThan(0)
	const combined = warnings.map((w) => w.message).join('\n')
	for (const pattern of expectedPatterns) {
		if (typeof pattern === 'string') {
			expect(combined).toContain(pattern)
		} else {
			expect(combined).toMatch(pattern)
		}
	}
}

/** Assert that the analyzer returns NO warnings. */
const expectNoWarnings = (entryPath: string) => {
	const warnings = checkWorkflowDeterminism(entryPath)
	expect(warnings).toEqual([])
}

// ---------------------------------------------------------------------------
// Promise.race() / Promise.any()
// ---------------------------------------------------------------------------

describe('Promise.race() and Promise.any()', () => {
	test('detects Promise.race()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const result = await Promise.race([Promise.resolve(1), Promise.resolve(2)]);\n`,
		)
		expectWarnings(entry, ['Promise.race() is non-deterministic'])
	})

	test('detects globalThis.Promise.race()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const result = await globalThis.Promise.race([Promise.resolve(1), Promise.resolve(2)]);\n`,
		)
		expectWarnings(entry, ['Promise.race() is non-deterministic'])
	})

	test('detects Promise.any()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const result = await Promise.any([Promise.resolve(1), Promise.resolve(2)]);\n`,
		)
		expectWarnings(entry, ['Promise.any() is non-deterministic'])
	})

	test('does NOT flag Promise.all()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const results = await Promise.all([Promise.resolve(1), Promise.resolve(2)]);\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag Promise.allSettled()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const results = await Promise.allSettled([Promise.resolve(1)]);\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag user-defined object named Promise with race method', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const Promise = { race: (x: any) => x };\nPromise.race([1, 2]);\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag property access obj.race()', () => {
		const entry = writeTemp('workflow.ts', `const obj = { race: () => 42 };\nobj.race();\n`)
		expectNoWarnings(entry)
	})
})

// ---------------------------------------------------------------------------
// Date.now() / new Date()
// ---------------------------------------------------------------------------

describe('Date.now() and new Date()', () => {
	test('detects Date.now()', () => {
		const entry = writeTemp('workflow.ts', `const ts = Date.now();\n`)
		expectWarnings(entry, ['Date.now() uses the system clock'])
	})

	test('detects globalThis.Date.now()', () => {
		const entry = writeTemp('workflow.ts', `const ts = globalThis.Date.now();\n`)
		expectWarnings(entry, ['Date.now() uses the system clock'])
	})

	test('detects new Date() with no arguments', () => {
		const entry = writeTemp('workflow.ts', `const d = new Date();\n`)
		expectWarnings(entry, ['new Date() without arguments uses the system clock'])
	})

	test('detects new globalThis.Date() with no arguments', () => {
		const entry = writeTemp('workflow.ts', `const d = new globalThis.Date();\n`)
		expectWarnings(entry, ['new Date() without arguments uses the system clock'])
	})

	test('detects new Date without parens', () => {
		const entry = writeTemp('workflow.ts', `const d = new Date;\n`)
		expectWarnings(entry, ['new Date() without arguments uses the system clock'])
	})

	test('does NOT flag new Date(timestamp)', () => {
		const entry = writeTemp('workflow.ts', `const d = new Date(1700000000000);\n`)
		expectNoWarnings(entry)
	})

	test('does NOT flag new Date(string)', () => {
		const entry = writeTemp('workflow.ts', `const d = new Date('2024-01-01');\n`)
		expectNoWarnings(entry)
	})

	test('does NOT flag user-defined Date class', () => {
		const entry = writeTemp(
			'workflow.ts',
			`class Date { static now() { return 42; } }\nDate.now();\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag user-defined Date variable with now method', () => {
		const entry = writeTemp('workflow.ts', `const Date = { now: () => 42 };\nDate.now();\n`)
		expectNoWarnings(entry)
	})

	test('does NOT let an inner block Date shadow suppress outer Date.now()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`if (true) { const Date = { now: () => 42 }; }\nconst ts = Date.now();\n`,
		)
		expectWarnings(entry, ['Date.now() uses the system clock'])
	})

	test('does NOT flag Date.now() when Date is shadowed in the active block', () => {
		const entry = writeTemp(
			'workflow.ts',
			`if (true) { const Date = { now: () => 42 };\n  Date.now();\n}\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag globalThis.Date.now() when globalThis is shadowed locally', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const globalThis = { Date: { now: () => 42 } };\nglobalThis.Date.now();\n`,
		)
		expectNoWarnings(entry)
	})

	test('warns when Date.now() appears before the local Date declaration in the same scope', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const ts = Date.now();\nconst Date = { now: () => 42 };\n`,
		)
		expectWarnings(entry, ['Date.now() uses the system clock'])
	})
})

// ---------------------------------------------------------------------------
// for...in loops
// ---------------------------------------------------------------------------

describe('for...in loops', () => {
	test('detects for...in loop', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const obj = { a: 1, b: 2 };\nfor (const key in obj) { console.log(key); }\n`,
		)
		expectWarnings(entry, ['for...in loop iteration order is not guaranteed'])
	})

	test('does NOT flag for...of loop', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const arr = [1, 2, 3];\nfor (const val of arr) { console.log(val); }\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag regular for loop', () => {
		const entry = writeTemp('workflow.ts', `for (let i = 0; i < 10; i++) { console.log(i); }\n`)
		expectNoWarnings(entry)
	})
})

// ---------------------------------------------------------------------------
// Object.keys/values/entries() without .sort()
// ---------------------------------------------------------------------------

describe('Object.keys/values/entries() without .sort()', () => {
	test('detects Object.keys() without sort', () => {
		const entry = writeTemp('workflow.ts', `const keys = Object.keys({ a: 1, b: 2 });\n`)
		expectWarnings(entry, ['Object.keys() returns items in an order that may vary'])
	})

	test('detects Object.values() without sort', () => {
		const entry = writeTemp('workflow.ts', `const vals = Object.values({ a: 1, b: 2 });\n`)
		expectWarnings(entry, ['Object.values() returns items in an order that may vary'])
	})

	test('detects Object.entries() without sort', () => {
		const entry = writeTemp('workflow.ts', `const entries = Object.entries({ a: 1, b: 2 });\n`)
		expectWarnings(entry, ['Object.entries() returns items in an order that may vary'])
	})

	test('detects globalThis.Object.keys() without sort', () => {
		const entry = writeTemp('workflow.ts', `const keys = globalThis.Object.keys({ a: 1, b: 2 });\n`)
		expectWarnings(entry, ['Object.keys() returns items in an order that may vary'])
	})

	test('does NOT flag Object.keys().sort()', () => {
		const entry = writeTemp('workflow.ts', `const keys = Object.keys({ a: 1, b: 2 }).sort();\n`)
		expectNoWarnings(entry)
	})

	test('does NOT flag Object.entries().sort()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const entries = Object.entries({ a: 1, b: 2 }).sort();\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag Object.keys().toSorted()', () => {
		const entry = writeTemp('workflow.ts', `const keys = Object.keys({ a: 1, b: 2 }).toSorted();\n`)
		expectNoWarnings(entry)
	})

	test('does NOT flag Object.keys().filter().sort()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const keys = Object.keys({ a: 1, b: 2 }).filter(k => k !== 'a').sort();\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag Object.keys().map().filter().sort()', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const keys = Object.keys({ a: 1, b: 2 }).map(k => k.toUpperCase()).filter(k => k !== 'A').sort();\n`,
		)
		expectNoWarnings(entry)
	})

	test('detects Object.keys().map() (no sort)', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const mapped = Object.keys({ a: 1, b: 2 }).map(k => k.toUpperCase());\n`,
		)
		expectWarnings(entry, ['Object.keys() returns items in an order that may vary'])
	})

	test('detects Object.keys().filter() without sort', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const filtered = Object.keys({ a: 1, b: 2 }).filter(k => k !== 'a');\n`,
		)
		expectWarnings(entry, ['Object.keys() returns items in an order that may vary'])
	})

	test('does NOT flag user-defined Object variable', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const Object = { keys: (x: any) => [] };\nObject.keys({ a: 1 });\n`,
		)
		expectNoWarnings(entry)
	})

	test('does NOT flag Object.freeze() or other safe methods', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const frozen = Object.freeze({ a: 1, b: 2 });\nconst assigned = Object.assign({}, { a: 1 });\n`,
		)
		expectNoWarnings(entry)
	})

	test('warns when Object.keys() appears before the local Object declaration in the same scope', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const keys = Object.keys({ a: 1 });\nconst Object = { keys: (x: any) => [] as string[] };\n`,
		)
		expectWarnings(entry, ['Object.keys() returns items in an order that may vary'])
	})
})

// ---------------------------------------------------------------------------
// Safe patterns (should NOT warn)
// ---------------------------------------------------------------------------

describe('safe patterns', () => {
	test('does NOT flag Math.random()', () => {
		const entry = writeTemp('workflow.ts', `const r = Math.random();\n`)
		expectNoWarnings(entry)
	})

	test('clean workflow produces no warnings', () => {
		const entry = writeTemp(
			'workflow.ts',
			`
const data = { z: 1, a: 2, m: 3 };
const sortedKeys = Object.keys(data).sort();
for (const key of sortedKeys) {
  console.log(key);
}
const results = await Promise.all([Promise.resolve(1), Promise.resolve(2)]);
const d = new Date(1700000000000);
`,
		)
		expectNoWarnings(entry)
	})

	test('empty file produces no warnings', () => {
		const entry = writeTemp('workflow.ts', '')
		expectNoWarnings(entry)
	})
})

// ---------------------------------------------------------------------------
// Transitive analysis
// ---------------------------------------------------------------------------

describe('transitive analysis', () => {
	test('detects warnings in transitively imported files', () => {
		writeTemp('helper.ts', `export const getTime = () => Date.now();\n`)
		const entry = writeTemp(
			'workflow.ts',
			`import { getTime } from './helper';\nconsole.log(getTime());\n`,
		)
		expectWarnings(entry, ['Date.now() uses the system clock'])
	})

	test('reports multiple warnings from multiple files', () => {
		writeTemp('helper.ts', `export const racePromises = () => Promise.race([]);\n`)
		const entry = writeTemp(
			'workflow.ts',
			`import { racePromises } from './helper';\nconst d = new Date();\n`,
		)
		expectWarnings(entry, ['Promise.race() is non-deterministic', 'new Date() without arguments'])
	})
})

// ---------------------------------------------------------------------------
// Output format
// ---------------------------------------------------------------------------

describe('output format', () => {
	test('warnings include file path and line/column info', () => {
		const entry = writeTemp('workflow.ts', `const d = new Date();\n`)
		const warnings = checkWorkflowDeterminism(entry)
		expect(warnings.length).toBe(1)
		expect(warnings[0].filePath).toContain('workflow.ts')
		expect(warnings[0].line).toBe(1)
		expect(warnings[0].column).toBeGreaterThan(0)
	})

	test('warnings are returned as array (not thrown)', () => {
		const entry = writeTemp(
			'workflow.ts',
			`Promise.race([]);\nDate.now();\nfor (const k in {}) {}\n`,
		)
		const warnings = checkWorkflowDeterminism(entry)
		expect(warnings.length).toBe(3)
	})

	test('non-existent entry file returns no warnings', () => {
		const nonExistent = path.join(tempDir, 'does-not-exist.ts')
		expectNoWarnings(nonExistent)
	})
})
