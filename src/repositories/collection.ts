/**
 * Collection repository (`/collections`), including the note/artifact
 * membership sub-resources. Lists take the TypeScript-native
 * `{ where, orderBy, … }` options (see `../contracts/query`); list
 * sub-resources return plain paged data (`Schemas.Page_Note_`,
 * `Schemas.Page_Artifact_`, `Schemas.Page_CollectionSuggestion_`).
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type {
  Collection,
  CollectionArtifactsOptions,
  CollectionNotesOptions,
  CollectionOrderBy,
  CollectionSuggestedNotesOptions,
  CollectionWhere,
} from '../contracts/collection'
import { createListSurface, type ListSurface } from './base'
import { buildListQuery } from './query'

type CollectionListEndpointQuery =
  EndpointByMethod['get']['/api/v1/collections/']['parameters']['query']
type CollectionNotesEndpointQuery =
  EndpointByMethod['get']['/api/v1/collections/{collection_id}/notes']['parameters']['query']
type CollectionArtifactsEndpointQuery =
  EndpointByMethod['get']['/api/v1/collections/{collection_id}/artifacts']['parameters']['query']
type CollectionSuggestedNotesEndpointQuery =
  EndpointByMethod['get']['/api/v1/collections/{collection_id}/suggested-notes']['parameters']['query']

export interface CollectionRepository
  extends ListSurface<Collection, CollectionWhere, CollectionOrderBy> {
  /** Create a collection. */
  create(body: Schemas.CollectionCreate): Promise<Collection>
  /** Get a collection by id. */
  get(collectionId: string): Promise<Collection>
  /** Update a collection (`PATCH`). */
  update(collectionId: string, patch: Schemas.CollectionUpdate): Promise<Collection>
  /** Delete a collection (`DELETE`). */
  delete(collectionId: string): Promise<void>
  /** Add a note to a collection. */
  addNote(collectionId: string, noteId: string): Promise<Collection>
  /** Replace the full set of notes in a collection. */
  setNotes(collectionId: string, noteIds: string[]): Promise<Collection>
  /** Remove a note from a collection. */
  removeNote(collectionId: string, noteId: string): Promise<void>
  /** List the notes in a collection (paginated). */
  notes(collectionId: string, options?: CollectionNotesOptions): Promise<Schemas.Page_Note_>
  /** Add an artifact to a collection. */
  addArtifact(collectionId: string, artifactId: string): Promise<Collection>
  /** Replace the full set of artifacts in a collection. */
  setArtifacts(collectionId: string, artifactIds: string[]): Promise<Collection>
  /** Remove an artifact from a collection. */
  removeArtifact(collectionId: string, artifactId: string): Promise<void>
  /** List the artifacts in a collection (paginated). */
  artifacts(
    collectionId: string,
    options?: CollectionArtifactsOptions
  ): Promise<Schemas.Page_Artifact_>
  /** List suggested notes for a collection (paginated). */
  suggestedNotes(
    collectionId: string,
    options?: CollectionSuggestedNotesOptions
  ): Promise<Schemas.Page_CollectionSuggestion_>
}

export function createCollectionRepository(client: AncherClient): CollectionRepository {
  const listSurface = createListSurface<Collection, CollectionWhere, CollectionOrderBy>((query) =>
    client.api.get('/api/v1/collections/', {
      query: query as CollectionListEndpointQuery,
    })
  )

  return {
    ...listSurface,
    async get(collectionId) {
      return await client.api.get('/api/v1/collections/{collection_id}', {
        path: { collection_id: collectionId },
      })
    },
    async create(body) {
      return await client.api.post('/api/v1/collections/', { body })
    },
    async update(collectionId, patch) {
      return await client.api.patch('/api/v1/collections/{collection_id}', {
        path: { collection_id: collectionId },
        body: patch,
      })
    },
    async delete(collectionId) {
      await client.api.delete('/api/v1/collections/{collection_id}', {
        path: { collection_id: collectionId },
      })
    },
    async addNote(collectionId, noteId) {
      return await client.api.post('/api/v1/collections/{collection_id}/notes', {
        path: { collection_id: collectionId },
        body: { note_id: noteId },
      })
    },
    async setNotes(collectionId, noteIds) {
      return await client.api.put('/api/v1/collections/{collection_id}/notes', {
        path: { collection_id: collectionId },
        body: { note_ids: noteIds },
      })
    },
    async removeNote(collectionId, noteId) {
      await client.api.delete('/api/v1/collections/{collection_id}/notes/{note_id}', {
        path: { collection_id: collectionId, note_id: noteId },
      })
    },
    async notes(collectionId, options) {
      return await client.api.get('/api/v1/collections/{collection_id}/notes', {
        path: { collection_id: collectionId },
        query: buildListQuery(options) as CollectionNotesEndpointQuery,
      })
    },
    async addArtifact(collectionId, artifactId) {
      return await client.api.post('/api/v1/collections/{collection_id}/artifacts', {
        path: { collection_id: collectionId },
        body: { artifact_id: artifactId },
      })
    },
    async setArtifacts(collectionId, artifactIds) {
      return await client.api.put('/api/v1/collections/{collection_id}/artifacts', {
        path: { collection_id: collectionId },
        body: { artifact_ids: artifactIds },
      })
    },
    async removeArtifact(collectionId, artifactId) {
      await client.api.delete('/api/v1/collections/{collection_id}/artifacts/{artifact_id}', {
        path: { collection_id: collectionId, artifact_id: artifactId },
      })
    },
    async artifacts(collectionId, options) {
      return await client.api.get('/api/v1/collections/{collection_id}/artifacts', {
        path: { collection_id: collectionId },
        query: buildListQuery(options) as CollectionArtifactsEndpointQuery,
      })
    },
    async suggestedNotes(collectionId, options) {
      return await client.api.get('/api/v1/collections/{collection_id}/suggested-notes', {
        path: { collection_id: collectionId },
        query: buildListQuery(options) as CollectionSuggestedNotesEndpointQuery,
      })
    },
  }
}
