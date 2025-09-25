import type { DescMethod } from '@bufbuild/protobuf'

/**
 * Generates the action method implementation for a capability
 *
 * @param method - The method descriptor
 * @param methodName - The camelCase method name
 * @param capabilityClassName - The class name of the capability object
 * @param hasChainSelector - Whether this capability supports chainSelector routing
 * @returns The generated action method code
 */
export function generateActionMethod(
	method: DescMethod,
	methodName: string,
	capabilityClassName: string,
  hasChainSelector: boolean = false,
  modePrefix: string,
): string {
	const capabilityIdLogic = hasChainSelector
		? `
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? \`\${${capabilityClassName}.CAPABILITY_NAME}:ChainSelector:\${this.chainSelector}@\${${capabilityClassName}.CAPABILITY_VERSION}\`
      : ${capabilityClassName}.CAPABILITY_ID;`
		: `
    const capabilityId = ${capabilityClassName}.CAPABILITY_ID;`

	return `
  ${methodName}(runtime: ${modePrefix}Runtime<any>, input: ${method.input.name} |  ${method.input.name}Json): {result: () => Promise<${method.output.name}>} {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as ${method.input.name} : fromJson(${method.input.name}Schema, input as ${method.input.name}Json)
    
    ${capabilityIdLogic}
    
    const capabilityResponse = runtime.callCapability<${method.input.name}, ${method.output.name}>({
      capabilityId,
      method: "${method.name}",
      payload,
      inputSchema: ${method.input.name}Schema,
      outputSchema: ${method.output.name}Schema
    })

    return {
      result: async () => {
        return capabilityResponse.result()
      }
    }
  }`  
}
