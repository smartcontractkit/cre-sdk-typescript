import { describe, expect, test } from 'bun:test'

/**
 * Tests for compile-workflow.ts argument parsing and mode selection.
 * The actual compilation is tested via E2E; these tests verify CLI logic.
 */
describe('compile-workflow parseArgs', () => {
	// We can't easily unit test the main() without spawning, so we test the
	// parseArgs logic by importing and running it. The parseArgs is not exported.
	// Instead we test the mutual exclusivity and default-plugin behavior via
	// a small script that invokes the compiler with different args.

	test('--plugin and --cre-exports mutual exclusivity exits with error', async () => {
		const proc = Bun.spawn({
			cmd: [
				'bun',
				import.meta.dir + '/compile-workflow.ts',
				'--plugin',
				'/tmp/fake.plugin.wasm',
				'--cre-exports',
				'/tmp/fake',
				'/dev/null',
				'/tmp/out.wasm',
			],
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: import.meta.dir + '/..',
		})
		const exitCode = await proc.exited
		expect(exitCode).not.toBe(0)
		const stderr = await new Response(proc.stderr).text()
		expect(stderr).toContain('mutually exclusive')
	})

	test('default plugin mode when neither --plugin nor --cre-exports', async () => {
		// Create a minimal JS file
		const tmpJs = `/tmp/cre-test-${Date.now()}.js`
		await Bun.write(tmpJs, 'export async function main() { return "ok"; }')
		const tmpWasm = `/tmp/cre-test-${Date.now()}.wasm`

		const proc = Bun.spawn({
			cmd: ['bun', import.meta.dir + '/compile-workflow.ts', tmpJs, tmpWasm],
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: import.meta.dir + '/..',
		})
		const exitCode = await proc.exited
		// May succeed (if dist plugin exists) or fail (plugin not found)
		// We just verify it doesn't fail with "mutually exclusive"
		const stderr = await new Response(proc.stderr).text()
		expect(stderr).not.toContain('mutually exclusive')
	})
})
