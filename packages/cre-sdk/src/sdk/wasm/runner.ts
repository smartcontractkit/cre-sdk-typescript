import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import {
	type ExecuteRequest,
	ExecuteRequestSchema,
	type ExecutionResult,
	ExecutionResultSchema,
	type SecretRequest,
	type SecretRequestJson,
	TriggerSubscriptionRequestSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type ConfigHandlerParams, configHandler } from '@cre/sdk/utils/config'
import type { SecretsProvider, Workflow } from '@cre/sdk/workflow'
import { Value } from '../utils'
import { hostBindings } from './host-bindings'
import { Runtime, TeeRuntime } from './runtime'

class RunnerBase<TConfig> {
	protected constructor(
		private readonly config: TConfig,
		private readonly request: ExecuteRequest,
	) {}

	protected static async newRunnerHelper<TConfig, TIntermediateConfig, TRunner>(
		newRunner: (config: TConfig, request: ExecuteRequest) => TRunner,
		configHandlerParams?: ConfigHandlerParams<TConfig, TIntermediateConfig>,
	): Promise<TRunner> {
		hostBindings.versionV2()
		const request = RunnerBase.getRequest()
		const config = await configHandler<TConfig, TIntermediateConfig>(request, configHandlerParams)
		return newRunner(config, request)
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

		// wrap runtime's getSecret so other methods cannot be used
		const sp = {
			getSecret: (request: SecretRequest | SecretRequestJson) => {
				return runtime.getSecret(request)
			},
		}

		let result: Promise<ExecutionResult> | ExecutionResult
		try {
			const workflow = await initFn(this.config, sp)

			switch (this.request.request.case) {
				case 'subscribe':
					result = this.handleSubscribePhase(this.request, workflow)
					break
				case 'trigger':
					result = this.handleExecutionPhase(this.request, workflow, runtime)
					break
				default:
					throw new Error(
						`Unknown request type '${this.request.request.case}': expected 'subscribe' or 'trigger'. This may indicate a version mismatch between the SDK and the CRE runtime`,
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

	async handleExecutionPhase(
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

			// If the handler has requirements (e.g. TEE), use TeeRuntime; otherwise use the default runtime.
			const handlerRuntime =
				entry.requirements != null ? new TeeRuntime(this.config, 0, req.maxResponseSize) : runtime

			try {
				const result = await entry.fn(handlerRuntime as any, adapted)
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

	handleSubscribePhase(req: ExecuteRequest, workflow: Workflow<TConfig>): ExecutionResult {
		if (req.request.case !== 'subscribe') {
			return create(ExecutionResultSchema, {
				result: {
					case: 'error',
					value: `subscribe request expected but received '${req.request.case}' in handleSubscribePhase. This is an internal SDK error`,
				},
			})
		}

		// Build TriggerSubscriptionRequest from the workflow entries, including any per-handler requirements.
		const subscriptions = workflow.map((entry) => ({
			id: entry.trigger.capabilityId(),
			method: entry.trigger.method(),
			payload: entry.trigger.configAsAny(),
			requirements: entry.requirements,
		}))

		const subscriptionRequest = create(TriggerSubscriptionRequestSchema, {
			subscriptions,
		})

		return create(ExecutionResultSchema, {
			result: { case: 'triggerSubscriptions', value: subscriptionRequest },
		})
	}
}

export class Runner<TConfig> extends RunnerBase<TConfig> {
	private constructor(config: TConfig, request: ExecuteRequest) {
		super(config, request)
	}

	static async newRunner<TConfig, TIntermediateConfig = TConfig>(
		configHandlerParams?: ConfigHandlerParams<TConfig, TIntermediateConfig>,
	): Promise<Runner<TConfig>> {
		return RunnerBase.newRunnerHelper(
			(config, request) => new Runner(config, request),
			configHandlerParams,
		)
	}
}
