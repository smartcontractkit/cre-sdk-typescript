import { createExtensionAccessor } from '@chainlink/cre-sdk-javy-plugin/runtime/validate-extension'
import { z } from 'zod'

const rustBetaSchema = z.object({
	greet: z.function().args().returns(z.string()),
})

export type RustBeta = z.infer<typeof rustBetaSchema>

declare global {
	var rustBeta: RustBeta
}

// biome-ignore lint/suspicious/noRedeclare: global augmentation declares rustBeta; this export is the validated accessor
export const rustBeta = createExtensionAccessor('rustBeta', rustBetaSchema)
