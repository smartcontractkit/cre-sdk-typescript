import { create, fromBinary, fromJson, toBinary } from '@bufbuild/protobuf'
import {
	type ExecuteRequest,
	ExecuteRequestSchema,
	type ExecutionResult,
	ExecutionResultSchema,
	RestrictionsSchema,
	TriggerSubscriptionRequestSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type ConfigHandlerParams, configHandler } from '@cre/sdk/utils/config'
import type { SecretsProvider, Workflow } from '@cre/sdk/workflow'
import { Value } from '../utils'
import { hostBindings } from './host-bindings'
import { Runtime } from './runtime'

export class Runner<TConfig> {
	private constructor(
		private readonly config: TConfig,
		private readonly request: ExecuteRequest,
	) {}

	static async newRunner<TConfig, TIntermediateConfig = TConfig>(
		configHandlerParams?: ConfigHandlerParams<TConfig, TIntermediateConfig>,
	): Promise<Runner<TConfig>> {
		hostBindings.versionV2()
		const request = Runner.getRequest()
		const config = await configHandler<TConfig, TIntermediateConfig>(request, configHandlerParams)
		return new Runner<TConfig>(config, request)
	}

	private static getRequest(): ExecuteRequest {
		const argsString = hostBindings.getWasiArgs()
		let args
		try {
			args = JSON.parse(argsString)
		} catch (e) {
			throw new Error(
				'Invalid request: could not parse WASI arguments as JSON. Ensure the WASM runtime is passing valid arguments to the workflow',
			)
		}

		// SDK expects exactly 2 args:
		// 1st is the script name
		// 2nd is the base64 encoded request
		if (args.length !== 2) {
			throw new Error(
				`Invalid request: expected exactly 2 WASI arguments (script name and base64-encoded request payload), but received ${args.length}`,
			)
		}

		const base64Request = args[1]

		const bytes = Buffer.from(base64Request, 'base64')
		return fromBinary(ExecuteRequestSchema, bytes)
	}

	async run(
		initFn: (
			config: TConfig,
			secretsProvider: SecretsProvider,
		) => Promise<Workflow<TConfig>> | Workflow<TConfig>,
	) {
		const runtime = new Runtime(this.config, 0, this.request.maxResponseSize)

		let result: Promise<ExecutionResult> | ExecutionResult
		try {
			const workflow = await initFn(this.config, {
				getSecret: runtime.getSecret.bind(runtime),
			})

			switch (this.request.request.case) {
				case 'subscribe':
					result = this.handleSubscribePhase(this.request, workflow)
					break
				case 'trigger':
					result = this.handleExecutionPhase(this.request, workflow, runtime)
					break
				case 'preHook':
					result = this.handlePreHookPhase(this.request, workflow)
					break
				default:
					throw new Error(
						`Unknown request type '${this.request.request.case}': expected 'subscribe', 'trigger', or 'preHook'. This may indicate a version mismatch between the SDK and the CRE runtime`,
					)
			}
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e)
			result = create(ExecutionResultSchema, {
				result: { case: 'error', value: err },
			})
		}

