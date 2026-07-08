/**
 * Pinned-item repository (`/pinned`). A pinned item is a flat envelope carrying
 * exactly one of `note` / `collection` / `artifact`. Reads/creates return plain
 * `PinnedItem` data (via the contract alias) — no model class. Lists take the
 * TypeScript-native `{ where, orderBy, … }` options (see `../contracts/query`).
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type { PinnedItem, PinnedWhere, PinOrderBy } from '../contracts/pin'
import { createListSurface, type ListSurface, type Page } from './base'

type PinnedListEndpointQuery = EndpointByMethod['get']['/api/v1/pinned/']['parameters']['query']

export interface PinnedRepository extends ListSurface<PinnedItem, PinnedWhere, PinOrderBy> {
  /** Pin an entity. */
  pin(body: Schemas.PinItemRequest): Promise<PinnedItem>
  /** Reorder the full pinned list (server rewrites indices). */
  reorder(body: Schemas.PinnedItemsReorder): Promise<Page<PinnedItem>>
  /** Unpin by entity id (`DELETE`). */
  unpin(entityId: string): Promise<void>
}

export function createPinnedRepository(client: AncherClient): PinnedRepository {
  const listSurface = createListSurface<PinnedItem, PinnedWhere, PinOrderBy>((query) =>
    client.api.get('/api/v1/pinned/', {
      query: query as PinnedListEndpointQuery,
    })
  )

  return {
    ...listSurface,
    async pin(body) {
      return await client.api.post('/api/v1/pinned/', { body })
    },
    async reorder(body) {
      return await client.api.put('/api/v1/pinned/', { body })
    },
    async unpin(entityId) {
      await client.api.delete('/api/v1/pinned/{entity_id}', { path: { entity_id: entityId } })
    },
  }
}
