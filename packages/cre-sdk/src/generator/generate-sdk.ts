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
import { generateReportWrapper } from './generate-report-wrapper'
import { generateActionSugarClass } from './generate-sugar'
import { generateTriggerClass, generateTriggerMethod } from './generate-trigger'
import {
	generateCapabilityIdLogic,
	generateConstructorParams,
	generateLabelSupport,
	processLabels,
} from './label-utils'
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

		let hasTriggers = false
		let hasActions = false
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
		// Note: protobuf imports are deferred until after report wrappers are processed,
		// since report wrappers may require 'create' from "@bufbuild/protobuf"
		const imports = new Set<string>()

		// Add trigger imports if needed
		if (hasTriggers) {
			imports.add(`import type { Trigger } from "@cre/sdk/utils/triggers/trigger-interface"`)
			imports.add(`import { type Any, AnySchema, anyPack } from "@bufbuild/protobuf/wkt"`)
		}

		if (hasActions) {
			if (modePrefix !== '') {
				imports.add(`import type { Runtime, ${modePrefix}Runtime } from "@cre/sdk"`)
				imports.add(`import { Report } from "@cre/sdk/report"`)
			} else {
				imports.add(`import type { Runtime } from "@cre/sdk"`)
				imports.add(`import { Report } from "@cre/sdk/report"`)
				imports.add(`import { hexToBytes } from "@cre/sdk/utils/hex-utils";`)
			}
		}

		const capabilityClassName = `${service.name}Capability`

		// Process all labels from capability metadata
		const labels = processLabels(capOption)

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

		const reportWrappers = serviceMethods
			.map((method) => {
				const [outputWrapper, outputImports] = generateReportWrapper(method.output)
				const [inputWrapper, inputImports] = generateReportWrapper(method.input)
				if (outputWrapper !== '' || inputWrapper !== '') {
					// Add the imports to typeImports
					outputImports.forEach((types, path) => {
						if (!typeImports.has(path)) {
							typeImports.set(path, new Set())
						}
						const existingTypes = typeImports.get(path)!
						types.forEach((type) => {
							existingTypes.add(type)
						})
					})
					inputImports.forEach((types, path) => {
						if (!typeImports.has(path)) {
							typeImports.set(path, new Set())
						}
						const existingTypes = typeImports.get(path)!
						types.forEach((type) => {
							existingTypes.add(type)
						})
					})
					return `${outputWrapper}\n${inputWrapper}`
				}
				return ''
			})
			.filter((wrapper) => wrapper !== '')
			.join('\n')

		// Add protobuf imports - 'create' is needed by triggers and report wrappers
		const hasReportWrappers = reportWrappers.length > 0
		if (hasTriggers || hasReportWrappers) {
			imports.add('import { fromJson, create } from "@bufbuild/protobuf"')
		} else {
			imports.add('import { fromJson } from "@bufbuild/protobuf"')
		}

		// Generate deduplicated type imports (after report wrapper processing).
		// When all imports from a path are type-only, use `import type` so the
		// import is fully erased in JS output (avoids circular-dependency issues).
		typeImports.forEach((types, path) => {
			const sortedTypes = Array.from(types).sort()
			const hasValues = sortedTypes.some((t) => !t.startsWith('type '))

			if (hasValues) {
				imports.add(`import {
  ${sortedTypes.join(',\n  ')},
} from "${path}"`)
			} else {
				const stripped = sortedTypes.map((t) => t.slice(5))
				imports.add(`import type {
  ${stripped.join(',\n  ')},
} from "${path}"`)
			}
		})

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
						labels,
					)
				}

				// Generate action method
				return generateActionMethod(method, methodName, capabilityClassName, labels, modePrefix)
			})
			.join('\n')

		// Generate trigger classes
		const triggerClasses = serviceMethods
			.filter((method) => method.methodKind === 'server_streaming')
			.map((method) => generateTriggerClass(method, service.name, labels))
			.join('\n')

		const atIndex = capOption.capabilityId.indexOf('@')
		const capabilityName =
			atIndex >= 0 ? capOption.capabilityId.slice(0, atIndex) : capOption.capabilityId
		const capabilityVersion = atIndex >= 0 ? capOption.capabilityId.slice(atIndex + 1) : ''

		// Generate label support (constants and constructor params)
		const labelSupport = generateLabelSupport(labels)
		const constructorParams = generateConstructorParams(labels)

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
${reportWrappers}
${classComment}
export class ${capabilityClassName} {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "${capOption.capabilityId}";

  static readonly CAPABILITY_NAME = "${capabilityName}";
  static readonly CAPABILITY_VERSION = "${capabilityVersion}";
${labelSupport}
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
