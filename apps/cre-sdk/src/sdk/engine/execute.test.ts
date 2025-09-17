import { describe, expect, mock, test } from 'bun:test'
import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import { EmptySchema } from '@bufbuild/protobuf/wkt'
import { TriggerEventSchema as ActionTriggerEventSchema } from '@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb'
import { OutputsSchema as BasicTriggerOutputsSchema } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import {
	type ExecuteRequest,
	ExecuteRequestSchema,
	ExecutionResultSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BasicCapability as ActionAndTriggerCapability } from '@cre/generated-sdk/capabilities/internal/actionandtrigger/v1/basic_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { handleExecuteRequest } from '@cre/sdk/engine/execute'
import { mockHostBindings } from '@cre/sdk/testhelpers/mock-host-bindings'
import { mockedRuntime } from '@cre/sdk/testhelpers/mock-runtime'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'
import { handler } from '@cre/sdk/workflow'

const emptyConfig = {}

const decodeExecutionResult = (result: Uint8Array) => fromBinary(ExecutionResultSchema, result)

describe('engine/execute', () => {
	test('subscribe returns TriggerSubscriptionRequest wrapped in ExecutionResult', async () => {
		const subs: string[] = []
		// mock sendResponse to capture the payload
		mockHostBindings.sendResponse.mockImplementation((resp: Uint8Array) => {
			const exec = decodeExecutionResult(resp)
			const ts = exec.result.case === 'triggerSubscriptions' ? exec.result.value : undefined
			expect(ts).toBeDefined()
			expect(ts!.subscriptions.length).toBe(3)
			ts!.subscriptions.forEach((s) => subs.push(`${s.id}:${s.method}:${s.payload?.typeUrl}`))
			return 0
		})

		const basic = new BasicTriggerCapability()
		const action = new ActionAndTriggerCapability()
		const workflow = [
			handler(basic.trigger({ name: 'first-trigger', number: 100 }), () => {}),
			handler(action.trigger({ name: 'second-trigger', number: 150 }), () => {}),
			handler(basic.trigger({ name: 'third-trigger', number: 200 }), () => {}),
		]

		const req: ExecuteRequest = create(ExecuteRequestSchema, {
			config: new Uint8Array(),
			request: { case: 'subscribe', value: create(EmptySchema) },
			maxResponseSize: 0n,
		})

		await handleExecuteRequest(req, workflow, emptyConfig, mockedRuntime)

		expect(subs[0]).toContain(
			'basic-test-trigger@1.0.0:Trigger:type.googleapis.com/capabilities.internal.basictrigger.v1.Config',
		)
		expect(subs[1]).toContain(
			'basic-test-action-trigger@1.0.0:Trigger:type.googleapis.com/capabilities.internal.actionandtrigger.v1.Config',
		)
		expect(subs[2]).toContain(
			'basic-test-trigger@1.0.0:Trigger:type.googleapis.com/capabilities.internal.basictrigger.v1.Config',
		)

		mockHostBindings.sendResponse.mockRestore()
	})

	test('trigger routes by id and decodes payload for correct handler', async () => {
		const calls: string[] = []

		const basic = new BasicTriggerCapability()
		const action = new ActionAndTriggerCapability()
		const workflow = [
			handler(basic.trigger({ name: 'first-trigger', number: 100 }), (_e, _r, out) => {
				// @ts-ignore
				calls.push(`basic:${out.coolOutput}`)
			}),
			handler(action.trigger({ name: 'second-trigger', number: 150 }), (_e, _r, out) => {
				// @ts-ignore
				calls.push(`action:${out.coolOutput}`)
			}),
			handler(basic.trigger({ name: 'third-trigger', number: 200 }), (_e, _r, out) => {
				// @ts-ignore
				calls.push(`basic2:${out.coolOutput}`)
			}),
		]

		// Build ExecuteRequest with id=1 (second handler) and payload of Action TriggerEvent
		const payloadAny = {
			typeUrl: getTypeUrl(ActionTriggerEventSchema),
			value: toBinary(
				ActionTriggerEventSchema,
				create(ActionTriggerEventSchema, { coolOutput: 'different' }),
			),
		}
		const req: ExecuteRequest = create(ExecuteRequestSchema, {
			config: new Uint8Array(),
			request: {
				case: 'trigger',
				value: { id: 1n, payload: payloadAny },
			},
			maxResponseSize: 0n,
		})

		await handleExecuteRequest(req, workflow, emptyConfig, mockedRuntime)

		expect(calls).toEqual(['action:different'])
	})

	test('trigger ignores out-of-range id (no handler invoked)', async () => {
		const calls: string[] = []
		const basic = new BasicTriggerCapability()
		const action = new ActionAndTriggerCapability()
		const workflow = [
			handler(basic.trigger({ name: 'first-trigger', number: 100 }), () => {
				calls.push('basic')
			}),
			handler(action.trigger({ name: 'second-trigger', number: 150 }), () => {
				calls.push('action')
			}),
		]

		const payloadAny = {
			typeUrl: getTypeUrl(ActionTriggerEventSchema),
			value: toBinary(
				ActionTriggerEventSchema,
				create(ActionTriggerEventSchema, { coolOutput: 'x' }),
			),
		}
		const req: ExecuteRequest = create(ExecuteRequestSchema, {
			config: new Uint8Array(),
			request: { case: 'trigger', value: { id: 999n, payload: payloadAny } },
			maxResponseSize: 0n,
		})

		await handleExecuteRequest(req, workflow, emptyConfig, mockedRuntime)
		expect(calls).toEqual([])
	})

	test('trigger ignores typeUrl mismatch for targeted handler', async () => {
		const calls: string[] = []
		const basic = new BasicTriggerCapability()
		const action = new ActionAndTriggerCapability()
		const workflow = [
			handler(basic.trigger({ name: 'first-trigger', number: 100 }), () => {
				calls.push('basic')
			}),
			handler(action.trigger({ name: 'second-trigger', number: 150 }), () => {
				calls.push('action')
			}),
		]

		// Intentionally send BasicTriggerOutputs payload to the action trigger handler (index 1)
		const payloadAny = {
			typeUrl: `type.googleapis.com/${BasicTriggerOutputsSchema.typeName}`,
			value: toBinary(
				BasicTriggerOutputsSchema,
				create(BasicTriggerOutputsSchema, { coolOutput: 'mismatch' }),
			),
		}
		const req: ExecuteRequest = create(ExecuteRequestSchema, {
			config: new Uint8Array(),
			request: { case: 'trigger', value: { id: 1n, payload: payloadAny } },
			maxResponseSize: 0n,
		})

		await handleExecuteRequest(req, workflow, emptyConfig, mockedRuntime)
		expect(calls).toEqual([])
	})
})
