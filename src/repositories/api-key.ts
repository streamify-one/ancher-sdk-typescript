/**
 * API key repository (`/users/me/api-keys`). `create` returns the raw
 * `ApiKeyCreateResponse` because it carries the plaintext secret exactly once —
 * it is intentionally not a persisted model.
 */

import type { AncherClient } from '../api/client'
import type { Schemas } from '../api/generated/api.client'
import type { ApiKey } from '../contracts/api-key'

export interface ApiKeyRepository {
  /**
   * Create an API key. The response carries the plaintext `api_key` **once** —
   * surface it immediately and never persist it. Returns the raw response.
   */
  create(body: Schemas.ApiKeyCreateRequest): Promise<Schemas.ApiKeyCreateResponse>
  /** List API keys (metadata only — secrets are never returned after creation). */
  list(): Promise<ApiKey[]>
  /** Revoke an API key by id (`DELETE`). */
  delete(id: string): Promise<void>
}

export function createApiKeyRepository(client: AncherClient): ApiKeyRepository {
  return {
    async list() {
      return await client.api.get('/api/v1/users/me/api-keys')
    },
    async create(body) {
      return await client.api.post('/api/v1/users/me/api-keys', { body })
    },
    async delete(id) {
      await client.api.delete('/api/v1/users/me/api-keys/{api_key_id}', {
        path: { api_key_id: id },
      })
    },
  }
}
