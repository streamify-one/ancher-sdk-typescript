/**
 * Collection-suggestion types: entities, enums, and typed list options for the
 * AI-generated note↔collection pairing suggestion endpoints (`/suggestions`).
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

/** Suggestion review status. */
export const SuggestionStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Dismissed: 'dismissed',
} as const satisfies Record<string, Schemas.CollectionSuggestion['status']>
export type SuggestionStatus = (typeof SuggestionStatus)[keyof typeof SuggestionStatus]
/** @internal */
export type _SuggestionStatusExhaustive = Expect<
  Eq<SuggestionStatus, Schemas.CollectionSuggestion['status']>
>

/**
 * The terminal statuses a suggestion can be resolved to — the `PATCH` update
 * body's `status`. A suggestion can never be moved back to `pending`.
 */
export type SuggestionResolution = Exclude<SuggestionStatus, 'pending'>
/** @internal */
export type _SuggestionResolutionExhaustive = Expect<
  Eq<SuggestionResolution, Schemas.SuggestionUpdate['status']>
>

/* ---------------------------------------------------------------------------
 * Suggestion entity.
 * ------------------------------------------------------------------------- */

/** A suggested note↔collection pairing */
export type CollectionSuggestion = Schemas.CollectionSuggestion

/** Suggestion list response */
export type SuggestionListResponse = Page<CollectionSuggestion>

/** Update suggestion request (accept or dismiss) */
export type SuggestionUpdate = Schemas.SuggestionUpdate

/* ---------------------------------------------------------------------------
 * Suggestion list surface.
 * ------------------------------------------------------------------------- */

type SuggestionListEndpointQuery = GetEndpointQuery<'/api/v1/suggestions/'>

/** Typed filter for suggestion lists. */
export type SuggestionWhere = Where<BranchOf<SuggestionListEndpointQuery>>

/** Signed sort keys for suggestion lists (e.g. `'-created_at'`, `'-confidence'`). */
export type SuggestionOrderBy = OrderByOf<SuggestionListEndpointQuery>

/** Options for `sdk.Suggestion.list` / `count` / `iterate`. */
export type SuggestionListOptions = ListOptions<SuggestionWhere, SuggestionOrderBy>

/** @internal */
export type _SuggestionNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<SuggestionListEndpointQuery>>
>
