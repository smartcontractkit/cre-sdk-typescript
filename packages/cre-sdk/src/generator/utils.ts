import type { DescMessage } from '@bufbuild/protobuf'
import { ReportRequestSchema, ReportResponseSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'

/**
 * Converts first letter of string to lowercase
 */
export const lowerCaseFirstLetter = (str: string) => `${str.charAt(0).toLowerCase()}${str.slice(1)}`

/**
 * Converts a hyphenated string to PascalCase (e.g. "http-actions" -> "HttpActions")
 */
export const toPascalCase = (str: string): string =>
	str
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')

/**
 * Gets the import path for a given protobuf file
 */
export const getImportPathForFile = (fileName: string): string => {
	// Handle well-known types from protobuf
	// TODO: validate if there isn't nicer way around this
	if (fileName === 'google/protobuf/empty') {
		return '@bufbuild/protobuf/wkt'
	}

	// Default to local generated path
	return `@cre/generated/${fileName.replace('.proto', '')}_pb`
}

export const wrappedReportDesc: DescMessage = {
	...ReportResponseSchema,
	name: 'Report',
}

export function wrapType(desc: DescMessage): DescMessage {
	// Don't wrap ReportResponse itself - it should remain as is
	if (desc === ReportResponseSchema) {
		return desc
	}

	const fields = desc.fields
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i]
		if (field.message === ReportResponseSchema) {
			const wrappedTypeName = desc.name.replace('Report', 'CreReport')

			const newFields = [...fields]
			newFields[i] = {
				...field,
				message: wrappedReportDesc,
			} as typeof field

			return {
				...desc,
				name: wrappedTypeName,
				fields: newFields,
			}
		}
	}

	return desc
}
