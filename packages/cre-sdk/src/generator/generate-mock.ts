import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { type DescService, getExtension } from '@bufbuild/protobuf'
import type { GenFile } from '@bufbuild/protobuf/codegenv2'
import type { CapabilityMetadata } from '@cre/generated/tools/generator/v1alpha/cre_metadata_pb'
import {
	capability,
	method as methodOption,
} from '@cre/generated/tools/generator/v1alpha/cre_metadata_pb'
import { processLabels } from './label-utils'
import { getImportPathForFile, lowerCaseFirstLetter } from './utils'

const MOCK_OUTSIDE_TEST_ERROR =
	"Capability mocks must be used within the CRE test framework's test() method."

export type GeneratedMockExport = { className: string; relativePath: string }

function getCapabilityServiceOptions(service: DescService): CapabilityMetadata | false {
	if (!service.proto.options) {
		return false
	}
	const capabilityOption = getExtension(service.proto.options, capability)
	return capabilityOption ?? false
}

const NO_IMPL_MESSAGE = (methodName: string, propName: string) =>
	`${methodName}: no implementation provided; set the mock's ${propName} property to define the return value.`

/**
 * Generates a capability mock for the test package. One mock class per capability service;
 * mocks self-register with the test runtime. Set per-method handler properties to define return values.
 *
 * @param file - The proto file containing capability service(s).
 * @param outputDir - Directory under the test package (e.g. src/sdk/test/generated).
 * @returns List of { className, relativePath } for each mock written (path relative to outputDir, no extension).
 */
