import { type Hex } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
	gatewayURL: z.string(),
	privateKey: z.string(),
})

export type Config = z.infer<typeof configSchema>

export const getConfig = () => {
	const config = configSchema.parse({
		gatewayURL: process.env.GATEWAY_URL,
		privateKey:
			(process.env.PRIVATE_KEY?.startsWith('0x')
				? process.env.PRIVATE_KEY
				: `0x${process.env.PRIVATE_KEY}`) || '0x',
	})

	return {
		gatewayURL: config.gatewayURL,
		privateKey: config.privateKey as Hex,
	}
}