		const awaitedResult = await result!
		hostBindings.sendResponse(toBinary(ExecutionResultSchema, awaitedResult))
	}

	async handleExecutionPhase<TConfig>(
		req: ExecuteRequest,
		workflow: Workflow<TConfig>,
		runtime: Runtime<TConfig>,
	): Promise<ExecutionResult> {
		if (req.request.case !== 'trigger') {
			throw new Error(
				`cannot handle non-trigger request as a trigger: received request type '${req.request.case}' in handleExecutionPhase. This is an internal SDK error`,
			)
		}

		const triggerMsg = req.request.value

		// We're about to cast bigint to number, so we need to check if it's safe
		const id = BigInt(triggerMsg.id)
		if (id > BigInt(Number.MAX_SAFE_INTEGER)) {
			throw new Error(
				`Trigger ID ${id} exceeds JavaScript safe integer range (Number.MAX_SAFE_INTEGER = ${Number.MAX_SAFE_INTEGER}). This trigger ID cannot be safely represented as a number`,
			)
		}

		const index = Number(triggerMsg.id)
		if (Number.isFinite(index) && index >= 0 && index < workflow.length) {
			const entry = workflow[index]
			const schema = entry.trigger.outputSchema()

			if (!triggerMsg.payload) {
				return create(ExecutionResultSchema, {
					result: {
						case: 'error',
						value: `trigger payload is missing for handler at index ${index} (trigger ID ${triggerMsg.id}). The trigger event must include a payload`,
					},
				})
			}

			const payloadAny = triggerMsg.payload

			/**
			 * Note: do not hardcode method name; routing by id is authoritative.
			 *
			 * This matches the GO SDK behavior, which also just checks for the id.
			 *
			 * @see https://github.com/smartcontractkit/cre-sdk-go/blob/5a41d81e3e072008484e85dc96d746401aafcba2/cre/wasm/runner.go#L81
			 * */
			const decoded = fromBinary(schema, payloadAny.value)
			const adapted = entry.trigger.adapt(decoded)

			try {
				const result = await entry.fn(runtime, adapted)
				const wrapped = Value.wrap(result)
				return create(ExecutionResultSchema, {
					result: { case: 'value', value: wrapped.proto() },
				})
			} catch (e) {
				const err = e instanceof Error ? e.message : String(e)
				return create(ExecutionResultSchema, {
					result: { case: 'error', value: err },
				})
			}
		}

		return create(ExecutionResultSchema, {
			result: {
				case: 'error',
				value: `trigger not found: no workflow handler registered at index ${index} (trigger ID ${triggerMsg.id}). The workflow has ${workflow.length} handler(s) registered. Verify the trigger subscription matches a registered handler`,
			},
		})
	}

	handlePreHookPhase(req: ExecuteRequest, workflow: Workflow<TConfig>): ExecutionResult {
		if (req.request.case !== 'preHook') {
			return create(ExecutionResultSchema, {
				result: {
					case: 'error',
					value: `preHook request expected but received '${req.request.case}' in handlePreHookPhase. This is an internal SDK error`,
				},
			})
		}

		const triggerMsg = req.request.value

		const id = BigInt(triggerMsg.id)
		if (id > BigInt(Number.MAX_SAFE_INTEGER)) {
			return create(ExecutionResultSchema, {
				result: {
					case: 'error',
					value: `Trigger ID ${id} exceeds JavaScript safe integer range (Number.MAX_SAFE_INTEGER = ${Number.MAX_SAFE_INTEGER}). This trigger ID cannot be safely represented as a number`,
				},
			})
		}

		const index = Number(triggerMsg.id)
		if (!Number.isFinite(index) || index < 0 || index >= workflow.length) {
			return create(ExecutionResultSchema, {
				result: {
					case: 'error',
					value: `trigger not found: no workflow handler registered at index ${index} (trigger ID ${triggerMsg.id}). The workflow has ${workflow.length} handler(s) registered. Verify the trigger subscription matches a registered handler`,
				},
			})
		}

		const entry = workflow[index]

		if (!entry.hooks?.preHook) {
			return create(ExecutionResultSchema, {
				result: {
					case: 'error',
					value: `no preHook registered for handler at index ${index} (trigger ID ${triggerMsg.id}). The handler was subscribed with preHook enabled but no preHook function was provided`,
				},
			})
		}

		if (!triggerMsg.payload) {
			return create(ExecutionResultSchema, {
				result: {
					case: 'error',
					value: `trigger payload is missing for preHook at index ${index} (trigger ID ${triggerMsg.id}). The trigger event must include a payload`,
				},
			})
		}

		const schema = entry.trigger.outputSchema()
		const decoded = fromBinary(schema, triggerMsg.payload.value)
		const adapted = entry.trigger.adapt(decoded)

		const restrictionsJson = entry.hooks.preHook(this.config, adapted)
		const restrictions = fromJson(RestrictionsSchema, restrictionsJson)

		return create(ExecutionResultSchema, {
			result: { case: 'restrictions', value: restrictions },
		})
	}

	handleSubscribePhase(req: ExecuteRequest, workflow: Workflow<TConfig>): ExecutionResult {
		if (req.request.case !== 'subscribe') {
			return create(ExecutionResultSchema, {
				result: {
					case: 'error',
					value: `subscribe request expected but received '${req.request.case}' in handleSubscribePhase. This is an internal SDK error`,
				},
			})
		}

		// Build TriggerSubscriptionRequest from the workflow entries
		const subscriptions = workflow.map((entry) => ({
			id: entry.trigger.capabilityId(),
			method: entry.trigger.method(),
			payload: entry.trigger.configAsAny(),
			preHook: !!entry.hooks?.preHook,
		}))

		const subscriptionRequest = create(TriggerSubscriptionRequestSchema, {
			subscriptions,
		})

		return create(ExecutionResultSchema, {
			result: { case: 'triggerSubscriptions', value: subscriptionRequest },
		})
	}
}
