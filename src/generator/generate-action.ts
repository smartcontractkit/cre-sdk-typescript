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
  ${methodName}(input: ${method.input.name} |  ${method.input.name}Json): {result: () => Promise<${method.output.name}>} {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const value = (input as any).$typeName ? input as ${method.input.name} : fromJson(${method.input.name}Schema, input as ${method.input.name}Json)
    const payload = {
      typeUrl: getTypeUrl(${method.input.name}Schema),
      value: toBinary(${method.input.name}Schema, value),
    };${capabilityIdLogic}

    const capabilityResponse = callCapability({
      capabilityId,
      method: "${method.name}",
      mode: this.mode,
      payload
    });

    return {
      result: async () => {
        const {response} = await capabilityResponse.result();

        if (response.case === 'error') {
          throw new CapabilityError(response.value, {
            capabilityId,
            method: "${method.name}",
            mode: this.mode,
          })
        }

        if (response.case !== 'payload') {
          throw new CapabilityError('No payload in response', {
            capabilityId,
            method: "${method.name}",
            mode: this.mode,
          })
        }

        return fromBinary(${method.output.name}Schema, response.value.value)
      }
    }
  }`
}
