import { describe, expect, test } from 'bun:test'
import { buildAuthConfig } from '@cre/sdk/cre/confidentialhttp'

describe('buildAuthConfig', () => {
	test('apiKey variant', () => {
		const a = buildAuthConfig({
			kind: 'apiKey',
			headerName: 'x-api-key',
			secretName: 'cg',
		})
		expect(a.method.case).toBe('apiKey')
		if (a.method.case !== 'apiKey') throw new Error('narrow')
		expect(a.method.value.headerName).toBe('x-api-key')
		expect(a.method.value.secretName).toBe('cg')
		expect(a.method.value.valuePrefix).toBe('')
	})

	test('apiKey with valuePrefix', () => {
		const a = buildAuthConfig({
			kind: 'apiKey',
			headerName: 'Authorization',
			secretName: 'tok',
			valuePrefix: 'ApiKey ',
		})
		if (a.method.case !== 'apiKey') throw new Error('narrow')
		expect(a.method.value.valuePrefix).toBe('ApiKey ')
	})

	test('basic variant', () => {
		const a = buildAuthConfig({
			kind: 'basic',
			usernameSecretName: 'u',
			passwordSecretName: 'p',
		})
		expect(a.method.case).toBe('basic')
	})

	test('bearer with overrides', () => {
		const a = buildAuthConfig({
			kind: 'bearer',
			tokenSecretName: 'pat',
			headerName: 'Authorization',
			valuePrefix: 'token ',
		})
		if (a.method.case !== 'bearer') throw new Error('narrow')
		expect(a.method.value.headerName).toBe('Authorization')
		expect(a.method.value.valuePrefix).toBe('token ')
	})

	test('hmacSha256', () => {
		const a = buildAuthConfig({
			kind: 'hmacSha256',
			secretName: 'k',
			signatureHeader: 'X-Sig',
			encoding: 'base64',
			includeQuery: true,
		})
		if (a.method.case !== 'hmac') throw new Error('narrow method')
		if (a.method.value.variant.case !== 'sha256') throw new Error('narrow variant')
		expect(a.method.value.variant.value.signatureHeader).toBe('X-Sig')
		expect(a.method.value.variant.value.includeQuery).toBe(true)
		expect(a.method.value.variant.value.encoding).toBe('base64')
	})

	test('awsSigV4 with all options', () => {
		const a = buildAuthConfig({
			kind: 'awsSigV4',
			accessKeyIdSecretName: 'ak',
			secretAccessKeySecretName: 'sk',
			sessionTokenSecretName: 'st',
			region: 'us-east-1',
			service: 's3',
			signedHeaders: ['host', 'x-amz-date'],
			unsignedPayload: true,
		})
		if (a.method.case !== 'hmac') throw new Error('narrow method')
		if (a.method.value.variant.case !== 'awsSigV4') throw new Error('narrow variant')
		const v = a.method.value.variant.value
		expect(v.sessionTokenSecretName).toBe('st')
		expect(v.signedHeaders.length).toBe(2)
		expect(v.unsignedPayload).toBe(true)
	})

	test('hmacCustom sha512', () => {
		const a = buildAuthConfig({
			kind: 'hmacCustom',
			secretName: 'k',
			canonicalTemplate: '{{.method}}',
			hash: 'sha512',
			signatureHeader: 'X-Sig',
			signaturePrefix: 'HMAC-SHA512 ',
		})
		if (a.method.case !== 'hmac') throw new Error('narrow method')
		if (a.method.value.variant.case !== 'custom') throw new Error('narrow variant')
		// SHA512 enum value = 1 per generated enum.
		expect(a.method.value.variant.value.hash).toBe(1)
		expect(a.method.value.variant.value.signaturePrefix).toBe('HMAC-SHA512 ')
	})

	test('oauth2 clientCredentials', () => {
		const a = buildAuthConfig({
			kind: 'oauth2ClientCredentials',
			tokenUrl: 'https://idp/token',
			clientIdSecretName: 'cid',
			clientSecretSecretName: 'csec',
			scopes: ['read', 'write'],
			audience: 'aud',
			clientAuthMethod: 'requestBody',
			extraParams: { foo: 'bar' },
		})
		if (a.method.case !== 'oauth2') throw new Error('narrow method')
		if (a.method.value.variant.case !== 'clientCredentials') throw new Error('narrow variant')
		const v = a.method.value.variant.value
		expect(v.tokenUrl).toBe('https://idp/token')
		expect(v.scopes).toEqual(['read', 'write'])
		expect(v.clientAuthMethod).toBe('request_body')
		expect(v.extraParams.foo).toBe('bar')
	})

	test('oauth2 refreshToken', () => {
		const a = buildAuthConfig({
			kind: 'oauth2RefreshToken',
			tokenUrl: 'https://idp/token',
			refreshTokenSecretName: 'rt',
			clientIdSecretName: 'cid',
			clientSecretSecretName: 'csec',
			scopes: ['read'],
		})
		if (a.method.case !== 'oauth2') throw new Error('narrow method')
		if (a.method.value.variant.case !== 'refreshToken') throw new Error('narrow variant')
		const v = a.method.value.variant.value
		expect(v.refreshTokenSecretName).toBe('rt')
		expect(v.clientIdSecretName).toBe('cid')
		expect(v.clientSecretSecretName).toBe('csec')
	})
})
