import { createExtensionAccessor } from '@chainlink/cre-sdk-javy-plugin/runtime/validate-extension'
import { z } from 'zod'

const rustAlphaSchema = z.object({
	greet: z.function().input([], z.unknown()).output(z.string()),
})

export type RustAlpha = z.infer<typeof rustAlphaSchema>

declare global {
	var rustAlpha: RustAlpha
}

// biome-ignore lint/suspicious/noRedeclare: global augmentation declares rustAlpha; this export is the validated accessor
export const rustAlpha = createExtensionAccessor('rustAlpha', rustAlphaSchema)
