import { v4 as uuidv4 } from 'uuid'
import { type Hex, parseSignature } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { WorkflowSelector } from './schemas'
import { base64URLEncode, sha256 } from './utils'

export interface JSONRPCRequest {
	jsonrpc: string
	id: string
	method: string
	params: {
		input: any
		workflow: WorkflowSelector
	}
}

export const createJWT = async (request: JSONRPCRequest, privateKey: Hex): Promise<string> => {
	const account = privateKeyToAccount(privateKey)
	const address = account.address

	// Create JWT header
	const header = {
		alg: 'ETH',
		typ: 'JWT',
	}

	// Create JWT payload with request and metadata
	const now = Math.floor(Date.now() / 1000)

	// Note: Request needs to be in the following order:
	// Version string  `json:"jsonrpc"`
	// ID      string  `json:"id"`
	// Method  string  `json:"method"`
	// Params  *Params `json:"params"`

	const payload = {
		digest: `0x${sha256(request)}`,
		iss: address,
		iat: now,
		exp: now + 300, // 5 minutes expiration
		jti: uuidv4(),
	}

	// Encode header and payload
	const encodedHeader = base64URLEncode(JSON.stringify(header))
	const encodedPayload = base64URLEncode(JSON.stringify(payload))
	const rawMessage = `${encodedHeader}.${encodedPayload}`

	// Sign the message - viem's signMessage handles the Ethereum Signed Message prefix and hashing
	const signature = await account.signMessage({
		message: rawMessage,
	})

	// Convert signature to JWT format (r, s, v components)
	const { r, s, v, yParity } = parseSignature(signature)
	// Use yParity if v is undefined (yParity is 0 or 1)
	const recoveryId = v !== undefined ? (v >= 27n ? v - 27n : v) : yParity

	if (recoveryId === undefined) {
		throw new Error('Unable to extract recovery ID from signature')
	}

	// Combine r, s, and adjusted v into a single buffer
	const signatureBytes = Buffer.concat([
		Buffer.from(r.slice(2), 'hex'), // Remove 0x prefix from r
		Buffer.from(s.slice(2), 'hex'), // Remove 0x prefix from s
		Buffer.from([Number(recoveryId)]),
	])

	const encodedSignature = base64URLEncode(signatureBytes.toString('binary'))

	return `${rawMessage}.${encodedSignature}`
}
