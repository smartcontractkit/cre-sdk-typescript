import { describe, expect, test } from 'bun:test'
import { wrapWorkflowCode } from './workflow-wrapper'

describe('wrapWorkflowCode', () => {
	describe('import handling', () => {
		test('adds sendErrorResponse import when no @chainlink/cre-sdk import exists', () => {
			const input = `export async function main() {
  console.log('hello')
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain("import { sendErrorResponse } from '@chainlink/cre-sdk'")
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('adds sendErrorResponse to existing @chainlink/cre-sdk import', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('Runner, sendErrorResponse')
			expect(result).toContain('main().catch(sendErrorResponse)')
			// Should not add a separate import
			expect(result.match(/import.*from.*@chainlink\/cre-sdk/g)?.length).toBe(1)
		})

		test('does not duplicate sendErrorResponse if already imported', () => {
			const input = `import { Runner, sendErrorResponse } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Count occurrences of sendErrorResponse in imports
			const importMatch = result.match(/import.*{[^}]*}.*from.*@chainlink\/cre-sdk/)?.[0]
			expect(importMatch?.match(/sendErrorResponse/g)?.length).toBe(1)
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('handles multiple named imports correctly', () => {
			const input = `import { cre, Runner, Config } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('Config, sendErrorResponse')
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('adds import after existing imports from other modules', () => {
			const input = `import { something } from 'other-module'
import { another } from 'another-module'

export async function main() {
  console.log('hello')
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain("import { sendErrorResponse } from '@chainlink/cre-sdk'")
			// The new import should be after the existing imports
			const lines = result.split('\n')
			const otherModuleIndex = lines.findIndex((l) => l.includes('other-module'))
			const creImportIndex = lines.findIndex((l) => l.includes('@chainlink/cre-sdk'))
			expect(creImportIndex).toBeGreaterThan(otherModuleIndex)
		})
	})

	describe('error handling detection', () => {
		test('does not add wrapper when main().catch() already exists', () => {
			const input = `import { Runner, sendErrorResponse } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}

main().catch(sendErrorResponse)`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Should only have one main().catch() call
			expect(result.match(/main\(\)\.catch/g)?.length).toBe(1)
		})

		test('does not add wrapper when main().catch() with custom handler exists', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}

main().catch((e) => {
  console.error('Custom error:', e)
})`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Should still add sendErrorResponse import but not add another .catch()
			expect(result).toContain('sendErrorResponse')
			// Should only have one .catch() call
			expect(result.match(/\.catch\(/g)?.length).toBe(1)
		})

		test('does not add wrapper when main().then().catch() exists', () => {
			const input = `import { Runner, sendErrorResponse } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}

main().then(() => console.log('done')).catch(sendErrorResponse)`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Should only have one .catch() call
			expect(result.match(/\.catch\(/g)?.length).toBe(1)
		})

		test('adds wrapper when main() is called without .catch()', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}

main()`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Should replace the original main() call
			expect(result.match(/main\(\)\.catch\(sendErrorResponse\)/g)?.length).toBe(1)
			expect(result.match(/(^|\n)\s*main\(\)\s*;?\s*$/g)?.length ?? 0).toBe(0)
		})

		test('replaces await main() with await main().catch()', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

export async function main() {
  const runner = await Runner.newRunner()
}

await main()`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('await main().catch(sendErrorResponse)')
			expect(result.match(/main\(\)\.catch\(sendErrorResponse\)/g)?.length).toBe(1)
		})
	})

	describe('main function detection', () => {
		test('handles exported async main function', () => {
			const input = `export async function main() {
  console.log('hello')
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('handles exported sync main function', () => {
			const input = `export function main() {
  console.log('hello')
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('main().catch(sendErrorResponse)')
		})
	})

	describe('edge cases', () => {
		test('handles empty file', () => {
			const input = ''
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain("import { sendErrorResponse } from '@chainlink/cre-sdk'")
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('handles file with only imports', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('Runner, sendErrorResponse')
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('ignores main() in comments', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

// main() is called automatically
/* main().catch(sendErrorResponse) */

export async function main() {
  console.log('hello')
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Should add wrapper because the main() calls in comments don't count
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('ignores main() in string literals', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

export async function main() {
  const code = "main().catch(handler)"
  console.log(code)
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Should add wrapper because the main() in string doesn't count
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('preserves original code structure', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

const config = {
  name: 'test'
}

export async function main() {
  const runner = await Runner.newRunner()
  await runner.run()
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('const config = {')
			expect(result).toContain("name: 'test'")
			expect(result).toContain('export async function main()')
		})

		test('handles Windows-style line endings', () => {
			const input =
				"import { Runner } from '@chainlink/cre-sdk'\r\n\r\nexport async function main() {\r\n  console.log('hello')\r\n}"
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('sendErrorResponse')
			expect(result).toContain('main().catch(sendErrorResponse)')
		})

		test('handles file ending without newline', () => {
			const input = `import { Runner } from '@chainlink/cre-sdk'

export async function main() {
  console.log('hello')
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('main().catch(sendErrorResponse)')
			expect(result.endsWith('\n')).toBe(true)
		})
	})

	describe('real-world workflow examples', () => {
		test('wraps typical hello-world workflow', () => {
			const input = `import { cre, Runner, type Config } from '@chainlink/cre-sdk'

interface WorkflowConfig extends Config {
  message: string
}

async function initWorkflow(runtime: cre.Runtime<WorkflowConfig>) {
  const config = runtime.getConfig()
  console.log(config.message)
}

export async function main() {
  const runner = await Runner.newRunner<WorkflowConfig>()
  await runner.run(initWorkflow)
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('cre, Runner, type Config, sendErrorResponse')
			expect(result).toContain('main().catch(sendErrorResponse)')
			// Original code should be preserved
			expect(result).toContain('interface WorkflowConfig extends Config')
			expect(result).toContain('async function initWorkflow')
		})

		test('wraps workflow with http capability', () => {
			const input = `import { cre, Runner, type Config } from '@chainlink/cre-sdk'
import { http } from '@chainlink/cre-sdk/capabilities'

interface WorkflowConfig extends Config {
  apiUrl: string
}

async function initWorkflow(runtime: cre.Runtime<WorkflowConfig>) {
  const config = runtime.getConfig()
  const response = await http.fetch(runtime, { url: config.apiUrl })
  console.log(response)
}

export async function main() {
  const runner = await Runner.newRunner<WorkflowConfig>()
  await runner.run(initWorkflow)
}`
			const result = wrapWorkflowCode(input, 'test.ts')

			expect(result).toContain('sendErrorResponse')
			expect(result).toContain('main().catch(sendErrorResponse)')
			// Should preserve the http import
			expect(result).toContain("import { http } from '@chainlink/cre-sdk/capabilities'")
		})

		test('does not modify workflow that already has proper error handling', () => {
			const input = `import { cre, Runner, sendErrorResponse, type Config } from '@chainlink/cre-sdk'

interface WorkflowConfig extends Config {
  message: string
}

async function initWorkflow(runtime: cre.Runtime<WorkflowConfig>) {
  const config = runtime.getConfig()
  console.log(config.message)
}

export async function main() {
  const runner = await Runner.newRunner<WorkflowConfig>()
  await runner.run(initWorkflow)
}

main().catch(sendErrorResponse)`
			const result = wrapWorkflowCode(input, 'test.ts')

			// Should only have one main().catch() call
			expect(result.match(/main\(\)\.catch\(sendErrorResponse\)/g)?.length).toBe(1)
			// Should only have one sendErrorResponse in imports
			const importLine = result.split('\n').find((l) => l.includes('@chainlink/cre-sdk'))
			expect(importLine?.match(/sendErrorResponse/g)?.length).toBe(1)
		})
	})
})
