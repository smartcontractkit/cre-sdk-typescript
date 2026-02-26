import { glob } from 'fast-glob'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const buildTypes = async () => {
	console.log('🔧 Copying type definition files to dist...')

	// Define paths relative to the scripts directory
	const packageRoot = join(import.meta.dir, '../..')
	const sourceDir = join(packageRoot, 'src/sdk/types')
	const destDir = join(packageRoot, 'dist/sdk/types')

	// Ensure the destination directory exists
	await mkdir(destDir, { recursive: true })

	// Find all .d.ts files in the source directory
	const typeFiles = await glob('*.d.ts', {
		cwd: sourceDir,
		absolute: false,
	})

	// Copy each file
	for (const file of typeFiles) {
		const sourceFile = join(sourceDir, file)
		const destFile = join(destDir, file)
		await copyFile(sourceFile, destFile)
		console.log(`  ✓ Copied ${file}`)
	}

	console.log(`✅ Copied ${typeFiles.length} type definition file(s) to dist/sdk/types`)

	// Prepend triple-slash references to dist/index.d.ts so consumers pick up
	// global type augmentations (e.g. restricted-apis.d.ts) automatically.
	// tsc strips these from the emitted .d.ts, so we add them back here.
	//
	// Note: restricted-node-modules is intentionally NOT referenced from src/index.ts
	// because the SDK's own build scripts legitimately use Node.js modules. It is
	// added here explicitly so that workflow consumers still receive the restrictions.
	const indexDts = join(packageRoot, 'dist/index.d.ts')
	const sourceIndex = join(packageRoot, 'src/index.ts')
	const sourceContent = await readFile(sourceIndex, 'utf-8')

	const refsFromSource = sourceContent
		.split('\n')
		.filter((line) => line.startsWith('/// <reference types='))

	// This is the part where we re-add restricted-node-modules.d.ts for the consumers
	const distributionOnlyRefs = ['/// <reference types="./sdk/types/restricted-node-modules" />']

	const tripleSlashRefs = [...refsFromSource, ...distributionOnlyRefs].join('\n')

	if (tripleSlashRefs) {
		const indexContent = await readFile(indexDts, 'utf-8')
		// Strip any existing triple-slash references from the top of the file
		// so that re-running build-types is idempotent.
		const withoutExistingRefs = indexContent
			.split('\n')
			.filter((line) => !line.startsWith('/// <reference types='))
			.join('\n')
			.replace(/^\n+/, '') // trim leading blank lines left after stripping
		await writeFile(indexDts, `${tripleSlashRefs}\n${withoutExistingRefs}`)
		console.log('✅ Added triple-slash references to dist/index.d.ts')
	}
}

export const main = buildTypes
