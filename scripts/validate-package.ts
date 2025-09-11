import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

export const main = async () => {
	console.info('🔍 Validating NPM package build...')

	const requiredFiles = [
		'dist/package.json',
		'dist/index.js',
		'dist/index.d.ts',
		'dist/bin/cre-build',
		'dist/bin/javy-arm-macos-v5.0.4',
		'dist/bin/javy-arm-linux-v5.0.4',
		'dist/wit/workflow.wit',
		'dist/javy-chainlink-sdk.plugin.wasm',
		'dist/sdk/utils/values/consensus-hooks.js',
		'dist/sdk/utils/values/consensus-hooks.d.ts',
		'dist/sdk/utils/values/consensus.js',
		'dist/sdk/utils/values/consensus.d.ts',
		'dist/sdk/utils/values/value.js',
		'dist/sdk/utils/values/value.d.ts',
	]

	console.info('📋 Checking required files:')
	for (const file of requiredFiles) {
		if (existsSync(file)) {
			console.info(`✅ ${file}`)
		} else {
			console.error(`❌ Missing: ${file}`)
		}
	}

	// Check package.json structure
	console.info('\n📦 Validating package.json:')
	const pkg = JSON.parse(await readFile('dist/package.json', 'utf-8'))

	const requiredFields = ['name', 'version', 'description', 'main', 'types', 'bin']
	for (const field of requiredFields) {
		if (pkg[field]) {
			console.info(
				`✅ ${field}: ${typeof pkg[field] === 'object' ? JSON.stringify(pkg[field]) : pkg[field]}`,
			)
		} else {
			console.error(`❌ Missing package.json field: ${field}`)
		}
	}

	// Check bin files are executable
	console.info('\n🔧 Checking binary permissions:')
	const bins = [
		'dist/bin/cre-build',
		'dist/bin/javy-arm-macos-v5.0.4',
		'dist/bin/javy-arm-linux-v5.0.4',
	]
	for (const bin of bins) {
		if (existsSync(bin)) {
			const stats = await Bun.file(bin).stat()
			// Check if executable bit is set (mode & 0o111)
			const isExecutable = (stats.mode & 0o111) !== 0
			console.info(
				`${isExecutable ? '✅' : '❌'} ${bin} - ${isExecutable ? 'executable' : 'not executable'}`,
			)
		}
	}

	console.info('\n🎉 Package validation completed!')
	console.info('\n📦 Package structure ready for publishing!')
	console.info('   The dist/ directory contains all necessary files including package.json')
	console.info('   Individual modules are available for deep imports like:')
	console.info('   - @chainlink/cre-sdk/sdk/utils/values/consensus-hooks')
	console.info('   - @chainlink/cre-sdk/sdk/utils/values/consensus')
	console.info('   - @chainlink/cre-sdk/sdk/utils/values/value')
	console.info('\n📝 Next steps:')
	console.info('1. Run: bun run publish:npm:dry  # To test publishing')
	console.info('2. Run: bun run publish:npm      # To actually publish')
	console.info('3. Install: npm install @chainlink/cre-sdk')
	console.info('4. Use CLI: npx cre-build --help')
	console.info('\n💡 Publishing will use the dist/ directory with publishConfig.directory setting')
}
