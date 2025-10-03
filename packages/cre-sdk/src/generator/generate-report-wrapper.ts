import type { DescMessage } from '@bufbuild/protobuf'
import { ReportResponseSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { getImportPathForFile, wrappedReportDesc, wrapType } from './utils'

export function generateReportWrapper(tpe: DescMessage): [string, Map<string, Set<string>>] {
	const wrappedType = wrapType(tpe)
	if (wrappedType === tpe || wrappedType === wrappedReportDesc) {
		return ['', new Map()]
	}

	const typeImports = new Map<string, Set<string>>()

	// Process fields to collect imports
	wrappedType.fields.forEach((field) => {
		if (field.fieldKind === 'message') {
			if (field.message === wrappedReportDesc) {
				return
			}
			const importPath = getImportPathForFile(field.message.file.name)
			if (!typeImports.has(importPath)) {
				typeImports.set(importPath, new Set())
			}
			const types = typeImports.get(importPath)
			if (types) {
				types.add(`${field.message.name}Schema`)
				types.add(`type ${field.message.name}`)
				types.add(`type ${field.message.name}Json`)
			}
		}
	})

	// Add imports for ReportResponse and ReportResponseJson
	const reportImportPath = getImportPathForFile(ReportResponseSchema.file.name)
	if (!typeImports.has(reportImportPath)) {
		typeImports.set(reportImportPath, new Set())
	}
	const reportTypes = typeImports.get(reportImportPath)
	if (reportTypes) {
		reportTypes.add(`${ReportResponseSchema.name}Schema`)
		reportTypes.add(`type ${ReportResponseSchema.name}`)
		reportTypes.add(`type ${ReportResponseSchema.name}Json`)
	}

	// Generate type definition
	const typeDefinition = wrappedType.fields
		.map((field) => {
			let fieldType: string
			if (field.fieldKind === 'message') {
				fieldType = field.message.name
			} else if (field.fieldKind === 'scalar') {
				switch (field.scalar) {
					case 1:
					case 2:
						fieldType = 'number'
						break
					case 3:
					case 4:
					case 5:
					case 6:
					case 7:
					case 13:
					case 15:
					case 16:
					case 17:
					case 18:
						fieldType = 'bigint'
						break
					case 8:
						fieldType = 'boolean'
						break
					case 9:
						fieldType = 'string'
						break
					case 12:
						fieldType = 'Uint8Array'
						break
					default:
						fieldType = 'unknown'
				}
			} else if (field.fieldKind === 'enum') {
				fieldType = field.enum.name
			} else {
				fieldType = 'unknown'
			}
			// In proto3, all message fields are nullable, so add "?" for message fields
			const optionalSuffix = field.fieldKind === 'message' ? '?' : ''
			return `${field.localName}${optionalSuffix}: ${fieldType}`
		})
		.join(';\n    ')

	// Add $report property to non-JSON wrapped type
	const typeDefinitionWithReport = `${typeDefinition};\n    $report: true`

	// Generate JSON type definition (same as original but with Report replaced)
	const jsonTypeDefinition = tpe.fields
		.map((field) => {
			let fieldType: string
			if (field.fieldKind === 'message') {
				if (field.message === ReportResponseSchema) {
					fieldType = 'Report'
				} else {
					fieldType = `${field.message.name}Json`
				}
			} else if (field.fieldKind === 'scalar') {
				switch (field.scalar) {
					case 1:
					case 2:
						fieldType = 'number'
						break
					case 3:
					case 4:
					case 5:
					case 6:
					case 7:
					case 13:
					case 15:
					case 16:
					case 17:
					case 18:
						fieldType = 'bigint'
						break
					case 8:
						fieldType = 'boolean'
						break
					case 9:
						fieldType = 'string'
						break
					case 12:
						fieldType = 'string' // JSON uses string for bytes
						break
					default:
						fieldType = 'unknown'
				}
			} else if (field.fieldKind === 'enum') {
				fieldType = field.enum.name
			} else {
				fieldType = 'unknown'
			}
			// In proto3, all message fields are nullable, so add "?" for message fields
			const optionalSuffix = field.fieldKind === 'message' ? '?' : ''
			return `${field.localName}${optionalSuffix}: ${fieldType}`
		})
		.join(';\n    ')

	// Generate the wrap function (only accepts non-JSON)
	const wrapFunction = `export function x_generatedCodeOnly_wrap_${
		wrappedType.name
	}(input: ${tpe.name}): ${wrappedType.name} {
		return {
			${wrappedType.fields
				.map((field) => {
					if (field.message === wrappedReportDesc) {
						return `${field.localName}: input.${field.localName} !== undefined ? new Report(input.${field.localName}) : undefined`
					}
					return `${field.localName}: input.${field.localName}`
				})
				.join(',\n\t\t\t')},
			$report: true
		};
    }`

	// Generate create function (takes JSON version)
	const createFunction = `export function create${wrappedType.name}(input: ${
		wrappedType.name
	}Json): ${wrappedType.name} {
		return {
			${wrappedType.fields
				.map((field) => {
					if (field.message === wrappedReportDesc) {
						return `${field.localName}: input.${field.localName}`
					}

					if (field.fieldKind === 'message') {
						// Handle other message fields - convert from JSON to regular type using fromJson
						return `${field.localName}: input.${field.localName} !== undefined ? fromJson(${field.message.name}Schema, input.${field.localName}) : undefined`
					}

					if (field.fieldKind === 'scalar' && field.scalar === 12) {
						// Handle bytes field conversion from string to Uint8Array
						return `${field.localName}: hexToBytes(input.${field.localName})`
					}

					return `${field.localName}: input.${field.localName}`
				})
				.join(',\n\t\t\t')},
			$report: true
		};
    }`

	// Generate unwrap function
	const unwrapFunction = `export function x_generatedCodeOnly_unwrap_${
		wrappedType.name
	}(input: ${wrappedType.name}): ${tpe.name} {
        return create(${tpe.name}Schema, {
            ${tpe.fields
							.map((field) => {
								// If field is ReportResponse, unwrap it
								if (field.message === ReportResponseSchema) {
									return `${field.localName}: input.${field.localName} !== undefined ? input.${field.localName}.x_generatedCodeOnly_unwrap() : undefined`
								}
								return `${field.localName}: input.${field.localName}`
							})
							.join(',\n            ')}
        });
    }`

	const generatedCode = `
export type ${wrappedType.name} = {
    ${typeDefinitionWithReport}
};

export type ${wrappedType.name}Json = {
    ${jsonTypeDefinition}
};

${wrapFunction}

${createFunction}

${unwrapFunction}
    `

	return [generatedCode, typeImports]
}
