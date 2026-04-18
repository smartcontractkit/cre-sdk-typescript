/**
 * Ergonomic helpers for the confidentialHTTP capability's AuthConfig.
 *
 * The generated SDK at `@cre/generated-sdk/.../confidentialhttp/.../client_sdk_gen.ts`
 * accepts a raw `ConfidentialHTTPRequest` / `ConfidentialHTTPRequestJson`.
 * Building the AuthConfig oneof variants by hand is verbose; these helpers
 * let workflow authors describe the signing method via a discriminated union
 * and produce the matching proto structure.
 *
 * All secret references are by string key; every name used inside an
 * `AuthConfigInput` must also appear in `vaultDonSecrets` (the capability
 * validator enforces this).
 */

import {
	type ApiKeyAuth,
	type AuthConfig,
	type AwsSigV4,
	type BasicAuth,
	type BearerAuth,
	HmacCustom_Hash,
	type HmacAuth,
	type HmacCustom,
	type HmacSha256,
	type OAuth2Auth,
	type OAuth2ClientCredentials,
	type OAuth2RefreshToken,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'

// -----------------------------------------------------------------------------
// Discriminated union — the ergonomic input type for workflow authors.
// -----------------------------------------------------------------------------

export type AuthConfigInput =
	| ApiKeyAuthInput
	| BasicAuthInput
	| BearerAuthInput
	| HmacSha256Input
	| AwsSigV4Input
	| HmacCustomInput
	| OAuth2ClientCredentialsInput
	| OAuth2RefreshTokenInput

export type ApiKeyAuthInput = {
	kind: 'apiKey'
	/** Header name, e.g. "x-api-key" or "Authorization". */
	headerName: string
	/** Name of a secret declared in vaultDonSecrets. */
	secretName: string
	/** Optional prefix, e.g. "ApiKey " or "Token ". Default: empty. */
	valuePrefix?: string
}

export type BasicAuthInput = {
	kind: 'basic'
	usernameSecretName: string
	passwordSecretName: string
}

export type BearerAuthInput = {
	kind: 'bearer'
	tokenSecretName: string
	/** Default "Authorization". */
	headerName?: string
	/** Default "Bearer ". */
	valuePrefix?: string
}

export type HmacSha256Input = {
	kind: 'hmacSha256'
	secretName: string
	/** Default "X-Signature". */
	signatureHeader?: string
	/** Default "X-Timestamp". */
	timestampHeader?: string
	includeQuery?: boolean
	/** "hex" (default) or "base64". */
	encoding?: 'hex' | 'base64'
}

export type AwsSigV4Input = {
	kind: 'awsSigV4'
	accessKeyIdSecretName: string
	secretAccessKeySecretName: string
	/** Optional STS session token. */
	sessionTokenSecretName?: string
	region: string
	service: string
	/** Override the set of signed headers. */
	signedHeaders?: string[]
	/** S3 streaming uploads — advertise UNSIGNED-PAYLOAD. */
	unsignedPayload?: boolean
}

export type HmacCustomInput = {
	kind: 'hmacCustom'
	secretName: string
	/** Go text/template canonical string. See docs for available vars. */
	canonicalTemplate: string
	hash: 'sha256' | 'sha512'
	/** "hex" (default) or "base64". */
	encoding?: 'hex' | 'base64'
	signatureHeader: string
	signaturePrefix?: string
	timestampHeader?: string
	nonceHeader?: string
}

export type OAuth2ClientCredentialsInput = {
	kind: 'oauth2ClientCredentials'
	/** Must be https://. */
	tokenUrl: string
	clientIdSecretName: string
	clientSecretSecretName: string
	scopes?: string[]
	audience?: string
	/** How to send client creds to the token endpoint. Default 'basicAuth'. */
	clientAuthMethod?: 'basicAuth' | 'requestBody'
	extraParams?: Record<string, string>
}

export type OAuth2RefreshTokenInput = {
	kind: 'oauth2RefreshToken'
	tokenUrl: string
	refreshTokenSecretName: string
	clientIdSecretName?: string
	clientSecretSecretName?: string
	scopes?: string[]
	extraParams?: Record<string, string>
}

// -----------------------------------------------------------------------------
// buildAuthConfig — factory that converts the union into an AuthConfig proto.
// -----------------------------------------------------------------------------

/**
 * Convert a workflow-author-friendly AuthConfigInput into the proto
 * AuthConfig expected by the ConfidentialHTTPRequest.
 *
 * @example
 *   const auth = buildAuthConfig({
 *     kind: 'apiKey',
 *     headerName: 'x-api-key',
 *     secretName: 'coingecko_api_key',
 *   })
 */
export function buildAuthConfig(input: AuthConfigInput): AuthConfig {
	switch (input.kind) {
		case 'apiKey':
			return authFromApiKey(input)
		case 'basic':
			return authFromBasic(input)
		case 'bearer':
			return authFromBearer(input)
		case 'hmacSha256':
			return authFromHmacSha256(input)
		case 'awsSigV4':
			return authFromAwsSigV4(input)
		case 'hmacCustom':
			return authFromHmacCustom(input)
		case 'oauth2ClientCredentials':
			return authFromOAuth2ClientCredentials(input)
		case 'oauth2RefreshToken':
			return authFromOAuth2RefreshToken(input)
	}
}

function authFromApiKey(i: ApiKeyAuthInput): AuthConfig {
	const a: ApiKeyAuth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.ApiKeyAuth',
		headerName: i.headerName,
		secretName: i.secretName,
		valuePrefix: i.valuePrefix ?? '',
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'apiKey', value: a },
	}
}

