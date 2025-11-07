import type { CapabilityMetadata } from '@cre/generated/tools/generator/v1alpha/cre_metadata_pb'

/**
 * Represents a processed label with TypeScript-specific information
 */
export interface ProcessedLabel {
	name: string // e.g., "ChainSelector"
	type: 'string' | 'bigint' | 'number'
	tsType: string // TypeScript type string
	defaults?: Record<string, string | number | bigint>
	formatExpression: string // How to convert to string for capability ID
}

/**
 * Extracts and processes all labels from capability metadata
 */
export function processLabels(capOption: CapabilityMetadata): ProcessedLabel[] {
	if (!capOption.labels || Object.keys(capOption.labels).length === 0) {
		return []
	}

	const labels: ProcessedLabel[] = []

	// Sort labels alphabetically for consistency
	const sortedLabelNames = Object.keys(capOption.labels).sort()

	for (const labelName of sortedLabelNames) {
		const label = capOption.labels[labelName] as any

		if (!label?.kind) continue

		const processed = processLabel(labelName, label)
		if (processed) {
			labels.push(processed)
		}
	}

	return labels
}

/**
 * Process a single label based on its type
 */
function processLabel(name: string, label: any): ProcessedLabel | null {
	const kindCase = label.kind.case
	const kindValue = label.kind.value

	switch (kindCase) {
		case 'stringLabel':
			return {
				name,
				type: 'string',
				tsType: 'string',
				defaults: kindValue?.defaults || undefined,
				formatExpression: `\${this.${name}}`,
			}

		case 'uint64Label':
			return {
				name,
				type: 'bigint',
				tsType: 'bigint',
				defaults: kindValue?.defaults || undefined,
				formatExpression: `\${this.${name}}`,
			}

		case 'uint32Label':
			return {
				name,
				type: 'number',
				tsType: 'number',
				defaults: kindValue?.defaults || undefined,
				formatExpression: `\${this.${name}}`,
			}

		case 'int64Label':
			return {
				name,
				type: 'bigint',
				tsType: 'bigint',
				defaults: kindValue?.defaults || undefined,
				formatExpression: `\${this.${name}}`,
			}

		case 'int32Label':
			return {
				name,
				type: 'number',
				tsType: 'number',
				defaults: kindValue?.defaults || undefined,
				formatExpression: `\${this.${name}}`,
			}

		default:
			console.warn(`Unsupported label type: ${kindCase} for label: ${name}`)
			return null
	}
}

/**
 * Generate capability ID logic that includes all labels
 */
export function generateCapabilityIdLogic(
	labels: ProcessedLabel[],
	capabilityClassName: string,
): string {
	if (labels.length === 0) {
		return `
    const capabilityId = ${capabilityClassName}.CAPABILITY_ID;`
	}

	// Build the capability ID with all labels
	// Format: "name:Label1Name:label1Value:Label2Name:label2Value@version"
	const labelParts = labels.map((label) => `:${label.name}:${label.formatExpression}`).join('')

	return `
    // Include all labels in capability ID for routing when specified
    const capabilityId = \`\${${capabilityClassName}.CAPABILITY_NAME}${labelParts}@\${${capabilityClassName}.CAPABILITY_VERSION}\`;`
}

/**
 * Generate constructor parameters for all labels
 */
export function generateConstructorParams(labels: ProcessedLabel[]): string[] {
	return labels.map((label) => `private readonly ${label.name}: ${label.tsType}`)
}

/**
 * Generate constants and helper functions for label defaults
 */
export function generateLabelSupport(labels: ProcessedLabel[]): string {
	if (labels.length === 0) return ''

	const sections: string[] = []

	for (const label of labels) {
		if (!label.defaults || Object.keys(label.defaults).length === 0) {
			continue
		}

		// Generate SUPPORTED_* constants object
		const constantsName = `SUPPORTED_${toScreamingSnakeCase(label.name)}S`
		const entries = Object.entries(label.defaults)
			.map(([key, value]) => {
				const formattedValue =
					label.type === 'bigint' ? `${value}n` : label.type === 'string' ? `"${value}"` : value
				return `    "${key}": ${formattedValue}`
			})
			.join(',\n')

		sections.push(`
  /** Available ${label.name} values */
  static readonly ${constantsName} = {
${entries}
  } as const`)
	}

	return sections.join('\n')
}

/**
 * Convert camelCase to SCREAMING_SNAKE_CASE
 */
function toScreamingSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '_$1')
		.replace(/^_/, '')
		.toUpperCase()
}
