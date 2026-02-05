import {
	CronCapability,
	consensusIdenticalAggregation,
	getHeader,
	HTTPClient,
	handler,
	type NodeRuntime,
	ok,
	Runner,
	type Runtime,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

const dataSchema = z.object({
	items: z.array(
		z.object({
			id: z.number(),
			name: z.string(),
			value: z.number(),
		}),
	),
})
type Data = z.infer<typeof dataSchema>

/**
 * Parses Set-Cookie header(s) into a Cookie request header value.
 * When multiple Set-Cookie headers are present, the HTTP runtime may
 * concatenate them with ", " (standard header folding). Each cookie
 * entry looks like "name=value; attributes..." — we extract "name=value"
 * from each and join them with "; " for the outgoing Cookie header.
 */
function parseCookieHeader(setCookieHeader: string): string {
	return setCookieHeader
		.split(',')
		.map((entry) => entry.trim().split(';')[0].trim())
		.filter(Boolean)
		.join('; ')
}

const sessionWorkflow = (nodeRuntime: NodeRuntime<Config>): Data => {
	const httpClient = new HTTPClient()
	const baseUrl = nodeRuntime.config.apiUrl

	// ── Step 1: Login ────────────────────────────────────────────────────
	nodeRuntime.log('Logging in...')

	const loginResp = httpClient
		.sendRequest(nodeRuntime, {
			url: `${baseUrl}/auth/login`,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: new TextEncoder().encode(
				JSON.stringify({ username: 'testuser', password: 'testpass' }),
			),
		})
		.result()

	if (!ok(loginResp)) {
		throw new Error(`Login failed with status: ${loginResp.statusCode}`)
	}

	nodeRuntime.log('Login successful')

	// ── Step 2: Extract cookies from the response ────────────────────────
	const setCookie = getHeader(loginResp, 'set-cookie')
	if (!setCookie) {
		throw new Error('No Set-Cookie header in login response')
	}

	const cookieHeader = parseCookieHeader(setCookie)
	nodeRuntime.log(`Forwarding cookies: ${cookieHeader}`)

	// ── Step 3: Fetch protected data ─────────────────────────────────────
	nodeRuntime.log('Fetching protected data...')

	const dataResp = httpClient
		.sendRequest(nodeRuntime, {
			url: `${baseUrl}/auth/data`,
			method: 'GET',
			headers: { Cookie: cookieHeader },
		})
		.result()

	if (!ok(dataResp)) {
		throw new Error(`Data fetch failed with status: ${dataResp.statusCode}`)
	}

	const bodyText = new TextDecoder().decode(dataResp.body)
	const data = dataSchema.parse(JSON.parse(bodyText.trim()))
	nodeRuntime.log('Data fetched successfully')

	// ── Step 4: Logout ───────────────────────────────────────────────────
	nodeRuntime.log('Logging out...')

	const logoutResp = httpClient
		.sendRequest(nodeRuntime, {
			url: `${baseUrl}/auth/logout`,
			method: 'POST',
			headers: { Cookie: cookieHeader },
		})
		.result()

	if (!ok(logoutResp)) {
		throw new Error(`Logout failed with status: ${logoutResp.statusCode}`)
	}

	nodeRuntime.log('Logged out')

	return data
}

const onCronTrigger = (runtime: Runtime<Config>): Data => {
	const result = runtime.runInNodeMode(sessionWorkflow, consensusIdenticalAggregation())().result()
	runtime.log('Session workflow completed successfully')
	return result
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()
	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}