function authFromBasic(i: BasicAuthInput): AuthConfig {
	const a: BasicAuth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.BasicAuth',
		usernameSecretName: i.usernameSecretName,
		passwordSecretName: i.passwordSecretName,
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'basic', value: a },
	}
}

function authFromBearer(i: BearerAuthInput): AuthConfig {
	const a: BearerAuth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.BearerAuth',
		tokenSecretName: i.tokenSecretName,
		headerName: i.headerName ?? '',
		valuePrefix: i.valuePrefix ?? '',
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'bearer', value: a },
	}
}

function authFromHmacSha256(i: HmacSha256Input): AuthConfig {
	const v: HmacSha256 = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.HmacSha256',
		secretName: i.secretName,
		signatureHeader: i.signatureHeader ?? '',
		timestampHeader: i.timestampHeader ?? '',
		includeQuery: i.includeQuery ?? false,
		encoding: i.encoding ?? '',
	}
	const hmac: HmacAuth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.HmacAuth',
		variant: { case: 'sha256', value: v },
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'hmac', value: hmac },
	}
}

function authFromAwsSigV4(i: AwsSigV4Input): AuthConfig {
	const v: AwsSigV4 = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AwsSigV4',
		accessKeyIdSecretName: i.accessKeyIdSecretName,
		secretAccessKeySecretName: i.secretAccessKeySecretName,
		sessionTokenSecretName: i.sessionTokenSecretName ?? '',
		region: i.region,
		service: i.service,
		signedHeaders: i.signedHeaders ?? [],
		unsignedPayload: i.unsignedPayload ?? false,
	}
	const hmac: HmacAuth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.HmacAuth',
		variant: { case: 'awsSigV4', value: v },
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'hmac', value: hmac },
	}
}

function authFromHmacCustom(i: HmacCustomInput): AuthConfig {
	const v: HmacCustom = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.HmacCustom',
		secretName: i.secretName,
		canonicalTemplate: i.canonicalTemplate,
		hash: i.hash === 'sha512' ? HmacCustom_Hash.SHA512 : HmacCustom_Hash.SHA256,
		encoding: i.encoding ?? '',
		signatureHeader: i.signatureHeader,
		signaturePrefix: i.signaturePrefix ?? '',
		timestampHeader: i.timestampHeader ?? '',
		nonceHeader: i.nonceHeader ?? '',
	}
	const hmac: HmacAuth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.HmacAuth',
		variant: { case: 'custom', value: v },
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'hmac', value: hmac },
	}
}

function authFromOAuth2ClientCredentials(i: OAuth2ClientCredentialsInput): AuthConfig {
	const v: OAuth2ClientCredentials = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.OAuth2ClientCredentials',
		tokenUrl: i.tokenUrl,
		clientIdSecretName: i.clientIdSecretName,
		clientSecretSecretName: i.clientSecretSecretName,
		scopes: i.scopes ?? [],
		audience: i.audience ?? '',
		clientAuthMethod: i.clientAuthMethod === 'requestBody' ? 'request_body' : i.clientAuthMethod === 'basicAuth' ? 'basic_auth' : '',
		extraParams: i.extraParams ?? {},
	}
	const oauth: OAuth2Auth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.OAuth2Auth',
		variant: { case: 'clientCredentials', value: v },
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'oauth2', value: oauth },
	}
}

function authFromOAuth2RefreshToken(i: OAuth2RefreshTokenInput): AuthConfig {
	const v: OAuth2RefreshToken = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.OAuth2RefreshToken',
		tokenUrl: i.tokenUrl,
		refreshTokenSecretName: i.refreshTokenSecretName,
		clientIdSecretName: i.clientIdSecretName ?? '',
		clientSecretSecretName: i.clientSecretSecretName ?? '',
		scopes: i.scopes ?? [],
		extraParams: i.extraParams ?? {},
	}
	const oauth: OAuth2Auth = {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.OAuth2Auth',
		variant: { case: 'refreshToken', value: v },
	}
	return {
		$typeName: 'capabilities.networking.confidentialhttp.v1alpha.AuthConfig',
		method: { case: 'oauth2', value: oauth },
	}
}
