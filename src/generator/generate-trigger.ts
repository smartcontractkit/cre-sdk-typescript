import type { DescMethod } from "@bufbuild/protobuf";

/**
 * Generates the trigger method implementation for a capability
 *
 * @param method - The method descriptor
 * @param methodName - The camelCase method name
 * @param capabilityId - The capability ID
 * @param className - The capability class name
 * @returns The generated trigger method code
 */
export function generateTriggerMethod(
  method: DescMethod,
  methodName: string,
  capabilityClassName: string,
  className: string
): string {
  const triggerClassName = `${className}${method.name}`;

  return `
  ${methodName}(config: ${method.input.name}Json): ${triggerClassName} {
    return new ${triggerClassName}(this.mode, config, ${capabilityClassName}.CAPABILITY_ID, "${method.name}");
  }`;
}

/**
 * Generates the trigger class implementation
 *
 * @param method - The method descriptor
 * @param capabilityId - The capability ID
 * @param className - The capability class name
 * @returns The generated trigger class code
 */
export function generateTriggerClass(
  method: DescMethod,
  className: string
): string {
  const triggerClassName = `${className}${method.name}`;

  return `
/**
 * Trigger implementation for ${method.name}
 */
class ${triggerClassName} extends BaseTriggerImpl<${method.input.name}Json, ${method.output.name}> {
  constructor(
    mode: Mode,
    config: ${method.input.name}Json,
    private readonly _capabilityId: string,
    private readonly _method: string
  ) {
    super(mode, config);
  }

  capabilityId(): string {
    return this._capabilityId;
  }

  method(): string {
    return this._method;
  }

  newOutput(): ${method.output.name} {
    return create(${method.output.name}Schema);
  }

  outputSchema() {
    return ${method.output.name}Schema;
  }

  configAsAny(): Any {
    const configMessage = fromJson(${method.input.name}Schema, this.config);
    return create(AnySchema, {
      typeUrl: getTypeUrl(${method.input.name}Schema),
      value: toBinary(${method.input.name}Schema, configMessage),
    });
  }

  /**
   * Transform the trigger output - override this method if needed
   * Default implementation returns the output unchanged
   */
  adapt(output: ${method.output.name}): ${method.output.name} {
    return output;
  }
}`;
}
