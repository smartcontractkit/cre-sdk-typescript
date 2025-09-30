import { describe, expect, it } from 'bun:test'
import type { ExecuteRequest } from '@cre/generated/sdk/v1beta/sdk_pb'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { z } from 'zod'
import { type ConfigHandlerParams, configHandler } from './index'

// Mock schema for testing
const mockSchema: StandardSchemaV1<any, any> = {
	'~standard': {
		version: 1,
		vendor: 'test',
		validate: (input: any) => {
			if (typeof input !== 'object' || input === null) {
				return { issues: [{ message: 'Expected object' }] }
			}
			return { value: input }
		},
	},
} as StandardSchemaV1<any, any>

// Helper to create mock ExecuteRequest
const createMockRequest = (configData: string): ExecuteRequest =>
	({
		config: new TextEncoder().encode(configData),
	}) as ExecuteRequest

describe('configHandler', () => {
	it('should work with no params passed in - uses default JSON parser', async () => {
		const configData = '{"name": "test", "value": 42}'
		const request = createMockRequest(configData)

		const result = await configHandler(request)

		expect(result).toEqual({ name: 'test', value: 42 })
	})

	it('should work with only parser passed in - JSON parsing', async () => {
		const configData = '{"schedule": "0 0 * * *", "enabled": true}'
		const request = createMockRequest(configData)

		const customParser = (config: Uint8Array) => {
			const json = JSON.parse(Buffer.from(config).toString())
			return { ...json, parsed: true }
		}

		const result = await configHandler(request, { configParser: customParser })

		expect(result).toEqual({
			schedule: '0 0 * * *',
			enabled: true,
			parsed: true,
		})
	})

	it('should work with only parser passed in - noop parser (keeps Uint8Array)', async () => {
		const configData = 'raw binary data'
		const request = createMockRequest(configData)

		const noopParser = (config: Uint8Array) => config

		const result = await configHandler(request, { configParser: noopParser })

		expect(result).toBeInstanceOf(Uint8Array)
		expect(new TextDecoder().decode(result as Uint8Array)).toBe(configData)
	})

	it('should work with only schema passed in - uses default parser', async () => {
		const configData = '{"valid": "json", "number": 123}'
		const request = createMockRequest(configData)

		const result = await configHandler(request, { configSchema: mockSchema })

		expect(result).toEqual({ valid: 'json', number: 123 })
	})

	it('should work with both parser and schema', async () => {
		const configData = '{"raw": "data", "needs": "processing"}'
		const request = createMockRequest(configData)

		const customParser = (config: Uint8Array) => {
			const parsed = JSON.parse(Buffer.from(config).toString())
			return { ...parsed, processed: true }
		}

		const result = await configHandler(request, {
			configParser: customParser,
			configSchema: mockSchema,
		})

		expect(result).toEqual({
			raw: 'data',
			needs: 'processing',
			processed: true,
		})
	})

	it('should throw error when schema validation fails', async () => {
		const configData = 'invalid json'
		const request = createMockRequest(configData)

		expect(configHandler(request, { configSchema: mockSchema })).rejects.toThrow()
	})

	it('should handle empty JSON object', async () => {
		const configData = '{}'
		const request = createMockRequest(configData)

		const result = await configHandler(request)

		expect(result).toEqual({})
	})

	it('should handle complex nested JSON', async () => {
		const configData = JSON.stringify({
			nested: {
				array: [1, 2, 3],
				object: { key: 'value' },
			},
			boolean: true,
			nullValue: null,
		})
		const request = createMockRequest(configData)

		const result = await configHandler(request)

		expect(result).toEqual({
			nested: {
				array: [1, 2, 3],
				object: { key: 'value' },
			},
			boolean: true,
			nullValue: null,
		})
	})

	it('should work with custom parser that returns different type', async () => {
		const configData = '{"count": 5}'
		const request = createMockRequest(configData)

		const customParser = (config: Uint8Array) => {
			const parsed = JSON.parse(Buffer.from(config).toString())
			return parsed.count * 2 // Return number instead of object
		}

		const result = await configHandler(request, { configParser: customParser })

		expect(result).toBe(10)
	})

	it('should work with Zod schema validation', async () => {
		const configData = JSON.stringify({
			schedule: '0 0 * * *',
			apiUrl: 'https://api.example.com',
			timeout: 5000,
			retries: 3,
		})
		const request = createMockRequest(configData)

		// Create Zod schema
		const zodSchema = z.object({
			schedule: z.string(),
			apiUrl: z.string().url(),
			timeout: z.number().min(1000).max(30000),
			retries: z.number().min(0).max(10),
		})

		const result = await configHandler(request, { configSchema: zodSchema })

		expect(result).toEqual({
			schedule: '0 0 * * *',
			apiUrl: 'https://api.example.com',
			timeout: 5000,
			retries: 3,
		})
	})

	it('should throw error when Zod schema validation fails', async () => {
		const configData = JSON.stringify({
			schedule: 'invalid cron',
			apiUrl: 'not-a-url', // Invalid URL
			timeout: 100, // Too low
			retries: 15, // Too high
		})
		const request = createMockRequest(configData)

		const zodSchema = z.object({
			schedule: z.string(),
			apiUrl: z.string().url(),
			timeout: z.number().min(1000).max(30000),
			retries: z.number().min(0).max(10),
		})

		expect(configHandler(request, { configSchema: zodSchema })).rejects.toThrow()
	})

	it('should work with Zod schema and custom parser', async () => {
		const configData = JSON.stringify({
			rawData: 'base64encoded',
			metadata: { version: '1.0', type: 'config' },
		})
		const request = createMockRequest(configData)

		// Custom parser that processes the data
		const customParser = (config: Uint8Array) => {
			const parsed = JSON.parse(Buffer.from(config).toString())
			return {
				schedule: '0 0 * * *', // Extract from rawData
				apiUrl: 'https://api.example.com', // Extract from rawData
				timeout: 5000,
				retries: 3,
				metadata: parsed.metadata,
			}
		}

		// Zod schema for the processed data
		const zodSchema = z.object({
			schedule: z.string(),
			apiUrl: z.string().url(),
			timeout: z.number().min(1000).max(30000),
			retries: z.number().min(0).max(10),
			metadata: z.object({
				version: z.string(),
				type: z.string(),
			}),
		})

		const result = await configHandler(request, {
			configParser: customParser,
			configSchema: zodSchema,
		})

		expect(result).toEqual({
			schedule: '0 0 * * *',
			apiUrl: 'https://api.example.com',
			timeout: 5000,
			retries: 3,
			metadata: { version: '1.0', type: 'config' },
		})
	})
})
