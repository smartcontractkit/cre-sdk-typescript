import { describe, expect, test } from 'bun:test'
import { buildAuthConfig } from '@cre/sdk/cre/confidentialhttp'

describe('buildAuthConfig', () => {
	test('apiKey variant', () => {
		const a = buildAuthConfig({
			kind: 'apiKey',
			headerName: 'x-api-key',
			secret: { key: 'cg' },
		})
		expect(a.apiKey?.headerName).toBe('x-api-key')
		expect(a.apiKey?.secret?.key).toBe('cg')
		expect(a.apiKey?.valuePrefix).toBe('')
	})

	test('apiKey with valuePrefix', () => {
		const a = buildAuthConfig({
			kind: 'apiKey',
			headerName: 'Authorization',
			secret: { key: 'tok' },
			valuePrefix: 'ApiKey ',
		})
		expect(a.apiKey?.valuePrefix).toBe('ApiKey ')
	})

	test('basic variant', () => {
		const a = buildAuthConfig({
			kind: 'basic',
			username: { key: 'u' },
			password: { key: 'p' },
		})
		expect(a.basic?.username?.secret?.key).toBe('u')
		expect(a.basic?.password?.key).toBe('p')
	})

	test('basic with plain username', () => {
		const a = buildAuthConfig({
			kind: 'basic',
			username: 'public-user',
			password: { key: 'p' },
		})
		expect(a.basic?.username?.plain).toBe('public-user')
		expect(a.basic?.password?.key).toBe('p')
	})

	test('bearer with overrides', () => {
		const a = buildAuthConfig({
			kind: 'bearer',
			token: { key: 'pat' },
			headerName: 'Authorization',
			valuePrefix: 'token ',
		})
		expect(a.bearer?.token?.key).toBe('pat')
		expect(a.bearer?.headerName).toBe('Authorization')
		expect(a.bearer?.valuePrefix).toBe('token ')
	})

	test('hmacSha256', () => {
		const a = buildAuthConfig({
			kind: 'hmacSha256',
			secret: { key: 'k' },
			signatureHeader: 'X-Sig',
			encoding: 'base64',
			includeQuery: true,
		})
		expect(a.hmac?.sha256?.signatureHeader).toBe('X-Sig')
		expect(a.hmac?.sha256?.includeQuery).toBe(true)
		expect(a.hmac?.sha256?.encoding).toBe('base64')
	})

	test('awsSigV4 with all options', () => {
		const a = buildAuthConfig({
			kind: 'awsSigV4',
			accessKeyId: { key: 'ak' },
			secretAccessKey: { key: 'sk' },
			sessionToken: { key: 'st' },
			region: 'us-east-1',
			service: 's3',
			signedHeaders: ['host', 'x-amz-date'],
			unsignedPayload: true,
		})
		const v = a.hmac?.awsSigV4
		expect(v?.accessKeyId?.secret?.key).toBe('ak')
		expect(v?.secretAccessKey?.key).toBe('sk')
		expect(v?.sessionToken?.key).toBe('st')
		expect(v?.signedHeaders?.length).toBe(2)
		expect(v?.unsignedPayload).toBe(true)
	})

	test('hmacCustom sha512', () => {
		const a = buildAuthConfig({
			kind: 'hmacCustom',
			secret: { key: 'k' },
			canonicalTemplate: '{{.method}}',
			hash: 'sha512',
			signatureHeader: 'X-Sig',
			signaturePrefix: 'HMAC-SHA512 ',
		})
		expect(a.hmac?.custom?.hash).toBe('HASH_SHA512')
		expect(a.hmac?.custom?.signaturePrefix).toBe('HMAC-SHA512 ')
	})

	test('oauth2 clientCredentials', () => {
		const a = buildAuthConfig({
			kind: 'oauth2ClientCredentials',
			tokenUrl: 'https://idp/token',
			clientId: { key: 'cid' },
			clientSecret: { key: 'csec' },
			scopes: ['read', 'write'],
			audience: 'aud',
			clientAuthMethod: 'requestBody',
			extraParams: { foo: 'bar' },
		})
		const v = a.oauth2?.clientCredentials
		expect(v?.tokenUrl).toBe('https://idp/token')
		expect(v?.scopes).toEqual(['read', 'write'])
		expect(v?.clientAuthMethod).toBe('request_body')
		expect(v?.extraParams?.foo).toBe('bar')
	})

	test('oauth2 refreshToken', () => {
		const a = buildAuthConfig({
			kind: 'oauth2RefreshToken',
			tokenUrl: 'https://idp/token',
			refreshToken: { key: 'rt' },
			clientId: { key: 'cid' },
			clientSecret: { key: 'csec' },
			scopes: ['read'],
		})
		const v = a.oauth2?.refreshToken
		expect(v?.refreshToken?.key).toBe('rt')
		expect(v?.clientId?.secret?.key).toBe('cid')
		expect(v?.clientSecret?.key).toBe('csec')
	})
})
