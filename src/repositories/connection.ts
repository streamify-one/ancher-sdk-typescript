/**
 * External-connection type + repository (`/external-connections`) — OAuth
 * provider links (begin authorization, claim, list, disconnect).
 *
 * Connecting is a two-phase handshake: `connect` starts it and the provider's
 * public callback only *stages* the credentials, then `claim` redeems the
 * one-time token it returns. See `connect` for why the split exists.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'

/** Provider path param for the authorization endpoint. */
export type ConnectionProvider =
  EndpointByMethod['post']['/api/v1/external-connections/{provider}/authorization']['parameters']['path']['provider']

export type Connection = Schemas.ConnectionSummary

export interface ConnectionRepository {
  /**
   * Redeem the completion token the callback handed back, creating the durable
   * connection. Phase two of the handshake — see `connect`.
   */
  claim(completionToken: string): Promise<Connection>
  /**
   * Begin connecting a provider — returns the `authorize_url` for the host to
   * open.
   *
   * This does NOT finish the link. The provider's callback is unauthenticated
   * (a native app's consent runs in an isolated browser that carries no
   * session), so it only stages the credentials and hands back a one-time
   * `completion_token`. Pass that to `claim` from an authenticated client to
   * actually create the connection; requiring both is what stops a phished
   * callback from granting anyone a link.
   *
   * How the token gets back to you depends on `redirect_after_uri`. Set it and
   * the API redirects there with `?completion_token=` — what the web app does,
   * and what a native app reads off its deep link. Leave it unset and the API
   * instead renders a popup bridge page that `postMessage`s the token to
   * `window.opener`, which only works if the opener reference still exists.
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
    async claim(completionToken) {
      return client.api.post('/api/v1/external-connections', {
        body: { completion_token: completionToken },
      })
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
