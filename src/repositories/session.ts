/**
 * Active-session repository (`/sessions`) — the user's logged-in sessions
 * across devices (distinct from the auth `session` preset). `sdk.Session`
 * exposes the typed list surface (`list`/`count`/`iterate`), the current
 * token session's info (`current`, `GET /session`), and the per-record
 * `revoke` operation, which takes the session id as its first argument.
 * Lists take the TypeScript-native `{ where, orderBy, … }` options
 * (see `../contracts/query`); returned sessions are plain
 * `Schemas.UserSession` data — no model class.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type { SessionOrderBy, SessionWhere } from '../contracts/auth'
import { createListSurface, type ListSurface } from './base'

/** Active user session entity (`Schemas.UserSession`). */
export type Session = Schemas.UserSession

type SessionListEndpointQuery = EndpointByMethod['get']['/api/v1/sessions']['parameters']['query']

export interface SessionRepository extends ListSurface<Session, SessionWhere, SessionOrderBy> {
  /**
   * Info about the current token session (`GET /session` — native/CLI bearer
   * auth; for the browser cookie session use `sdk.WebSession.current`).
   */
  current(): Promise<Schemas.UserSessionResponse>
  /** Revoke a session (`DELETE`). */
  revoke(sessionId: string): Promise<void>
  /** Revoke all sessions. */
  revokeAll(): Promise<void>
}

export function createSessionRepository(client: AncherClient): SessionRepository {
  const listSurface = createListSurface<Session, SessionWhere, SessionOrderBy>((query) =>
    client.api.get('/api/v1/sessions', {
      query: query as SessionListEndpointQuery,
    })
  )

  return {
    ...listSurface,
    async current() {
      return await client.api.get('/api/v1/session')
    },
    async revoke(sessionId) {
      await client.api.delete('/api/v1/sessions/{session_id}', {
        path: { session_id: sessionId },
      })
    },
    async revokeAll() {
      await client.api.delete('/api/v1/sessions')
    },
  }
}
