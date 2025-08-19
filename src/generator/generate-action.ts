import type { DescMethod } from "@bufbuild/protobuf";

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
  hasChainSelector: boolean = false
): string {
  const capabilityIdLogic = hasChainSelector
    ? `
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? \`\${${capabilityClassName}.CAPABILITY_ID}@chainSelector:\${this.chainSelector}\`
      : ${capabilityClassName}.CAPABILITY_ID;`
    : `
    const capabilityId = ${capabilityClassName}.CAPABILITY_ID;`;

  return `
  async ${methodName}(input: ${method.input.name}Json): Promise<${method.output.name}> {
    const payload = {
      typeUrl: getTypeUrl(${method.input.name}Schema),
      value: toBinary(${method.input.name}Schema, fromJson(${method.input.name}Schema, input)),
    };${capabilityIdLogic}
    
    return callCapability({
      capabilityId,
      method: "${method.name}",
      mode: this.mode,
      payload,
    }).then((capabilityResponse: CapabilityResponse) => {
      if (capabilityResponse.response.case === "error") {
        throw new CapabilityError(capabilityResponse.response.value, {
          capabilityId,
          method: "${method.name}",
          mode: this.mode,
        });
      }

      if (capabilityResponse.response.case !== "payload") {
        throw new CapabilityError("No payload in response", {
          capabilityId,
          method: "${method.name}",
          mode: this.mode,
        });
      }

      return fromBinary(${method.output.name}Schema, capabilityResponse.response.value.value);
    });
  }`;
}
