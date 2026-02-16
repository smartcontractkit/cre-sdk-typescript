import type { DescMethod } from '@bufbuild/protobuf'
import { wrapType } from './utils'
export function generateActionSugarClass(
	method: DescMethod,
	methodName: string,
	capabilityClassName: string,
	modePrefix: string,
): string {
	const sugarClassName = `${methodName.charAt(0).toUpperCase() + methodName.slice(1)}er`
	if (modePrefix !== 'Node') return ''

	// Determine the output type - match the action method's logic
	const wrappedOutputType = wrapType(method.output)
	const hasWrappedOutput = wrappedOutputType !== method.output
	const isReportResponse = method.output.name === 'ReportResponse'
	const outputType = hasWrappedOutput
		? wrappedOutputType.name
		: isReportResponse
			? 'Report'
			: method.output.name

	return `
export class ${sugarClassName} {
	constructor(private readonly runtime: NodeRuntime<unknown>, private readonly client: ${capabilityClassName}) {}
	${methodName}(input: ${method.input.name} |  ${method.input.name}Json): {result: () => ${outputType}} {
		return this.client.${methodName}(this.runtime, input)
	}
}`
}
