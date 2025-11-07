import type { DescMethod } from '@bufbuild/protobuf'
import { generateCapabilityIdLogic, type ProcessedLabel } from './label-utils'

/**
 * Generates the trigger method implementation for a capability
 *
 * @param method - The method descriptor
 * @param methodName - The camelCase method name
 * @param capabilityId - The capability ID
 * @param className - The capability class name
 * @param labels - Array of processed labels for this capability
 * @returns The generated trigger method code
 */
export function generateTriggerMethod(
	method: DescMethod,
	methodName: string,
	capabilityClassName: string,
	className: string,
	labels: ProcessedLabel[],
): string {
	const triggerClassName = `${className}${method.name}`
	const capabilityIdLogic = generateCapabilityIdLogic(labels, capabilityClassName)

	// Generate label arguments to pass to trigger constructor
	const labelArgs =
		labels.length > 0 ? ', ' + labels.map((label) => `this.${label.name}`).join(', ') : ''

	return `
  ${methodName}(config: ${method.input.name}Json): ${triggerClassName} {
    ${capabilityIdLogic}
    return new ${triggerClassName}(config, capabilityId, "${method.name}"${labelArgs});
  }`
}

/**
 * Generates the trigger class implementation
 *
 * @param method - The method descriptor
 * @param className - The capability class name
 * @param labels - Array of processed labels for this capability
 * @returns The generated trigger class code
 */
export function generateTriggerClass(
	method: DescMethod,
	className: string,
	labels: ProcessedLabel[],
): string {
	const triggerClassName = `${className}${method.name}`

	// Generate label parameters for constructor only (no duplicate fields needed)
	const labelParams =
		labels.length > 0
			? labels.map((label) => `private readonly ${label.name}: ${label.tsType}`).join(',\n    ')
			: ''

	return `
/**
 * Trigger implementation for ${method.name}
 */
class ${triggerClassName} implements Trigger<${method.output.name}, ${method.output.name}> {
  public readonly config: ${method.input.name}
  constructor(
    config: ${method.input.name} | ${method.input.name}Json,
    private readonly _capabilityId: string,
    private readonly _method: string,
${labelParams ? '    ' + labelParams + ',' : ''}
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
