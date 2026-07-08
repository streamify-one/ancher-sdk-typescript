/**
 * Recommendation repository. `sdk.Recommendation` exposes plain-data reads plus
 * the per-record action operations (`save`/`dismiss`/`notInterested`), each
 * taking the recommendation id as its first argument. Lists take the
 * TypeScript-native `{ where, orderBy, … }` options (see `../contracts/query`);
 * returned recommendations are plain `Schemas.Recommendation` data (via the
 * `Recommendation` contract alias) — no model class.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod } from '../api/generated/api.client'
import type {
  Recommendation,
  RecommendationOrderBy,
  RecommendationWhere,
} from '../contracts/recommendation'
import { createListSurface, type ListSurface } from './base'

type RecommendationListEndpointQuery =
  EndpointByMethod['get']['/api/v1/recommendations/']['parameters']['query']

export interface RecommendationRepository
  extends ListSurface<Recommendation, RecommendationWhere, RecommendationOrderBy> {
  /** Save a recommendation (creates a note server-side); returns the updated recommendation. */
  save(recommendationId: string, comment?: string): Promise<Recommendation>
  /** Dismiss a recommendation; returns the updated recommendation. */
  dismiss(recommendationId: string, comment?: string): Promise<Recommendation>
  /** Mark a recommendation as "not interested"; returns the updated recommendation. */
  notInterested(recommendationId: string, comment?: string): Promise<Recommendation>
}

export function createRecommendationRepository(client: AncherClient): RecommendationRepository {
  const listSurface = createListSurface<Recommendation, RecommendationWhere, RecommendationOrderBy>(
    (query) =>
      client.api.get('/api/v1/recommendations/', {
        query: query as RecommendationListEndpointQuery,
      })
  )

  async function act(
    recommendationId: string,
    action: 'dismiss' | 'save' | 'not_interested',
    comment?: string
  ): Promise<Recommendation> {
    return await client.api.put('/api/v1/recommendations/{recommendation_id}', {
      path: { recommendation_id: recommendationId },
      body: { action, ...(comment !== undefined ? { comment } : {}) },
    })
  }

  return {
    ...listSurface,
    async save(recommendationId, comment) {
      return await act(recommendationId, 'save', comment)
    },
    async dismiss(recommendationId, comment) {
      return await act(recommendationId, 'dismiss', comment)
    },
    async notInterested(recommendationId, comment) {
      return await act(recommendationId, 'not_interested', comment)
    },
  }
}
