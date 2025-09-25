import type { DescMethod } from '@bufbuild/protobuf'

/**
 * Generates the trigger method implementation for a capability
 *
 * @param method - The method descriptor
 * @param methodName - The camelCase method name
 * @param capabilityId - The capability ID
 * @param className - The capability class name
 * @param hasChainSelector - Whether this capability supports chainSelector routing
 * @returns The generated trigger method code
 */
export function generateTriggerMethod(
	method: DescMethod,
	methodName: string,
	capabilityClassName: string,
	className: string,
  hasChainSelector: boolean,
): string {
	const triggerClassName = `${className}${method.name}`
  const capabilityIdLogic = hasChainSelector
		? `
    // Include chainSelector in capability ID for routing when specified
    const capabilityId = this.chainSelector
      ? \`\${${capabilityClassName}.CAPABILITY_NAME}:ChainSelector:\${this.chainSelector}@\${${capabilityClassName}.CAPABILITY_VERSION}\`
      : ${capabilityClassName}.CAPABILITY_ID;`
		: `
    const capabilityId = ${capabilityClassName}.CAPABILITY_ID;`
  

	return `
  ${methodName}(config: ${method.input.name}Json): ${triggerClassName} {
    ${capabilityIdLogic}
    return new ${triggerClassName}(config, capabilityId, "${method.name}");
  }`
}

/**
 * Generates the trigger class implementation
 *
 * @param method - The method descriptor
 * @param capabilityId - The capability ID
 * @param className - The capability class name
 * @returns The generated trigger class code
 */
export function generateTriggerClass(method: DescMethod, className: string): string {
	const triggerClassName = `${className}${method.name}`

	return `
/**
 * Trigger implementation for ${method.name}
 */
class ${triggerClassName} implements Trigger<${method.output.name}, ${method.output.name}> {
  public readonly config: ${method.input.name}
  constructor(
    config: ${method.input.name} | ${method.input.name}Json,
    private readonly _capabilityId: string,
    private readonly _method: string
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    this.config = (config as any).$typeName ? config as ${method.input.name} : fromJson(${method.input.name}Schema, config as ${method.input.name}Json)
  }

  capabilityId(): string {
    return this._capabilityId;
  }

  method(): string {
    return this._method;
  }

  outputSchema() {
    return ${method.output.name}Schema;
  }

  configAsAny(): Any {
    return anyPack(${method.input.name}Schema, this.config);
  }

  /**
   * Transform the raw trigger output - override this method if needed
   * Default implementation returns the raw output unchanged
   */
  adapt(rawOutput: ${method.output.name}): ${method.output.name} {
    return rawOutput;
  }
}`
}
