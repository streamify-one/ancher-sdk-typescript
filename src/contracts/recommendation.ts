/**
 * Recommendation types: entity, enums, and typed list options for the
 * external content recommendation endpoints.
 */

import type { Eq, Expect } from './assert'
import type { GetEndpointQuery, Page } from './common'
import type {
  BranchOf,
  ListOptions,
  NoOperatorCollision,
  OrderByOf,
  Where,
} from './query'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Enums.
 * ------------------------------------------------------------------------- */

/** Recommendation domain status. */
export const RecommendationStatus = {
  Active: 'active',
  Dismissed: 'dismissed',
  Saved: 'saved',
  NotInterested: 'not_interested',
} as const satisfies Record<string, Schemas.Recommendation['status']>
export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus]
/** @internal */
export type _RecommendationStatusExhaustive = Expect<
  Eq<RecommendationStatus, Schemas.Recommendation['status']>
>

/** User action applied to a recommendation (`PUT /recommendations/{id}` body `action`). */
export const RecommendationAction = {
  Dismiss: 'dismiss',
  Save: 'save',
  NotInterested: 'not_interested',
} as const satisfies Record<string, Schemas.RecommendationAction['action']>
export type RecommendationAction = (typeof RecommendationAction)[keyof typeof RecommendationAction]
/** @internal */
export type _RecommendationActionExhaustive = Expect<
  Eq<RecommendationAction, Schemas.RecommendationAction['action']>
>

/* ---------------------------------------------------------------------------
 * Recommendation entity.
 * ------------------------------------------------------------------------- */

/** A recommended piece of external content */
export type Recommendation = Schemas.Recommendation

/** Action request body for a recommendation (dismiss, save, or not_interested). */
export type RecommendationActionRequest = Schemas.RecommendationAction

/** Recommendation list response. */
export type RecommendationListResponse = Page<Recommendation>

/* ---------------------------------------------------------------------------
 * Recommendation list surface.
 * ------------------------------------------------------------------------- */

type RecommendationListEndpointQuery = GetEndpointQuery<'/api/v1/recommendations/'>

/** Typed filter for recommendation lists. */
export type RecommendationWhere = Where<BranchOf<RecommendationListEndpointQuery>>

/** Signed sort keys for recommendation lists (e.g. `'-created_at'`). */
export type RecommendationOrderBy = OrderByOf<RecommendationListEndpointQuery>

/** Options for `sdk.Recommendation.list` / `count` / `iterate`. */
export type RecommendationListOptions = ListOptions<RecommendationWhere, RecommendationOrderBy>

/** @internal */
export type _RecommendationNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<RecommendationListEndpointQuery>>
>
