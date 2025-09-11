import { $ } from 'bun'
import { rm } from 'fs/promises'

export const main = async () => {
	console.info('🧹 Cleaning build artifacts...')

	try {
		// Remove dist directory
		await rm('dist', { recursive: true, force: true })
		console.info('✅ Removed dist directory')

		// Remove any .wasm files in workflows
		await $`find src/workflows -name "*.wasm" -delete`.nothrow()
		console.info('✅ Removed WASM files from workflows')

		// Remove any .js files in workflows (if any)
		await $`find src/workflows -name "*.js" -delete`.nothrow()
		console.info('✅ Removed JS files from workflows')

		console.info('🎉 Clean completed!')
	} catch (error) {
		console.error('❌ Clean failed:', error)
		process.exit(1)
	}
}
