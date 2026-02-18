import { describe, expect, it } from 'bun:test'
import {
	ENCRYPTION_KEY_SECRET_NAME,
	createRequestForEncryptedResponse,
	decryptResponseBody,
	deriveEncryptionKey,
} from './encryption'

// Cross-language test vector (must match Go output).
const TEST_PASSPHRASE = 'test-passphrase-for-ci'
const TEST_EXPECTED_HEX =
	'521af99325c07c9bd0d224c5bf3ca25666c68b5fbb7fa7884019b4f60a8e6eb5'

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}

describe('deriveEncryptionKey', () => {
	it('produces deterministic output for the same passphrase', async () => {
		const k1 = await deriveEncryptionKey('my-passphrase')
		const k2 = await deriveEncryptionKey('my-passphrase')
		expect(toHex(k1)).toBe(toHex(k2))
	})

	it('produces different output for different passphrases', async () => {
		const k1 = await deriveEncryptionKey('passphrase-a')
		const k2 = await deriveEncryptionKey('passphrase-b')
		expect(toHex(k1)).not.toBe(toHex(k2))
	})

	it('matches the Go cross-language test vector', async () => {
		const key = await deriveEncryptionKey(TEST_PASSPHRASE)
		expect(toHex(key)).toBe(TEST_EXPECTED_HEX)
	})
})

describe('createRequestForEncryptedResponse', () => {
	it('sets encryptOutput and injects the secret identifier (JSON input)', () => {
		const req = createRequestForEncryptedResponse(
			{ url: 'https://example.com', method: 'GET' },
			'0xDeaDBeeF',
		)

		expect(req.request?.encryptOutput).toBe(true)
		expect(req.vaultDonSecrets).toHaveLength(1)
		expect(req.vaultDonSecrets[0].key).toBe(ENCRYPTION_KEY_SECRET_NAME)
		expect(req.vaultDonSecrets[0].owner).toBe('0xDeaDBeeF')
	})
})

describe('decryptResponseBody', () => {
	it('round-trips encrypt then decrypt', async () => {
		const passphrase = 'round-trip-test'
		const plaintext = new TextEncoder().encode('hello confidential http')

		const keyBytes = await deriveEncryptionKey(passphrase)

		// Encrypt using Web Crypto (simulates enclave behavior).
		const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
		const nonce = crypto.getRandomValues(new Uint8Array(12))
		const ciphertextBuf = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: nonce },
			key,
			plaintext,
		)

		// Wire format: [nonce][ciphertext+tag]
		const wire = new Uint8Array(nonce.length + ciphertextBuf.byteLength)
		wire.set(nonce, 0)
		wire.set(new Uint8Array(ciphertextBuf), nonce.length)

		const decrypted = await decryptResponseBody(wire, passphrase)
		expect(new TextDecoder().decode(decrypted)).toBe('hello confidential http')
	})

	it('fails with wrong passphrase', async () => {
		const keyBytes = await deriveEncryptionKey('correct-passphrase')
		const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
		const nonce = crypto.getRandomValues(new Uint8Array(12))
		const ciphertextBuf = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: nonce },
			key,
			new TextEncoder().encode('secret'),
		)

		const wire = new Uint8Array(nonce.length + ciphertextBuf.byteLength)
		wire.set(nonce, 0)
		wire.set(new Uint8Array(ciphertextBuf), nonce.length)

		expect(decryptResponseBody(wire, 'wrong-passphrase')).rejects.toThrow()
	})
})
