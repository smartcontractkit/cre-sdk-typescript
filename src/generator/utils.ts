/**
 * Converts first letter of string to lowercase
 */
export const lowerCaseFirstLetter = (str: string) => `${str.charAt(0).toLowerCase()}${str.slice(1)}`

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
