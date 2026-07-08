/**
 * Tag repository. `sdk.Tag` exposes plain-data creates plus the per-record
 * operations (`update`/`delete`), each taking the tag id as its first
 * argument. Lists take the TypeScript-native `{ where, orderBy, … }` options
 * (see `../contracts/query`); returned tags are plain `Schemas.Tag` data (via
 * the `Tag` contract alias) — no model class.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type { Tag, TagOrderBy, TagWhere } from '../contracts/note'
import { createListSurface, type ListSurface } from './base'

type TagListEndpointQuery = EndpointByMethod['get']['/api/v1/tags/']['parameters']['query']

export interface TagRepository extends ListSurface<Tag, TagWhere, TagOrderBy> {
  /** Create a tag. */
  create(body: Schemas.TagCreate): Promise<Tag>
  /** Update a tag (`PATCH`); returns the updated tag. */
  update(tagId: string, patch: Schemas.TagUpdate): Promise<Tag>
  /** Delete a tag (`DELETE`). */
  delete(tagId: string): Promise<void>
}

export function createTagRepository(client: AncherClient): TagRepository {
  const listSurface = createListSurface<Tag, TagWhere, TagOrderBy>((query) =>
    client.api.get('/api/v1/tags/', {
      query: query as TagListEndpointQuery,
    })
  )

  return {
    ...listSurface,
    async create(body) {
      return await client.api.post('/api/v1/tags/', { body })
    },
    async update(tagId, patch) {
      return await client.api.patch('/api/v1/tags/{tag_id}', {
        path: { tag_id: tagId },
        body: patch,
      })
    },
    async delete(tagId) {
      await client.api.delete('/api/v1/tags/{tag_id}', { path: { tag_id: tagId } })
    },
  }
}
