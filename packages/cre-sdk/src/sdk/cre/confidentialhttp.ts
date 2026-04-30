// Ergonomic helpers for the confidentialHTTP capability's AuthConfig.
//
// Building the AuthConfig oneof variants by hand is verbose; these helpers
// let workflow authors describe the signing method via a discriminated union
// and produce the matching proto-JSON structure that fits straight into a
// ConfidentialHTTPRequestJson.auth field.
//
// Every SecretIdentifier referenced inside an AuthConfigInput must also
// appear in vaultDonSecrets (the capability validator enforces this).

import type {
	ApiKeyAuthJson,
	AuthConfigJson,
	AwsSigV4Json,
	BasicAuthJson,
	BearerAuthJson,
	HmacAuthJson,
	HmacCustomJson,
	HmacSha256Json,
	OAuth2AuthJson,
	OAuth2ClientCredentialsJson,
	OAuth2RefreshTokenJson,
	SecretIdentifierJson,
	StringOrSecretJson,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'

// -----------------------------------------------------------------------------
// Input types
// -----------------------------------------------------------------------------

/** A reference to a Vault DON secret. */
export type SecretRef = {
	key: string
	namespace?: string
	owner?: string
}

/** A field that may carry either a plain string or a Vault secret. */
export type StringOrSecretInput = string | SecretRef

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
	/** Vault secret carrying the API key value. */
	secret: SecretRef
	/** Optional prefix, e.g. "ApiKey " or "Token ". Default: empty. */
	valuePrefix?: string
}

export type BasicAuthInput = {
	kind: 'basic'
	username: StringOrSecretInput
	password: SecretRef
}

export type BearerAuthInput = {
	kind: 'bearer'
	token: SecretRef
	/** Default "Authorization". */
	headerName?: string
	/** Default "Bearer ". */
	valuePrefix?: string
}

export type HmacSha256Input = {
	kind: 'hmacSha256'
	secret: SecretRef
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
	accessKeyId: StringOrSecretInput
	secretAccessKey: SecretRef
	sessionToken?: SecretRef
	region: string
	service: string
	signedHeaders?: string[]
	unsignedPayload?: boolean
}

export type HmacCustomInput = {
	kind: 'hmacCustom'
	secret: SecretRef
	canonicalTemplate: string
	hash: 'sha256' | 'sha512'
	encoding?: 'hex' | 'base64'
	signatureHeader: string
	signaturePrefix?: string
	timestampHeader?: string
	nonceHeader?: string
}

export type OAuth2ClientCredentialsInput = {
	kind: 'oauth2ClientCredentials'
	tokenUrl: string
	clientId: StringOrSecretInput
	clientSecret: SecretRef
	scopes?: string[]
	audience?: string
	clientAuthMethod?: 'basicAuth' | 'requestBody'
	extraParams?: Record<string, string>
}

export type OAuth2RefreshTokenInput = {
	kind: 'oauth2RefreshToken'
	tokenUrl: string
	refreshToken: SecretRef
	clientId?: StringOrSecretInput
	clientSecret?: SecretRef
	scopes?: string[]
	extraParams?: Record<string, string>
}

// -----------------------------------------------------------------------------
// Conversion helpers
// -----------------------------------------------------------------------------

function toSecretIdentifierJson(ref: SecretRef): SecretIdentifierJson {
	const out: SecretIdentifierJson = { key: ref.key }
	if (ref.namespace !== undefined) out.namespace = ref.namespace
	if (ref.owner !== undefined) out.owner = ref.owner
	return out
}

function toStringOrSecretJson(value: StringOrSecretInput): StringOrSecretJson {
	if (typeof value === 'string') {
		return { plain: value }
	}
	return { secret: toSecretIdentifierJson(value) }
}

// -----------------------------------------------------------------------------
// buildAuthConfig — factory that converts the union into an AuthConfigJson.
// -----------------------------------------------------------------------------

/**
 * Convert a workflow-author-friendly AuthConfigInput into the proto-JSON
 * AuthConfig expected by `ConfidentialHTTPRequestJson.auth`.
 *
 * @example
 *   const auth = buildAuthConfig({
 *     kind: 'apiKey',
 *     headerName: 'x-api-key',
 *     secret: { key: 'coingecko_api_key' },
 *   })
 *   client.sendRequest(runtime, { request, vaultDonSecrets, auth })
 */
