import type { DescMethod } from '@bufbuild/protobuf'
export function generateActionSugarClass(
	method: DescMethod,
	methodName: string,
	capabilityClassName: string,
	modePrefix: string,
): string {
	const sugarClassName = `${methodName.charAt(0).toUpperCase() + methodName.slice(1)}er`
	if (modePrefix !== 'Node') return ''
	return `
export class ${sugarClassName} {
	constructor(private readonly runtime: NodeRuntime<unknown>, private readonly client: ${capabilityClassName}) {}
	${methodName}(input: ${method.input.name} |  ${method.input.name}Json): {result: () =>${method.output.name}} {
		return this.client.${methodName}(this.runtime, input)
	}
}`
}
