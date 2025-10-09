import { glob } from 'fast-glob'
import { copyFile, mkdir } from 'fs/promises'
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
}

export const main = buildTypes
