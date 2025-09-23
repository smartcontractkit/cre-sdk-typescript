import { create } from '@bufbuild/protobuf'
import { Mode, SimpleConsensusInputsSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { type NodeRuntime, runtime } from '@cre/sdk/runtime/runtime'
import type { ConsensusAggregation, CreSerializable, PrimitiveTypes, UnwrapOptions } from '../utils'
import { Value } from '../utils'

/**
 * Runs the provided builder inside Node mode and returns the consensus result Value.
 * Ensures mode is switched back to DON even if errors occur.
 */
/**
 * Runs the provided builder inside Node mode and returns the consensus result Value.
 * For primitive types (number, bigint, Date, boolean, string), it will use unwrap()
 * For complex types, it will use unwrapToType() with the provided options
 */
export function runInNodeMode<TArgs extends any[], TOutput>(
	fn: (nodeRuntime: NodeRuntime, ...args: TArgs) => Promise<TOutput> | TOutput,
	consesusAggretation: ConsensusAggregation<TOutput, true>,
	unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
): (...args: TArgs) => Promise<TOutput> {
	return async (...args: TArgs) => {
		const nodeRuntime: NodeRuntime = runtime.switchModes(Mode.NODE)

		const consensusInput = create(SimpleConsensusInputsSchema, {
			descriptors: consesusAggretation.descriptor,
		})
		if (consesusAggretation.defaultValue) {
			// This cast is safe, since ConsensusAggregation can only have true its second argument if T extends CreSerializable<TOutput>
			consensusInput.default = Value.from(
				consesusAggretation.defaultValue as CreSerializable<TOutput>,
			).proto()
		}

		try {
			const observation = await fn(nodeRuntime, ...args)
			// This cast is safe, since ConsensusAggregation can only have true its second argument if T extends CreSerializable<TOutput>
			consensusInput.observation = {
				case: 'value',
				value: Value.from(observation as CreSerializable<TOutput>).proto(),
			}
		} catch (e: any) {
			consensusInput.observation = { case: 'error', value: e.message || String(e) }
		} finally {
			// Always restore DON mode before invoking consensus
			runtime.switchModes(Mode.DON)
		}

		const consensus = new ConsensusCapability()
		const result = await consensus.simple(consensusInput).result()
		const wrappedValue = Value.wrap(result)

		return unwrapOptions
			? wrappedValue.unwrapToType(unwrapOptions)
			: (wrappedValue.unwrap() as TOutput)
	}
}
