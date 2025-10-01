import type { DescMethod } from '@bufbuild/protobuf'
import { wrapType } from './utils'

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

	// Check if we have wrapped types
	const wrappedInputType = wrapType(method.input)
	const wrappedOutputType = wrapType(method.output)

	// Build input type union - if we have wrapped types, use only those, otherwise use original
	const hasWrappedInput = wrappedInputType !== method.input
	const inputTypes = hasWrappedInput
		? [wrappedInputType.name, `${wrappedInputType.name}Json`]
		: [method.input.name, `${method.input.name}Json`]

	// Build output type
	const hasWrappedOutput = wrappedOutputType !== method.output
	// Special case: if output is ReportResponse, wrap it with Report
	const isReportResponse = method.output.name === 'ReportResponse'
	const outputType = hasWrappedOutput
		? wrappedOutputType.name
		: isReportResponse
			? 'Report'
			: method.output.name

	const callSig = `(runtime: ${modePrefix}Runtime<unknown>, input: ${inputTypes.join(' | ')}): {result: () => ${outputType}}`
	const callSigAndBody = `${callSig} {
    // Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
    let payload: ${method.input.name}
    ${
			hasWrappedInput
				? `
    // Check if it's a wrapped type by looking for the $report property
    if ((input as unknown as { $report?: string }).$report) {
      // It's a wrapped type, unwrap it
      payload = x_generatedCodeOnly_unwrap_${wrappedInputType.name}(input as ${wrappedInputType.name})
    } else {
      // It's wrapped JSON, convert using create function
      payload = x_generatedCodeOnly_unwrap_${wrappedInputType.name}(create${wrappedInputType.name}(input as ${wrappedInputType.name}Json))
    }`
				: `
    if ((input as unknown as { $typeName?: string }).$typeName) {
      // It's the original protobuf type
      payload = input as ${method.input.name}
    } else {
      // It's regular JSON, convert using fromJson
      payload = fromJson(${method.input.name}Schema, input as ${method.input.name}Json)
    }`
		}
    
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
        const result = capabilityResponse.result()
        ${
					hasWrappedOutput
						? `
        // Wrap the output if we have a wrapped type
        return x_generatedCodeOnly_wrap_${wrappedOutputType.name}(result)`
						: isReportResponse
							? `
        return new Report(result)`
							: `
        return result`
				}
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
    const [runtime, input] = args as [${modePrefix}Runtime<unknown>, ${inputTypes.join(' | ')}]
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
