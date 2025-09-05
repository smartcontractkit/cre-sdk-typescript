import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { getExtension, type DescService } from "@bufbuild/protobuf"
import {
  capability,
  method as methodOption,
} from "@cre/generated/tools/generator/v1alpha/cre_metadata_pb"
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb"
import type { GenFile } from "@bufbuild/protobuf/codegenv2"
import type { CapabilityMetadata } from "@cre/generated/tools/generator/v1alpha/cre_metadata_pb"
import { generateActionMethod } from "./generate-action"
import { generateTriggerMethod, generateTriggerClass } from "./generate-trigger"
import { lowerCaseFirstLetter, getImportPathForFile } from "./utils"

const getCapabilityServiceOptions = (
  service: DescService
): CapabilityMetadata | false => {
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

    // Process each method to collect types
    service.methods.forEach((method) => {
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

    // Check if we have any triggers
    const hasTriggers = service.methods.some(
      (m) => m.methodKind === "server_streaming"
    )

    // Build import statements
    const imports = new Set<string>()
    imports.add(
      'import { fromBinary, toBinary, fromJson, create } from "@bufbuild/protobuf";'
    )
    imports.add(`import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";`)
    imports.add(
      `import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";`
    )
    imports.add(
      `import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";`
    )

    // Add trigger imports if needed
    if (hasTriggers) {
      imports.add(
        `import { type Trigger } from "@cre/sdk/utils/triggers/trigger-interface";`
      )
      imports.add(
        `import { type Any, AnySchema } from "@bufbuild/protobuf/wkt";`
      )
    }

    // Always import getTypeUrl when we generate Any payloads
    imports.add(`import { getTypeUrl } from "@cre/sdk/utils/typeurl";`)

    // Generate deduplicated type imports
    typeImports.forEach((types, path) => {
      const sortedTypes = Array.from(types).sort()
      imports.add(`import {
  ${sortedTypes.join(",\n  ")},
} from "${path}";`)
    })

    const capabilityClassName = `${service.name}Capability`

    // Check if this capability supports chainSelector via labels
    const chainSelectorLabel = capOption.labels?.ChainSelector as any
    const hasChainSelector = chainSelectorLabel?.kind?.case === "uint64Label"

    // Skip legacy methods
    const serviceMethods = service.methods.filter((method) => {
      const methodMeta = method.proto.options
        ? getExtension(method.proto.options, methodOption)
        : null

      return !methodMeta?.mapToUntypedApi
    })

    // Generate methods
    const methods = serviceMethods
      .map((method) => {
        const methodName = lowerCaseFirstLetter(method.name)

        // Check if this is a streaming method (trigger)
        if (method.methodKind === "server_streaming") {
          return generateTriggerMethod(
            method,
            methodName,
            capabilityClassName,
            service.name
          )
        }

        // Generate action method
        return generateActionMethod(
          method,
          methodName,
          capabilityClassName,
          hasChainSelector
        )
      })
      .join("\n")

    // Generate trigger classes
    const triggerClasses = serviceMethods
      .filter((method) => method.methodKind === "server_streaming")
      .map((method) => generateTriggerClass(method, service.name))
      .join("\n")

    // Determine default mode from metadata: NODE is specifically stated, DON otherwise.
    const defaultMode = capOption.mode === Mode.NODE ? "Mode.NODE" : "Mode.DON"

    const [capabilityName, capabilityVersion] =
      capOption.capabilityId.split("@")

    // Extract chainSelector support
    let chainSelectorSupport = ""
    let constructorParams = `private readonly mode: Mode = ${service.name}Capability.DEFAULT_MODE`

    if (hasChainSelector && capOption.labels) {
      const chainSelectorLabel = capOption.labels.ChainSelector as any
      if (
        chainSelectorLabel?.kind?.case === "uint64Label" &&
        chainSelectorLabel?.kind?.value?.defaults
      ) {
        const defaults = chainSelectorLabel.kind.value.defaults
        chainSelectorSupport = `
  /** Available chain selectors */
  static readonly SUPPORTED_CHAINS = {
${Object.entries(defaults)
  .map(([key, value]) => `    "${key}": ${value}n`)
  .join(",\n")}
  } as const;`

        constructorParams = `${constructorParams},\n    private readonly chainSelector?: bigint`
      }
    }

    // Add JSDoc with metadata information
    const classComment = `
/**
 * ${service.name} Capability
 * 
 * Capability ID: ${capOption.capabilityId}
 * Default Mode: ${defaultMode}
 * Capability Name: ${capabilityName}
 * Capability Version: ${capabilityVersion}
 */`

    // Generate the complete file
    const output = `${Array.from(imports).join("\n")}
${classComment}
export class ${capabilityClassName} {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "${capOption.capabilityId}";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = ${defaultMode};

  static readonly CAPABILITY_NAME = "${capabilityName}";
  static readonly CAPABILITY_VERSION = "${capabilityVersion}";
${chainSelectorSupport}

  constructor(
    ${constructorParams}
  ) {}
${methods}
}
${triggerClasses}`

    // Determine output path
    const serviceNameLowerCased: Lowercase<string> =
      service.name.toLowerCase() as Lowercase<string>
    const outputPath = join(
      outputDir,
      dirname(file.name),
      `${serviceNameLowerCased}_sdk_gen.ts`
    )

    // Create directory if needed
    mkdirSync(dirname(outputPath), { recursive: true })

    // Write file
    writeFileSync(outputPath, output)

    console.log(`✅ Generated SDK for ${service.name} at: ${outputPath} .`)
  })
}