export function buildAuthConfig(input: AuthConfigInput): AuthConfigJson {
	switch (input.kind) {
		case 'apiKey':
			return { apiKey: apiKeyJson(input) }
		case 'basic':
			return { basic: basicJson(input) }
		case 'bearer':
			return { bearer: bearerJson(input) }
		case 'hmacSha256':
			return { hmac: { sha256: hmacSha256Json(input) } satisfies HmacAuthJson }
		case 'awsSigV4':
			return { hmac: { awsSigV4: awsSigV4Json(input) } satisfies HmacAuthJson }
		case 'hmacCustom':
			return { hmac: { custom: hmacCustomJson(input) } satisfies HmacAuthJson }
		case 'oauth2ClientCredentials':
			return {
				oauth2: { clientCredentials: oauth2ClientCredentialsJson(input) } satisfies OAuth2AuthJson,
			}
		case 'oauth2RefreshToken':
			return { oauth2: { refreshToken: oauth2RefreshTokenJson(input) } satisfies OAuth2AuthJson }
	}
}

function apiKeyJson(i: ApiKeyAuthInput): ApiKeyAuthJson {
	return {
		headerName: i.headerName,
		secret: toSecretIdentifierJson(i.secret),
		valuePrefix: i.valuePrefix ?? '',
	}
}

function basicJson(i: BasicAuthInput): BasicAuthJson {
	return {
		username: toStringOrSecretJson(i.username),
		password: toSecretIdentifierJson(i.password),
	}
}

function bearerJson(i: BearerAuthInput): BearerAuthJson {
	return {
		token: toSecretIdentifierJson(i.token),
		headerName: i.headerName ?? '',
		valuePrefix: i.valuePrefix ?? '',
	}
}

function hmacSha256Json(i: HmacSha256Input): HmacSha256Json {
	return {
		secret: toSecretIdentifierJson(i.secret),
		signatureHeader: i.signatureHeader ?? '',
		timestampHeader: i.timestampHeader ?? '',
		includeQuery: i.includeQuery ?? false,
		encoding: i.encoding ?? '',
	}
}

function awsSigV4Json(i: AwsSigV4Input): AwsSigV4Json {
	const out: AwsSigV4Json = {
		accessKeyId: toStringOrSecretJson(i.accessKeyId),
		secretAccessKey: toSecretIdentifierJson(i.secretAccessKey),
		region: i.region,
		service: i.service,
		signedHeaders: i.signedHeaders ?? [],
		unsignedPayload: i.unsignedPayload ?? false,
	}
	if (i.sessionToken) out.sessionToken = toSecretIdentifierJson(i.sessionToken)
	return out
}

function hmacCustomJson(i: HmacCustomInput): HmacCustomJson {
	return {
		secret: toSecretIdentifierJson(i.secret),
		canonicalTemplate: i.canonicalTemplate,
		hash: i.hash === 'sha512' ? 'HASH_SHA512' : 'HASH_SHA256',
		encoding: i.encoding ?? '',
		signatureHeader: i.signatureHeader,
		signaturePrefix: i.signaturePrefix ?? '',
		timestampHeader: i.timestampHeader ?? '',
		nonceHeader: i.nonceHeader ?? '',
	}
}

function oauth2ClientCredentialsJson(
	i: OAuth2ClientCredentialsInput,
): OAuth2ClientCredentialsJson {
	return {
		tokenUrl: i.tokenUrl,
		clientId: toStringOrSecretJson(i.clientId),
		clientSecret: toSecretIdentifierJson(i.clientSecret),
		scopes: i.scopes ?? [],
		audience: i.audience ?? '',
		clientAuthMethod:
			i.clientAuthMethod === 'requestBody'
				? 'request_body'
				: i.clientAuthMethod === 'basicAuth'
					? 'basic_auth'
					: '',
		extraParams: i.extraParams ?? {},
	}
}

function oauth2RefreshTokenJson(i: OAuth2RefreshTokenInput): OAuth2RefreshTokenJson {
	const out: OAuth2RefreshTokenJson = {
		tokenUrl: i.tokenUrl,
		refreshToken: toSecretIdentifierJson(i.refreshToken),
		scopes: i.scopes ?? [],
		extraParams: i.extraParams ?? {},
	}
	if (i.clientId !== undefined) out.clientId = toStringOrSecretJson(i.clientId)
	if (i.clientSecret !== undefined) out.clientSecret = toSecretIdentifierJson(i.clientSecret)
	return out
}
