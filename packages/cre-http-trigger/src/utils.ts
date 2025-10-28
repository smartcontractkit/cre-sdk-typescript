import { createHash } from 'crypto'
import stringify from 'json-stable-stringify'

// Helper function to compute SHA256 hash
export const sha256 = (data: any): string => {
	const jsonString = typeof data === 'string' ? data : (stringify(data) ?? '')
	return createHash('sha256').update(jsonString).digest('hex')
}

// Helper function to convert base64 string to base64url by replacing URL-unsafe characters
export const base64URLEncode = (str: string): string =>
	str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
