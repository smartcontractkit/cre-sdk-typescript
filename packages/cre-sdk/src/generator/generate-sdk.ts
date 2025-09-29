import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { type DescService, getExtension } from '@bufbuild/protobuf'
import type { GenFile } from '@bufbuild/protobuf/codegenv2'
import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { CapabilityMetadata } from '@cre/generated/tools/generator/v1alpha/cre_metadata_pb'
import {
	capability,
	method as methodOption,
} from '@cre/generated/tools/generator/v1alpha/cre_metadata_pb'
import { generateActionMethod } from './generate-action'
import { generateActionSugarClass } from './generate-sugar'
import { generateTriggerClass, generateTriggerMethod } from './generate-trigger'
import { getImportPathForFile, lowerCaseFirstLetter } from './utils'

const getCapabilityServiceOptions = (service: DescService): CapabilityMetadata | false => {
	if (!service.proto.options) {
		return false
	}

	const capabilityOption = getExtension(service.proto.options, capability)
	return capabilityOption || false
}

/**
 * Generates SDK for a given file (should include capability service).
 *
 * @param file - The file to generate the SDK for.
 * @param outputDir - The directory to output the SDK to.
 */
export function generateSdk(file: GenFile, outputDir: string) {
	const capabilityServices = file.services.filter(getCapabilityServiceOptions)
	if (capabilityServices.length === 0) {
		console.warn(`No capability services found in ${file.name}. Skipping...`)
		return
	}

	// Process each service
	capabilityServices.forEach((service) => {
		const capOption = getCapabilityServiceOptions(service)
		if (!capOption) {
			// Shouldn't happen, we already filtered for services with capability metadata.
			return
		}

		// Generate imports - collect all unique types first
		const typeImports = new Map<string, Set<string>>()

		var hasTriggers = false
		var hasActions = false
		// Process each method to collect types
		service.methods.forEach((method) => {
			if (method.methodKind === 'server_streaming') {
				hasTriggers = true
			} else {
				hasActions = true
			}

			// Handle input type
			const inputFile = method.input.file
			const inputPath =
				inputFile.name === file.name
					? `@cre/generated/${file.name}_pb`
					: getImportPathForFile(inputFile.name)

			if (!typeImports.has(inputPath)) {
				typeImports.set(inputPath, new Set())
			}

			const inputPathTypes = typeImports.get(inputPath)!
			inputPathTypes.add(`${method.input.name}Schema`)
			inputPathTypes.add(`type ${method.input.name}Json`)
			inputPathTypes.add(`type ${method.input.name}`)

			// Handle output type
			const outputFile = method.output.file
			const outputPath =
				outputFile.name === file.name
					? `@cre/generated/${file.name}_pb`
					: getImportPathForFile(outputFile.name)

			if (!typeImports.has(outputPath)) {
				typeImports.set(outputPath, new Set())
			}

			const outputPathTypes = typeImports.get(outputPath)!
			outputPathTypes.add(`${method.output.name}Schema`)
			outputPathTypes.add(`type ${method.output.name}`)
		})

		const modePrefix = capOption.mode === Mode.NODE ? 'Node' : ''

		// Build import statements
		const imports = new Set<string>()
		if (hasTriggers) {
			imports.add('import { fromJson, create } from "@bufbuild/protobuf"')
		} else {
			imports.add('import { fromJson } from "@bufbuild/protobuf"')
		}

		// Add trigger imports if needed
		if (hasTriggers) {
			imports.add(`import { type Trigger } from "@cre/sdk/utils/triggers/trigger-interface"`)
			imports.add(`import { type Any, AnySchema, anyPack } from "@bufbuild/protobuf/wkt"`)
		}

		// TODO???
		if (hasActions || true) {
			if (modePrefix !== '') {
				imports.add(`import type { Runtime, ${modePrefix}Runtime } from "@cre/sdk/runtime"`)
			} else {
				imports.add(`import type { Runtime } from "@cre/sdk/runtime"`)
			}
		}

		// Generate deduplicated type imports
		typeImports.forEach((types, path) => {
			const sortedTypes = Array.from(types).sort()
			imports.add(`import {
  ${sortedTypes.join(',\n  ')},
} from "${path}"`)
		})

		const capabilityClassName = `${service.name}Capability`

		// Check if this capability supports chainSelector via labels
		const chainSelectorLabel = capOption.labels?.ChainSelector as any
		const hasChainSelector = chainSelectorLabel?.kind?.case === 'uint64Label'

		// Skip legacy methods
		const serviceMethods = service.methods.filter((method) => {
			const methodMeta = method.proto.options
				? getExtension(method.proto.options, methodOption)
				: null

			return !methodMeta?.mapToUntypedApi
		})

		const sugarClasses = serviceMethods
			.map((method) => {
				const methodName = lowerCaseFirstLetter(method.name)
				return generateActionSugarClass(method, methodName, capabilityClassName, modePrefix)
			})
			.filter((method) => method !== '')
			.join('\n')

		if (sugarClasses.length > 0) {
			imports.add(
				'import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from "@cre/sdk/utils"',
			)
		}

		// Generate methods
		const methods = serviceMethods
			.map((method) => {
				const methodName = lowerCaseFirstLetter(method.name)

				// Check if this is a streaming method (trigger)
				if (method.methodKind === 'server_streaming') {
					return generateTriggerMethod(
						method,
						methodName,
						capabilityClassName,
						service.name,
						hasChainSelector,
					)
				}

				// Generate action method
				return generateActionMethod(
					method,
					methodName,
					capabilityClassName,
					hasChainSelector,
					modePrefix,
				)
			})
			.join('\n')

		// Generate trigger classes
		const triggerClasses = serviceMethods
			.filter((method) => method.methodKind === 'server_streaming')
			.map((method) => generateTriggerClass(method, service.name))
			.join('\n')

		const [capabilityName, capabilityVersion] = capOption.capabilityId.split('@')

		// Extract chainSelector support
		let chainSelectorSupport = ''
		const constructorParams: string[] = []

		if (hasChainSelector && capOption.labels) {
			const chainSelectorLabel = capOption.labels.ChainSelector as any
			if (
				chainSelectorLabel?.kind?.case === 'uint64Label' &&
				chainSelectorLabel?.kind?.value?.defaults
			) {
				const defaults = chainSelectorLabel.kind.value.defaults
				chainSelectorSupport = `
  /** Available chain selectors */
  static readonly SUPPORTED_CHAINS = {
${Object.entries(defaults)
	.map(([key, value]) => `    "${key}": ${value}n`)
	.join(',\n')}
  } as const`

				constructorParams.push('private readonly chainSelector?: bigint')
			}
		}

		const constructorCode =
			constructorParams.length > 0
				? `
	constructor(
    	${constructorParams.join(',\n    ')}
  	) {}`
				: ``

		// Add JSDoc with metadata information
		const classComment = `
/**
 * ${service.name} Capability
 * 
 * Capability ID: ${capOption.capabilityId}
 * Capability Name: ${capabilityName}
 * Capability Version: ${capabilityVersion}
 */`

		// Generate the complete file
		const output = `${Array.from(imports).join('\n')}
${sugarClasses}
${classComment}
export class ${capabilityClassName} {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "${capOption.capabilityId}";

  static readonly CAPABILITY_NAME = "${capabilityName}";
  static readonly CAPABILITY_VERSION = "${capabilityVersion}";
${chainSelectorSupport}
${constructorCode}
${methods}
}
${triggerClasses}`

		// Determine output path
		const serviceNameLowerCased: Lowercase<string> = service.name.toLowerCase() as Lowercase<string>
		const outputPath = join(outputDir, dirname(file.name), `${serviceNameLowerCased}_sdk_gen.ts`)

		// Create directory if needed
		mkdirSync(dirname(outputPath), { recursive: true })

		// Write file
		writeFileSync(outputPath, output)

		console.log(`✅ Generated SDK for ${service.name} at: ${outputPath} .`)
	})
}
