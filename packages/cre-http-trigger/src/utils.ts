import { createHash } from 'crypto'

// Helper function to compute SHA256 hash
export const sha256 = (data: any): string => {
	const jsonString = typeof data === 'string' ? data : JSON.stringify(data)
	return createHash('sha256').update(jsonString).digest('hex')
}

// Helper function to encode a string to base64url while removing the padding characters
export const base64URLEncode = (str: string): string =>
	Buffer.from(str, typeof str === 'string' && str.indexOf('{') !== -1 ? 'utf8' : 'binary')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
