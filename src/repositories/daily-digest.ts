/**
 * Daily-digest repository. `sdk.DailyDigest` is read-only — the API exposes a
 * criteria list and a get-by-id, and nothing else; digests are generated
 * server-side on a schedule. Lists take the TypeScript-native
 * `{ where, orderBy, … }` options (see `../contracts/query`); returned digests
 * are plain `Schemas.DailyDigest` data (via the `DailyDigest` contract alias) —
 * no model class.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod } from '../api/generated/api.client'
import type { DailyDigest, DailyDigestOrderBy, DailyDigestWhere } from '../contracts/daily-digest'
import { createListSurface, type ListSurface } from './base'

type DailyDigestListEndpointQuery =
  EndpointByMethod['get']['/api/v1/daily-digests/']['parameters']['query']

export interface DailyDigestRepository
  extends ListSurface<DailyDigest, DailyDigestWhere, DailyDigestOrderBy> {
  /** Get a daily digest by id. */
  get(digestId: string): Promise<DailyDigest>
}

export function createDailyDigestRepository(client: AncherClient): DailyDigestRepository {
  const listSurface = createListSurface<DailyDigest, DailyDigestWhere, DailyDigestOrderBy>(query =>
    client.api.get('/api/v1/daily-digests/', {
      query: query as DailyDigestListEndpointQuery,
    })
  )

  return {
    ...listSurface,

    async get(digestId) {
      return await client.api.get('/api/v1/daily-digests/{digest_id}', {
        path: { digest_id: digestId },
      })
    },
  }
}
