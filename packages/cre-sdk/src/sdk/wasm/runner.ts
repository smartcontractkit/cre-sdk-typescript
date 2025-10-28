import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import {
	type ExecuteRequest,
	ExecuteRequestSchema,
	type ExecutionResult,
	ExecutionResultSchema,
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
		const args = JSON.parse(argsString)

		// SDK expects exactly 2 args:
		// 1st is the script name
		// 2nd is the base64 encoded request
		if (args.length !== 2) {
			throw new Error('Invalid request: must contain payload')
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

		var result: Promise<ExecutionResult> | ExecutionResult
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
				default:
					throw new Error('Unknown request type')
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
			throw new Error('cannot handle non-trigger request as a trigger')
		}

		const triggerMsg = req.request.value

		// We're about to cast bigint to number, so we need to check if it's safe
		const id = BigInt(triggerMsg.id)
		if (id > BigInt(Number.MAX_SAFE_INTEGER)) {
			throw new Error(`Trigger ID ${id} exceeds safe integer range`)
		}

		const index = Number(triggerMsg.id)
		if (Number.isFinite(index) && index >= 0 && index < workflow.length) {
			const entry = workflow[index]
			const schema = entry.trigger.outputSchema()
			const payloadAny = triggerMsg.payload!

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
			result: { case: 'error', value: 'trigger not found' },
		})
	}

	handleSubscribePhase(req: ExecuteRequest, workflow: Workflow<TConfig>): ExecutionResult {
		if (req.request.case !== 'subscribe') {
			return create(ExecutionResultSchema, {
				result: { case: 'error', value: 'subscribe request expected' },
			})
		}

		// Build TriggerSubscriptionRequest from the workflow entries
		const subscriptions = workflow.map((entry) => ({
			id: entry.trigger.capabilityId(),
			method: entry.trigger.method(),
			payload: entry.trigger.configAsAny(),
		}))

		const subscriptionRequest = create(TriggerSubscriptionRequestSchema, {
			subscriptions,
		})

		return create(ExecutionResultSchema, {
			result: { case: 'triggerSubscriptions', value: subscriptionRequest },
		})
	}
}
