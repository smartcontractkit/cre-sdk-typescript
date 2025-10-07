/**
 * Decodes a Uint8Array into a JSON object.
 * Function would throw if the input is not a valid JSON string encoded as bytes.
 *
 * @param input - The Uint8Array to decode.
 * @returns The decoded JSON object.
 */
export const decodeJson = (input: Uint8Array) => {
	const decoder = new TextDecoder('utf-8')
	const textBody = decoder.decode(input)
	return JSON.parse(textBody)
}
