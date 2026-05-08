import type { DescMethod } from '@bufbuild/protobuf'
import { generateCapabilityIdLogic, type ProcessedLabel } from './label-utils'

/**
 * Generates a restrictor method that returns a CapabilityRestrictionJson
 * for rate-limiting a specific capability method.
 *
 * @param method - The method descriptor
 * @param methodName - The camelCase method name
 * @param capabilityClassName - The class name of the capability (used for ID constants)
 * @param labels - Array of processed labels for this capability
 * @returns The generated restrictor method code
 */
export function generateRestrictorMethod(
	method: DescMethod,
	methodName: string,
	capabilityClassName: string,
	labels: ProcessedLabel[],
): string {
	const capabilityIdLogic = generateCapabilityIdLogic(labels, capabilityClassName)
	const limitMethodName = `limit${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`

	return `
  ${limitMethodName}(maxCalls: number): CapabilityRestrictionJson {
    ${capabilityIdLogic}
    
    return {
      method: {
        id: capabilityId,
        method: "${method.name}",
        maxCalls,
      },
    }
  }`
}
