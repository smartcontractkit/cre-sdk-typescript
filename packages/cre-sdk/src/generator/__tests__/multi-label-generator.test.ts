import { describe, expect, it } from 'bun:test'
import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { processLabels } from '../label-utils'

describe('Multi-Label Generator Test', () => {
	it('should process multiple label types correctly', () => {
		// Create a mock capability metadata with all 5 label types
		const mockCapOption: any = {
			mode: Mode.DON,
			capabilityId: 'multi-label-test@1.0.0',
			labels: {
				ChainSelector: {
					kind: {
						case: 'uint64Label',
						value: {
							defaults: {
								'ethereum-mainnet': 5009297550715157269n,
								'polygon-mainnet': 4051577828743386545n,
							},
						},
					},
				},
				Environment: {
					kind: {
						case: 'stringLabel',
						value: {
							defaults: {
								production: 'prod',
								staging: 'stage',
								development: 'dev',
							},
						},
					},
				},
				RegionId: {
					kind: {
						case: 'uint32Label',
						value: {
							defaults: {
								'us-east-1': 1,
								'eu-west-1': 2,
								'ap-southeast-1': 3,
							},
						},
					},
				},
				Offset: {
					kind: {
						case: 'int32Label',
						value: {
							defaults: {
								'negative-offset': -100,
								'zero-offset': 0,
								'positive-offset': 100,
							},
						},
					},
				},
				Timestamp: {
					kind: {
						case: 'int64Label',
						value: {
							defaults: {
								past: -1234567890n,
								epoch: 0n,
								future: 1234567890n,
							},
						},
					},
				},
			},
		}

		// Process labels
		const labels = processLabels(mockCapOption)

		// Verify we got all 5 labels
		expect(labels).toHaveLength(5)

		// Verify ChainSelector label
		const chainSelector = labels.find((l) => l.name === 'ChainSelector')
		expect(chainSelector).toBeDefined()
		expect(chainSelector?.type).toBe('bigint')
		expect(chainSelector?.tsType).toBe('bigint')
		expect(chainSelector?.defaults).toEqual({
			'ethereum-mainnet': 5009297550715157269n,
			'polygon-mainnet': 4051577828743386545n,
		})

		// Verify Environment label
		const environment = labels.find((l) => l.name === 'Environment')
		expect(environment).toBeDefined()
		expect(environment?.type).toBe('string')
		expect(environment?.tsType).toBe('string')
		expect(environment?.defaults).toEqual({
			production: 'prod',
			staging: 'stage',
			development: 'dev',
		})

		// Verify RegionId label (uint32)
		const regionId = labels.find((l) => l.name === 'RegionId')
		expect(regionId).toBeDefined()
		expect(regionId?.type).toBe('number')
		expect(regionId?.tsType).toBe('number')
		expect(regionId?.defaults).toEqual({
			'us-east-1': 1,
			'eu-west-1': 2,
			'ap-southeast-1': 3,
		})

		// Verify Offset label (int32)
		const offset = labels.find((l) => l.name === 'Offset')
		expect(offset).toBeDefined()
		expect(offset?.type).toBe('number')
		expect(offset?.tsType).toBe('number')
		expect(offset?.defaults).toEqual({
			'negative-offset': -100,
			'zero-offset': 0,
			'positive-offset': 100,
		})

		// Verify Timestamp label (int64)
		const timestamp = labels.find((l) => l.name === 'Timestamp')
		expect(timestamp).toBeDefined()
		expect(timestamp?.type).toBe('bigint')
		expect(timestamp?.tsType).toBe('bigint')
		expect(timestamp?.defaults).toEqual({
			past: -1234567890n,
			epoch: 0n,
			future: 1234567890n,
		})
	})
})
