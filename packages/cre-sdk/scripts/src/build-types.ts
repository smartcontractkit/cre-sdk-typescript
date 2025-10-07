import { glob } from 'fast-glob'
import { copyFile, mkdir } from 'fs/promises'
import { dirname, join, relative } from 'path'

const buildTypes = async () => {
	console.log('🔧 Including restricted-apis type in built files...')

	// Define paths relative to the scripts directory
	const packageRoot = join(import.meta.dir, '../..')
	const sourceFile = join(packageRoot, 'src/sdk/types/restricted-apis.d.ts')
	const destFile = join(packageRoot, 'dist/restricted-apis.d.ts')

	// Ensure the dist directory exists
	await mkdir(dirname(destFile), { recursive: true })

	// Copy the file
	await copyFile(sourceFile, destFile)

	console.log('✅ Included restricted-apis type in the build.')
}

export const main = buildTypes
