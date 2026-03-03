import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
	assertWorkflowRuntimeCompatibility,
	WorkflowRuntimeCompatibilityError,
} from './validate-workflow-runtime-compat'

let tempDir: string

beforeEach(() => {
	tempDir = mkdtempSync(path.join(tmpdir(), 'cre-validate-test-'))
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

/** Assert that the validator throws with violations matching the given patterns. */
const expectViolations = (entryPath: string, expectedPatterns: (string | RegExp)[]) => {
	try {
		assertWorkflowRuntimeCompatibility(entryPath)
		throw new Error('Expected WorkflowRuntimeCompatibilityError but none was thrown')
	} catch (error) {
		expect(error).toBeInstanceOf(WorkflowRuntimeCompatibilityError)
		const message = (error as Error).message
		for (const pattern of expectedPatterns) {
			if (typeof pattern === 'string') {
				expect(message).toContain(pattern)
			} else {
				expect(message).toMatch(pattern)
			}
		}
	}
}

/** Assert that the validator does NOT throw. */
const expectNoViolations = (entryPath: string) => {
	expect(() => assertWorkflowRuntimeCompatibility(entryPath)).not.toThrow()
}

// ---------------------------------------------------------------------------
// Pass 1: Module import analysis
// ---------------------------------------------------------------------------

describe('module import analysis', () => {
	test("detects import ... from 'node:fs'", () => {
		const entry = writeTemp('workflow.ts', `import { readFileSync } from 'node:fs';\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test("detects bare module specifier 'fs' (without node: prefix)", () => {
		const entry = writeTemp('workflow.ts', `import { readFileSync } from 'fs';\n`)
		expectViolations(entry, ["'fs' is not available"])
	})

	test('detects export ... from restricted module', () => {
		const entry = writeTemp('workflow.ts', `export { createHash } from 'node:crypto';\n`)
		expectViolations(entry, ["'node:crypto' is not available"])
	})

	test('detects import = require() syntax', () => {
		const entry = writeTemp('workflow.ts', `import fs = require('node:fs');\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test('detects require() call', () => {
		const entry = writeTemp('workflow.js', `const fs = require('node:fs');\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test('detects dynamic import()', () => {
		const entry = writeTemp('workflow.ts', `const fs = await import('node:fs');\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test('detects all restricted modules in a single file', () => {
		const modules = [
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
		]

		const imports = modules.map((mod, i) => `import m${i} from '${mod}';`).join('\n')
		const entry = writeTemp('workflow.ts', `${imports}\n`)
		expectViolations(
			entry,
			modules.map((mod) => `'${mod}' is not available`),
		)
	})

	test('does NOT flag allowed third-party modules', () => {
		const entry = writeTemp(
			'workflow.ts',
			`import { something } from '@chainlink/cre-sdk';\nimport lodash from 'lodash';\n`,
		)
		expectNoViolations(entry)
	})

	test('does NOT flag relative imports themselves', () => {
		const helper = writeTemp('helper.ts', `export const add = (a: number, b: number) => a + b;\n`)
		const entry = writeTemp(
			'workflow.ts',
			`import { add } from './helper';\nconsole.log(add(1, 2));\n`,
		)
		expectNoViolations(entry)
	})

	test('follows relative imports transitively and detects violations in them', () => {
		writeTemp('deep.ts', `import { readFileSync } from 'node:fs';\nexport const x = 1;\n`)
		writeTemp('middle.ts', `import { x } from './deep';\nexport const y = x;\n`)
		const entry = writeTemp('workflow.ts', `import { y } from './middle';\nconsole.log(y);\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test('handles circular relative imports without infinite loop', () => {
		writeTemp('a.ts', `import { b } from './b';\nexport const a = 'a';\n`)
		writeTemp('b.ts', `import { a } from './a';\nexport const b = 'b';\n`)
		const entry = writeTemp('workflow.ts', `import { a } from './a';\n`)
		expectNoViolations(entry)
	})

	test('resolves imports without file extension', () => {
		writeTemp('utils.ts', `import { cpus } from 'node:os';\nexport const x = 1;\n`)
		const entry = writeTemp('workflow.ts', `import { x } from './utils';\nconsole.log(x);\n`)
		expectViolations(entry, ["'node:os' is not available"])
	})

	test('resolves index file imports', () => {
		writeTemp('lib/index.ts', `import { hostname } from 'node:os';\nexport const name = 'test';\n`)
		const entry = writeTemp('workflow.ts', `import { name } from './lib';\nconsole.log(name);\n`)
		expectViolations(entry, ["'node:os' is not available"])
	})

	test('reports multiple violations from multiple files', () => {
		writeTemp('helper.ts', `import { exec } from 'node:child_process';\nexport const run = exec;\n`)
		const entry = writeTemp(
			'workflow.ts',
			`import { run } from './helper';\nimport { readFileSync } from 'node:fs';\n`,
		)
		expectViolations(entry, ["'node:child_process' is not available", "'node:fs' is not available"])
	})
})

// ---------------------------------------------------------------------------
// Pass 2: Global API analysis
// ---------------------------------------------------------------------------

describe('global API analysis', () => {
	test('detects bare fetch() usage', () => {
		const entry = writeTemp('workflow.ts', `const res = fetch('https://example.com');\n`)
		expectViolations(entry, ["'fetch' is not available"])
	})

	test('detects setTimeout usage', () => {
		const entry = writeTemp('workflow.ts', `setTimeout(() => {}, 1000);\n`)
		expectViolations(entry, ["'setTimeout' is not available"])
	})

	test('detects setInterval usage', () => {
		const entry = writeTemp('workflow.ts', `setInterval(() => {}, 1000);\n`)
		expectViolations(entry, ["'setInterval' is not available"])
	})

	test('detects window reference', () => {
		const entry = writeTemp('workflow.ts', `const w = window;\n`)
		expectViolations(entry, ["'window' is not available"])
	})

	test('detects document reference', () => {
		const entry = writeTemp('workflow.ts', `const el = document.getElementById('app');\n`)
		expectViolations(entry, ["'document' is not available"])
	})

	test('detects XMLHttpRequest usage', () => {
		const entry = writeTemp('workflow.ts', `const xhr = new XMLHttpRequest();\n`)
		expectViolations(entry, ["'XMLHttpRequest' is not available"])
	})

	test('detects localStorage usage', () => {
		const entry = writeTemp('workflow.ts', `localStorage.setItem('key', 'value');\n`)
		expectViolations(entry, ["'localStorage' is not available"])
	})

	test('detects sessionStorage usage', () => {
		const entry = writeTemp('workflow.ts', `sessionStorage.getItem('key');\n`)
		expectViolations(entry, ["'sessionStorage' is not available"])
	})

	test('detects globalThis.fetch access', () => {
		const entry = writeTemp('workflow.ts', `const res = globalThis.fetch('https://example.com');\n`)
		expectViolations(entry, ["'globalThis.fetch' is not available"])
	})

	test('detects globalThis.setTimeout access', () => {
		const entry = writeTemp('workflow.ts', `globalThis.setTimeout(() => {}, 100);\n`)
		expectViolations(entry, ["'globalThis.setTimeout' is not available"])
	})

	test('does NOT flag user-defined variable named fetch', () => {
		const entry = writeTemp(
			'workflow.ts',
			`export const fetch = (url: string) => url;\nconst result = fetch('test');\n`,
		)
		expectNoViolations(entry)
	})

	test('does NOT flag user-defined function named fetch', () => {
		const entry = writeTemp(
			'workflow.ts',
			`export function fetch(url: string) { return url; }\nconst result = fetch('test');\n`,
		)
		expectNoViolations(entry)
	})

	test('does NOT flag function parameter named fetch', () => {
		const entry = writeTemp(
			'workflow.ts',
			`export function doRequest(fetch: (url: string) => void) { fetch('test'); }\n`,
		)
		expectNoViolations(entry)
	})

	test('does NOT flag property access obj.fetch', () => {
		const entry = writeTemp('workflow.ts', `const obj = { fetch: () => {} };\nobj.fetch();\n`)
		expectNoViolations(entry)
	})

	test('does NOT flag interface property named fetch', () => {
		const entry = writeTemp('workflow.ts', `interface Client { fetch: (url: string) => void; }\n`)
		expectNoViolations(entry)
	})

	test('does NOT flag destructured property named fetch from local object', () => {
		const entry = writeTemp(
			'workflow.ts',
			`const capabilities = { fetch: (url: string) => url };\nconst { fetch } = capabilities;\nexport const result = fetch('test');\n`,
		)
		expectNoViolations(entry)
	})

	test('does NOT flag class method named fetch', () => {
		const entry = writeTemp(
			'workflow.ts',
			`class HttpClient {\n  fetch(url: string) { return url; }\n}\nnew HttpClient().fetch('test');\n`,
		)
		expectNoViolations(entry)
	})

	test('detects global APIs in transitively imported files', () => {
		writeTemp('helper.ts', `export const doFetch = () => fetch('https://example.com');\n`)
		const entry = writeTemp('workflow.ts', `import { doFetch } from './helper';\ndoFetch();\n`)
		expectViolations(entry, ["'fetch' is not available"])
	})
})

// ---------------------------------------------------------------------------
// Combined / integration tests
// ---------------------------------------------------------------------------

describe('integration', () => {
	test('clean workflow passes validation', () => {
		const entry = writeTemp(
			'workflow.ts',
			`
import { Runner, cre } from '@chainlink/cre-sdk';

export async function main() {
  const runner = await Runner.newRunner();
  console.log('Hello from CRE');
}
`,
		)
		expectNoViolations(entry)
	})

	test('detects both module and global API violations in same file', () => {
		const entry = writeTemp(
			'workflow.ts',
			`
import { readFileSync } from 'node:fs';
const data = readFileSync('/tmp/data.json', 'utf-8');
const res = fetch('https://api.example.com');
`,
		)
		expectViolations(entry, ["'node:fs' is not available", "'fetch' is not available"])
	})

	test('error message includes file path and line/column info', () => {
		const entry = writeTemp('workflow.ts', `import { readFileSync } from 'node:fs';\n`)
		try {
			assertWorkflowRuntimeCompatibility(entry)
			throw new Error('Expected error')
		} catch (error) {
			expect(error).toBeInstanceOf(WorkflowRuntimeCompatibilityError)
			const msg = (error as Error).message
			// Should contain relative or absolute path to the file
			expect(msg).toContain('workflow.ts')
			// Should contain line:column format
			expect(msg).toMatch(/:\d+:\d+/)
		}
	})

	test('error message includes docs link', () => {
		const entry = writeTemp('workflow.ts', `import { readFileSync } from 'node:fs';\n`)
		try {
			assertWorkflowRuntimeCompatibility(entry)
			throw new Error('Expected error')
		} catch (error) {
			const msg = (error as Error).message
			expect(msg).toContain('https://docs.chain.link/cre/concepts/typescript-wasm-runtime')
		}
	})

	test('handles .js files', () => {
		const entry = writeTemp('workflow.js', `const fs = require('node:fs');\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test('handles .mjs files', () => {
		const entry = writeTemp('workflow.mjs', `import { readFileSync } from 'node:fs';\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test('handles .cjs files', () => {
		const entry = writeTemp('workflow.cjs', `const fs = require('node:fs');\n`)
		expectViolations(entry, ["'node:fs' is not available"])
	})

	test('violations are sorted by file path, then line, then column', () => {
		writeTemp(
			'b-helper.ts',
			`import { exec } from 'node:child_process';\nexport const run = exec;\n`,
		)
		const entry = writeTemp(
			'a-workflow.ts',
			`import { run } from './b-helper';\nimport { readFileSync } from 'node:fs';\nimport { cpus } from 'node:os';\n`,
		)
		try {
			assertWorkflowRuntimeCompatibility(entry)
			throw new Error('Expected error')
		} catch (error) {
			const msg = (error as Error).message
			const violationLines = msg.split('\n').filter((line) => line.startsWith('- '))

			// Should have 3 violations minimum
			expect(violationLines.length).toBeGreaterThanOrEqual(3)

			// Extract file paths from violation lines
			const filePaths = violationLines.map((line) => line.split(':')[0].replace('- ', ''))

			// Verify sorted order: a-workflow.ts violations before b-helper.ts
			const aIndexes = filePaths
				.map((f, i) => (f.includes('a-workflow') ? i : -1))
				.filter((i) => i >= 0)
			const bIndexes = filePaths
				.map((f, i) => (f.includes('b-helper') ? i : -1))
				.filter((i) => i >= 0)

			if (aIndexes.length > 0 && bIndexes.length > 0) {
				expect(Math.max(...aIndexes)).toBeLessThan(Math.min(...bIndexes))
			}
		}
	})

	test('empty file passes validation', () => {
		const entry = writeTemp('workflow.ts', '')
		expectNoViolations(entry)
	})

	test('file with only comments passes validation', () => {
		const entry = writeTemp('workflow.ts', `// This is a comment\n/* Block comment */\n`)
		expectNoViolations(entry)
	})

	test('non-existent entry file does not throw', () => {
		const nonExistent = path.join(tempDir, 'does-not-exist.ts')
		// Should not throw since the file doesn't exist - it just won't find violations
		expectNoViolations(nonExistent)
	})
})
