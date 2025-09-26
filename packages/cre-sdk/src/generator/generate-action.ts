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

	const callSig = `(runtime: ${modePrefix}Runtime<unknown>, input: ${method.input.name} |  ${method.input.name}Json): {result: () => ${method.output.name}}`
	const callSigAndBody = `${callSig} {
    const payload = (input as unknown as { $typeName?: string }).$typeName ? input as ${method.input.name} : fromJson(${method.input.name}Schema, input as ${method.input.name}Json)
    
    ${capabilityIdLogic}
    
    const capabilityResponse = runtime.callCapability<${method.input.name}, ${method.output.name}>({
      capabilityId,
      method: "${method.name}",
      payload,
      inputSchema: ${method.input.name}Schema,
      outputSchema: ${method.output.name}Schema
    })

    return {
      result: () => {
        return capabilityResponse.result()
      }
    }
  }`

	if (modePrefix === 'Node') {
		const sugarClassName = `${methodName.charAt(0).toUpperCase() + methodName.slice(1)}er`
		const sugarSig = `<TArgs extends unknown[], TOutput>(
    runtime: Runtime<unknown>,
    fn: (${methodName}er: ${sugarClassName}, ...args: TArgs) => TOutput,
    consensusAggregation: ConsensusAggregation<TOutput, true>,
    unwrapOptions?: TOutput extends PrimitiveTypes
      ? never
      : UnwrapOptions<TOutput>,
  ): (...args: TArgs) => { result: () => TOutput }`
		return `
  ${methodName}${callSig}
  ${methodName}${sugarSig}
  ${methodName}(...args: unknown[]): unknown {
    // Check if this is the sugar syntax overload (has function parameter)
    if (typeof args[1] === 'function') {
      const [runtime, fn, consensusAggregation, unwrapOptions] = args as [Runtime<unknown>, (${methodName}er: ${sugarClassName}, ...args: unknown[]) => unknown, ConsensusAggregation<unknown, true>, UnwrapOptions<unknown> | undefined]
      return this.${methodName}SugarHelper(runtime, fn, consensusAggregation, unwrapOptions)
    }
    // Otherwise, this is the basic call overload
    const [runtime, input] = args as [${modePrefix}Runtime<unknown>, ${method.input.name} |  ${method.input.name}Json]
    return this.${methodName}CallHelper(runtime, input)
  }
  private ${methodName}CallHelper${callSigAndBody}
  private ${methodName}SugarHelper${sugarSig} {
    const wrappedFn = (runtime: NodeRuntime<unknown>, ...args: TArgs) => {
      const ${methodName}er = new ${sugarClassName}(runtime, this)
      return fn(${methodName}er, ...args)
    }
      return runtime.runInNodeMode(wrappedFn, consensusAggregation, unwrapOptions)
    }`
	}
	return `
  ${methodName}${callSigAndBody}`
}