export function generateMocks(file: GenFile, outputDir: string): GeneratedMockExport[] {
	const capabilityServices = file.services.filter(getCapabilityServiceOptions)
	if (capabilityServices.length === 0) {
		return []
	}

	const dirDepth = dirname(file.name).split('/').length + 2
	const registerImportPath = '../'.repeat(dirDepth) + 'testutils/test-runtime'
	const exports: GeneratedMockExport[] = []

	capabilityServices.forEach((service) => {
		const capOption = getCapabilityServiceOptions(service)
		if (!capOption) return

		const serviceMethods = service.methods.filter((method) => {
			const methodMeta = method.proto.options
				? getExtension(method.proto.options, methodOption)
				: null
			return !methodMeta?.mapToUntypedApi
		})

		const actionMethods = serviceMethods.filter((m) => m.methodKind !== 'server_streaming')
		if (actionMethods.length === 0) {
			return
		}

		const typeImports = new Map<string, Set<string>>()
		function addType(fileDesc: { name: string }, typeName: string) {
			const path =
				fileDesc.name === file.name
					? `@cre/generated/${file.name}_pb`
					: getImportPathForFile(fileDesc.name)
			if (!typeImports.has(path)) {
				typeImports.set(path, new Set())
			}
			typeImports.get(path)!.add(typeName)
			typeImports.get(path)!.add(`${typeName}Schema`)
		}
		for (const method of actionMethods) {
			addType(method.input.file, method.input.name)
			addType(method.output.file, method.output.name)
			typeImports
				.get(
					method.output.file.name === file.name
						? `@cre/generated/${file.name}_pb`
						: getImportPathForFile(method.output.file.name),
				)!
				.add(`${method.output.name}Json`)
		}

		const imports: string[] = [
			'import { fromJson } from "@bufbuild/protobuf"',
			'import { anyPack, anyUnpack } from "@bufbuild/protobuf/wkt"',
			`import { registerTestCapability, __getTestMockInstance, __setTestMockInstance } from "${registerImportPath}"`,
		]
		typeImports.forEach((types, path) => {
			const sorted = Array.from(types).sort()
			const parts = sorted.map((s) => (s.endsWith('Schema') ? s : `type ${s}`))
			imports.push(`import { ${parts.join(', ')} } from "${path}"`)
		})

		const handlerCases = actionMethods
			.map((method) => {
				const propName = lowerCaseFirstLetter(method.name)
				const inputType = method.input.name
				const outputType = method.output.name
				const errMsg = NO_IMPL_MESSAGE(method.name, propName)
				const outputJsonType = `${outputType}Json`
				return `      case "${method.name}": {
        const input = anyUnpack(req.payload, ${inputType}Schema) as ${inputType};
        const handler = self.${propName};
        if (typeof handler !== "function") throw new Error("${errMsg.replace(/"/g, '\\"')}");
        const raw = handler(input);
        const output = raw && typeof (raw as unknown as { $typeName?: string }).$typeName === "string" ? (raw as ${outputType}) : fromJson(${outputType}Schema, raw as ${outputJsonType});
        return { response: { case: "payload", value: anyPack(${outputType}Schema, output) } };
      }`
			})
			.join('\n')

		const propertyDecls = actionMethods
			.map(
				(method) =>
					`  /** Set to define the return value for ${method.name}. May return a plain object (${method.output.name}Json) or the message type. */\n  ${lowerCaseFirstLetter(method.name)}?: (input: ${method.input.name}) => ${method.output.name} | ${method.output.name}Json;`,
			)
			.join('\n\n')

		const capabilityClassName = `${service.name}Capability`
		const mockClassName = `${capabilityClassName}Mock`
		const serviceNameLower = service.name.toLowerCase() as Lowercase<string>

		const labels = processLabels(capOption)
		const hasLabels = labels.length > 0

		// Extract name and version from capability ID (e.g., "evm@1.0.0" -> name="evm", version="1.0.0")
		const capIdParts = capOption.capabilityId.split('@')
		const capabilityName = capIdParts[0]
		const capabilityVersion = capIdParts[1] || ''

		// Generate testInstance parameters and capability ID computation
		let testInstanceParams = ''
		let qualifiedCapabilityIdComputation = ''
		let constructorParams = ''
		let constructorParamPass = ''
		if (hasLabels) {
			const paramList = labels.map((l) => `${lowerCaseFirstLetter(l.name)}: ${l.tsType}`).join(', ')
			testInstanceParams = paramList
			constructorParams = paramList
			constructorParamPass = labels.map((l) => lowerCaseFirstLetter(l.name)).join(', ')
			const labelParts = labels
				.map((l) => `:${l.name}:\${${lowerCaseFirstLetter(l.name)}}`)
				.join('')
			// Match SDK format: ${name}:Label:${value}@${version}
			qualifiedCapabilityIdComputation = `\`${capabilityName}${labelParts}@${capabilityVersion}\``
		} else {
			qualifiedCapabilityIdComputation = `${mockClassName}.CAPABILITY_ID`
		}

		const output = `${imports.join('\n')}

/**
 * Mock for ${capabilityClassName}. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class ${mockClassName} {
  static readonly CAPABILITY_ID = "${capOption.capabilityId}";

${propertyDecls}

  private constructor(${constructorParams}) {
    const self = this;
    const qualifiedId = ${qualifiedCapabilityIdComputation};
    try {
      registerTestCapability(qualifiedId, (req) => {
        switch (req.method) {
${handlerCases}
    default:
      return { response: { case: "error", value: \`unknown method \${req.method}\` } };
        }
      });
    } catch {
      throw new Error("${MOCK_OUTSIDE_TEST_ERROR}")
    }
  }

  /**
   * Returns the mock instance for this capability${hasLabels ? ' and the specified tags' : ''}.
   * Multiple calls with the same ${hasLabels ? 'tag values' : 'arguments'} return the same instance.
   * Must be called within the test framework's test() method.
   */
  static testInstance(${testInstanceParams}): ${mockClassName} {
    const qualifiedId = ${qualifiedCapabilityIdComputation};
    let instance = __getTestMockInstance<${mockClassName}>(qualifiedId);
    if (!instance) {
      instance = new ${mockClassName}(${constructorParamPass});
      __setTestMockInstance(qualifiedId, instance);
    }
    return instance;
  }
}
`

		const relDir = dirname(file.name)
		const fileName = `${serviceNameLower}_mock_gen.ts`
		const outPath = join(outputDir, relDir, fileName)
		mkdirSync(dirname(outPath), { recursive: true })
		writeFileSync(outPath, output)
		exports.push({
			className: mockClassName,
			relativePath: `${relDir}/${fileName.replace(/\.ts$/, '')}`,
		})
		console.log(`✅ Generated mock for ${service.name} at: ${outPath}`)
	})

	return exports
}

function pathToUniqueExportName(relativePath: string): string {
	const withoutExt = relativePath.replace(/\.ts$/, '').replace(/_mock_gen$/, '')
	const parts = withoutExt.split('/')
	const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('')
	return `${pascal}Mock`
}

/**
 * Writes a barrel file that re-exports all generated mocks. Use so the test package can export * from './generated'.
 * Duplicate class names (e.g. multiple ClientCapabilityMock) are exported with path-based unique aliases.
 */
export function writeTestGeneratedBarrel(exports: GeneratedMockExport[], outputDir: string): void {
	const seen = new Set<string>()
	const lines = exports.map((e) => {
		let exportName = e.className
		if (seen.has(exportName)) {
			exportName = pathToUniqueExportName(e.relativePath)
		}
		seen.add(e.className)
		return exportName === e.className
			? `export { ${e.className} } from "./${e.relativePath}"`
			: `export { ${e.className} as ${exportName} } from "./${e.relativePath}"`
	})
	const output = `/** Auto-generated barrel of capability mocks. Do not edit. */\n\n${lines.join('\n')}\n`
	writeFileSync(join(outputDir, 'index.ts'), output)
	console.log(`✅ Wrote test generated barrel (${exports.length} mocks)`)
}
