/**
 * API Key API Types
 *
 * Types for personal access tokens (API keys) — headless / CLI / agent access.
 * Management only (create / list / revoke); not a web-app login method.
 */

import type { Schemas } from './schemas'

/** API key metadata — never includes the secret. */
export type ApiKey = Schemas.ApiKeyResponse

/** Creation response — carries the plaintext key, returned exactly once. */
export type ApiKeyWithSecret = Schemas.ApiKeyCreateResponse

/** Body for creating an API key. */
export type CreateApiKeyRequest = Schemas.ApiKeyCreateRequest
