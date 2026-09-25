import { glob } from 'fast-glob'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Names of the type declaration files whose triple-slash references apply the
 * type-level runtime restrictions (marking restricted Node.js modules and
 * unavailable global APIs as `never`).
 *
 * These references are ambient global declarations: once any file in a
 * TypeScript program loads them, the restrictions apply to every file in that
 * program. The default entry (dist/index.d.ts) includes them; the
 * dist/index-unrestricted.d.ts entry (published as the
 * `@chainlink/cre-sdk/unrestricted` subpath) omits them so consumers whose
 * programs also contain Node.js tooling can opt out. `cre compile` enforcement
 * is unaffected: the runtime compatibility validator detects restricted usage
 * by module specifier and identifier name, not by these types.
 */
const restrictionRefNames = new Set(['restricted-apis', 'restricted-node-modules'])

/** Returns the triple-slash `types` reference lines found in file content. */
export const extractTripleSlashRefs = (content: string): string[] =>
	content.split('\n').filter((line) => line.trim().startsWith('/// <reference types='))

/** Returns true if a triple-slash reference points at a restriction declaration. */
export const isRestrictionRef = (ref: string): boolean => {
	const match = ref.match(/types=["']([^"']+)["']/)
	if (!match) return false
	const refName = match[1]?.split('/').pop()
	return refName != null && restrictionRefNames.has(refName)
}

/**
 * Strips existing triple-slash references from declaration content so that
 * re-running the build is idempotent.
 */
export const stripTripleSlashRefs = (content: string): string =>
	content
		.split('\n')
		.filter((line) => !line.trim().startsWith('/// <reference types='))
		.join('\n')
		.replace(/^\n+/, '') // trim leading blank lines left after stripping

/** Prepends triple-slash references to already-stripped declaration content. */
export const withTripleSlashRefs = (refs: string[], content: string): string =>
	refs.length > 0 ? `${refs.join('\n')}\n${content}` : content

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
	const indexDts = join(packageRoot, 'dist/index.d.ts')
	const sourceIndex = join(packageRoot, 'src/index.ts')
	const sourceContent = await readFile(sourceIndex, 'utf-8')

	const refsFromSource = extractTripleSlashRefs(sourceContent)

	// Add references for consumer-only type declarations that cannot be in src/index.ts
	// because they would break the SDK's own scripts/tests (which legitimately use Node.js APIs).
	const consumerOnlyRefs = ['/// <reference types="./sdk/types/restricted-node-modules" />']

	const allRefs = [...refsFromSource, ...consumerOnlyRefs]

	// The unrestricted entry keeps every non-restriction reference (the CRE
	// runtime globals from global.d.ts, which are safe to combine with
	// @types/node) but omits the restriction references.
	const unrestrictedRefs = allRefs.filter((ref) => !isRestrictionRef(ref))

	const indexContent = await readFile(indexDts, 'utf-8')
	const strippedContent = stripTripleSlashRefs(indexContent)

	await writeFile(indexDts, withTripleSlashRefs(allRefs, strippedContent))
	console.log('✅ Added triple-slash references to dist/index.d.ts')

	// Type-level opt-out entry: same public API surface, without the ambient
	// runtime-restriction declarations. Published as the
	// `@chainlink/cre-sdk/unrestricted` subpath.
	const unrestrictedDts = join(packageRoot, 'dist/index-unrestricted.d.ts')
	await writeFile(unrestrictedDts, withTripleSlashRefs(unrestrictedRefs, strippedContent))
	console.log('✅ Wrote dist/index-unrestricted.d.ts (restriction references omitted)')

	// Runtime re-export for the unrestricted subpath. A real .js file (not just
	// a .d.ts) is required so consumers who redirect `@chainlink/cre-sdk` to
	// this entry via tsconfig `paths` keep working at runtime: Bun honors
	// tsconfig `paths` itself and would otherwise load the .d.ts as JavaScript.
	const unrestrictedJs = join(packageRoot, 'dist/index-unrestricted.js')
	await writeFile(unrestrictedJs, "export * from './index.js'\n")
	console.log('✅ Wrote dist/index-unrestricted.js re-export wrapper')

	// JS targets for the types-only restriction subpath exports. These are
	// generated here rather than as same-named .ts stubs in src/sdk/types: a
	// .ts file sharing a name with a restriction .d.ts shadows it in the
	// SDK's own build program (tsconfig.build.json includes src/sdk/**/*),
	// which would remove the build-time restriction guard for SDK source.
	// See build-program-restrictions.test.ts.
	for (const typeName of ['restricted-apis', 'restricted-node-modules']) {
		const typeJs = join(destDir, `${typeName}.js`)
		await writeFile(typeJs, 'export {}\n')
		console.log(`✅ Wrote ${typeName}.js subpath target`)
	}
}

export const main = buildTypes
