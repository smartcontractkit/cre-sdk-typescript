import type { z } from 'zod'

/**
 * Creates a lazy-validated accessor for a Rust extension registered on globalThis.
 *
 * Library authors call this with the globalThis key and a zod schema.
 * The returned function validates on first access and caches the result.
 */
export function createExtensionAccessor<T>(name: string, schema: z.ZodType<T>): () => T {
	let cached: T | null = null
	return () => {
		if (!cached) {
			const obj = (globalThis as Record<string, unknown>)[name]
			try {
				cached = schema.parse(obj)
			} catch (_error) {
				const detail =
					obj == null
						? `"${name}" was not found on globalThis`
						: `"${name}" failed validation: ${_error instanceof Error ? _error.message : String(_error)}`
				throw new Error(
					`${detail}. ` +
						`It must be provided by the ${name} plugin. ` +
						`This usually means the plugin has not been loaded. ` +
						`Use --plugin <path-to-plugin.wasm> to load a pre-built plugin, ` +
						`or --cre-exports <path-to-source> to compile from source when building your workflow.`,
				)
			}
		}
		return cached
	}
}
