/**
 * Collection-suggestion repository (`/suggestions`). `sdk.Suggestion` exposes
 * plain-data reads plus the per-record operations (`update`/`accept`/`dismiss`),
 * each taking the suggestion id as its first argument, and the batch
 * accept/dismiss operations. Lists take the TypeScript-native
 * `{ where, orderBy, … }` options (see `../contracts/query`); returned
 * suggestions are plain `Schemas.CollectionSuggestion` data (via the
 * `Suggestion` contract alias) — no model class.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type {
  CollectionSuggestion,
  SuggestionOrderBy,
  SuggestionWhere,
} from '../contracts/suggestion'
import { createListSurface, type ListSurface } from './base'

/** Plain suggestion entity returned by the repository (alias of {@link CollectionSuggestion}). */
export type Suggestion = CollectionSuggestion

type SuggestionListEndpointQuery =
  EndpointByMethod['get']['/api/v1/suggestions/']['parameters']['query']

export interface SuggestionRepository
  extends ListSurface<Suggestion, SuggestionWhere, SuggestionOrderBy> {
  /** Accept many suggestions by id (batch). Returns the per-id result map. */
  acceptMany(ids: string[]): Promise<Record<string, Schemas.SuggestionBatchResult>>
  /** Dismiss many suggestions by id (batch). Returns the per-id result map. */
  dismissMany(ids: string[]): Promise<Record<string, Schemas.SuggestionBatchResult>>
  /** Update a suggestion's status (`PATCH`); returns the updated suggestion. */
  update(suggestionId: string, body: Schemas.SuggestionUpdate): Promise<Suggestion>
  /** Accept a suggestion (`PATCH` status → accepted); returns the updated suggestion. */
  accept(suggestionId: string): Promise<Suggestion>
  /** Dismiss a suggestion (`PATCH` status → dismissed); returns the updated suggestion. */
  dismiss(suggestionId: string): Promise<Suggestion>
}

export function createSuggestionRepository(client: AncherClient): SuggestionRepository {
  const listSurface = createListSurface<Suggestion, SuggestionWhere, SuggestionOrderBy>((query) =>
    client.api.get('/api/v1/suggestions/', {
      query: query as SuggestionListEndpointQuery,
    })
  )

  return {
    ...listSurface,
    async acceptMany(ids) {
      return await client.api.post('/api/v1/suggestions/acceptances', { body: ids })
    },
    async dismissMany(ids) {
      return await client.api.post('/api/v1/suggestions/dismissals', { body: ids })
    },
    async update(suggestionId, body) {
      return await client.api.patch('/api/v1/suggestions/{suggestion_id}', {
        path: { suggestion_id: suggestionId },
        body,
      })
    },
    async accept(suggestionId) {
      return await client.api.patch('/api/v1/suggestions/{suggestion_id}', {
        path: { suggestion_id: suggestionId },
        body: { status: 'accepted' },
      })
    },
    async dismiss(suggestionId) {
      return await client.api.patch('/api/v1/suggestions/{suggestion_id}', {
        path: { suggestion_id: suggestionId },
        body: { status: 'dismissed' },
      })
    },
  }
}
