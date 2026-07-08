/**
 * External-connection type + repository (`/external-connections`) — OAuth
 * provider links (begin authorization, list, disconnect).
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'

/** Provider path param for the authorization endpoint. */
export type ConnectionProvider =
  EndpointByMethod['post']['/api/v1/external-connections/{provider}/authorization']['parameters']['path']['provider']

export type Connection = Schemas.ConnectionSummary

export interface ConnectionRepository {
  /**
   * Begin connecting a provider — returns the `authorize_url` for the host to
   * open. The provider's callback completes the link server-side.
   */
  connect(
    provider: ConnectionProvider,
    body?: Schemas.BeginConnectRequest
  ): Promise<Schemas.BeginConnectResponse>
  /** List the current user's external connections. */
  list(): Promise<Connection[]>
  /** Disconnect a connection (`DELETE`). */
  delete(id: string): Promise<void>
}

export function createConnectionRepository(client: AncherClient): ConnectionRepository {
  return {
    async list() {
      return await client.api.get('/api/v1/external-connections')
    },
    async connect(provider, body) {
      return client.api.post('/api/v1/external-connections/{provider}/authorization', {
        path: { provider },
        body: body ?? {},
      })
    },
    async delete(id) {
      await client.api.delete('/api/v1/external-connections/{connection_id}', {
        path: { connection_id: id },
      })
    },
  }
}
