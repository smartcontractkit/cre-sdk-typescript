import { create } from '@bufbuild/protobuf'
import type {
	ConfidentialHTTPRequest,
	HTTPRequest,
	HTTPRequestJson,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'
import {
	ConfidentialHTTPRequestSchema,
	HTTPRequestSchema,
	SecretIdentifierSchema,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'

/** VaultDON secret name used for AES-GCM encryption of confidential HTTP responses. */
export const ENCRYPTION_KEY_SECRET_NAME = 'san_marino_aes_gcm_encryption_key'

/** HKDF info parameter shared across all language implementations. */
const HKDF_INFO = 'confidential-http-encryption-key-v1'

const AES_KEY_LEN = 32
const GCM_NONCE_LEN = 12

/**
 * Derives a 32-byte AES-256 key from a passphrase using HKDF-SHA256.
 *
 * Parameters match the Go implementation:
 * - Salt: empty
 * - Info: "confidential-http-encryption-key-v1"
 * - IKM: passphrase (UTF-8 bytes)
 */
export async function deriveEncryptionKey(passphrase: string): Promise<Uint8Array> {
	const encoder = new TextEncoder()
	const ikm = encoder.encode(passphrase)
	const info = encoder.encode(HKDF_INFO)

	// Import the passphrase as raw key material for HKDF.
	const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])

	const bits = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: new Uint8Array(0),
			info,
		},
		baseKey,
		AES_KEY_LEN * 8,
	)

	return new Uint8Array(bits)
}

/**
 * Builds a ConfidentialHTTPRequest with encryptOutput=true and the AES key
 * SecretIdentifier auto-injected.
 *
 * Accepts either a protobuf HTTPRequest message or a plain HTTPRequestJson object.
 */
export function createRequestForEncryptedResponse(
	req: HTTPRequest | HTTPRequestJson,
	owner: string,
): ConfidentialHTTPRequest {
	// If req is a plain JSON object (no $typeName), convert to protobuf message.
	const httpReq = isHTTPRequestMessage(req) ? req : create(HTTPRequestSchema, req)
	httpReq.encryptOutput = true

	return create(ConfidentialHTTPRequestSchema, {
		request: httpReq,
		vaultDonSecrets: [
			create(SecretIdentifierSchema, {
				key: ENCRYPTION_KEY_SECRET_NAME,
				owner,
			}),
		],
	})
}

/**
 * Decrypts an AES-GCM encrypted response body using the same passphrase that
 * was used to store the encryption key.
 *
 * Wire format: [12-byte nonce][ciphertext+GCM tag]
 */
export async function decryptResponseBody(
	ciphertext: Uint8Array,
	passphrase: string,
): Promise<Uint8Array> {
	const keyBytes = await deriveEncryptionKey(passphrase)

	const nonce = ciphertext.slice(0, GCM_NONCE_LEN)
	const encrypted = ciphertext.slice(GCM_NONCE_LEN)

	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])

	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, encrypted)

	return new Uint8Array(plaintext)
}

function isHTTPRequestMessage(req: HTTPRequest | HTTPRequestJson): req is HTTPRequest {
	return '$typeName' in req
}
