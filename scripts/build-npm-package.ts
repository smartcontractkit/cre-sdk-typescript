import { $ } from 'bun'
import { existsSync } from 'fs'
import { cp, mkdir, rm } from 'fs/promises'

export const main = async () => {
	console.info('🏗️  Building NPM package...')

	try {
		// Clean previous build
		if (existsSync('dist')) {
			console.info('🧹 Cleaning previous build...')
			await rm('dist', { recursive: true, force: true })
		}

		// Create dist directory
		await mkdir('dist', { recursive: true })

		// Build the main SDK using Bun (which handles TypeScript natively)
		console.info('📦 Building SDK with TypeScript...')

		// Build main index file
		const buildResult = await Bun.build({
			entrypoints: ['./src/index.ts'],
			outdir: './dist',
			target: 'node',
			format: 'esm',
			sourcemap: 'external',
			minify: false,
			external: [
				'@bufbuild/protobuf',
				'@bufbuild/protoc-gen-es',
				'@standard-schema/spec',
				'rxjs',
				'viem',
				'zod',
			],
		})

		// Build individual source files to preserve directory structure
		console.info('📦 Building individual modules...')
		const individualResult = await Bun.build({
			entrypoints: [
				'./src/sdk/utils/values/consensus-hooks.ts',
				'./src/sdk/utils/values/consensus.ts',
				'./src/sdk/utils/values/value.ts',
			],
			outdir: './dist',
			target: 'node',
			format: 'esm',
			root: './src',
			external: [
				'@bufbuild/protobuf',
				'@bufbuild/protoc-gen-es',
				'@standard-schema/spec',
				'rxjs',
				'viem',
				'zod',
			],
		})

		if (!buildResult.success) {
			console.error('❌ Main build failed:', buildResult.logs)
			throw new Error('Main build failed')
		}

		if (!individualResult.success) {
			console.error('❌ Individual modules build failed:', individualResult.logs)
			throw new Error('Individual modules build failed')
		}

		console.info(
			`✅ Built ${buildResult.outputs.length} main files and ${individualResult.outputs.length} individual modules`,
		)

		// Create TypeScript declaration files
		console.info('📝 Creating TypeScript declarations...')

		// Main index declaration
		await Bun.write(
			'./dist/index.d.ts',
			`
// CRE SDK Type Declarations
export * from '../src/index.ts'

// Re-export main CRE object
export declare const cre: {
  capabilities: {
    CronCapability: any;
    HTTPClient: any;
    EVMClient: any;
  };
  config: any;
  handler: any;
  newRunner: any;
  runInNodeMode: any;
  utils: {
    val: any;
    consensus: {
      getAggregatedValue: any;
    };
    fetch: any;
  };
  sendResponseValue: any;
}

// Common types
export type Address = string
export type Hex = string
`,
		)

		// Individual module declarations
		await mkdir('dist/sdk/utils/values', { recursive: true })

		await Bun.write(
			'./dist/sdk/utils/values/consensus-hooks.d.ts',
			`export * from '../../../../src/sdk/utils/values/consensus-hooks.ts';`,
		)

		await Bun.write(
			'./dist/sdk/utils/values/consensus.d.ts',
			`export * from '../../../../src/sdk/utils/values/consensus.ts';`,
		)

		await Bun.write(
			'./dist/sdk/utils/values/value.d.ts',
			`export * from '../../../../src/sdk/utils/values/value.ts';`,
		)

		// Copy essential files
		console.info('📁 Copying essential files...')

		// Copy package.json (required for NPM publishing)
		await cp('package.json', 'dist/package.json')

		// Copy README for NPM
		if (existsSync('README-NPM.md')) {
			await cp('README-NPM.md', 'dist/README.md')
		}

		// Copy LICENSE if it exists
		if (existsSync('LICENSE.md')) {
			await cp('LICENSE.md', 'dist/LICENSE.md')
		}

		// Copy binaries
		await cp('bin', 'dist/bin', { recursive: true })

		// Copy WIT file for WASM compilation
		await mkdir('dist/wit', { recursive: true })
		await cp('src/workflows/workflow.wit', 'dist/wit/workflow.wit')

		// Copy script files needed by CLI
		await mkdir('dist/scripts', { recursive: true })
		const scriptFiles = [
			'compile-to-js.ts',
			'compile-to-wasm.ts',
			'compile-single-workflow-to-wasm.ts',
			'build-single-workflow-js.ts',
			'build-single-workflow.ts',
			'compile-javy-sdk-plugin.ts',
			'compile-javy-with-sdk-plugin.ts',
			'clean.ts',
			'run.ts',
		]

		for (const script of scriptFiles) {
			try {
				await cp(`scripts/${script}`, `dist/scripts/${script}`)
			} catch (error) {
				console.warn(`⚠️  Could not copy script ${script}:`, error.message)
			}
		}

		// Build Javy plugin (required for WASM compilation)
		console.info('🔧 Building Javy SDK plugin...')
		await $`bun scripts/run.ts compile-javy-sdk-plugin`

		// Build Javy with SDK plugin
		console.info('🔧 Building Javy with SDK plugin...')
		await $`bun scripts/run.ts compile-javy-with-sdk-plugin`

		// Verify plugin file exists
		if (existsSync('dist/javy-chainlink-sdk.plugin.wasm')) {
			console.info('✅ Javy plugin built successfully')
		} else {
			console.warn('⚠️  Javy plugin not found, but continuing build...')
		}

		console.info('✅ NPM package build completed!')
		console.info('📦 Package contents:')
		await $`ls -la dist/`
	} catch (error) {
		console.error('❌ Build failed:', error)
		process.exit(1)
	}
}
