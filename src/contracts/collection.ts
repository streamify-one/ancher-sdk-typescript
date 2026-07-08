/**
 * Collection types: entity, enums, and typed list options for the collection
 * endpoints, including the note / artifact / suggested-note sub-lists.
 */

import type { CollectionArtifactOrderBy } from './artifact'
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

/** Collection lifecycle status. */
export const CollectionStatus = {
  Active: 'active',
  Archived: 'archived',
} as const satisfies Record<string, Schemas.Collection['status']>
export type CollectionStatus = (typeof CollectionStatus)[keyof typeof CollectionStatus]
/** @internal */
export type _CollectionStatusExhaustive = Expect<Eq<CollectionStatus, Schemas.Collection['status']>>

/* ---------------------------------------------------------------------------
 * Collection entity.
 * ------------------------------------------------------------------------- */

/** Collection entity */
export type Collection = Schemas.Collection & Partial<{ pinned: boolean }>

/** Collection list response */
export type CollectionListResponse = Page<Collection>

/* ---------------------------------------------------------------------------
 * Collection list surface.
 * ------------------------------------------------------------------------- */

type CollectionListEndpointQuery = GetEndpointQuery<'/api/v1/collections/'>

/** Typed filter for collection lists. */
export type CollectionWhere = Where<BranchOf<CollectionListEndpointQuery>>

/** Signed sort keys for collection lists (e.g. `'-updated_at'`). */
export type CollectionOrderBy = OrderByOf<CollectionListEndpointQuery>

/** Options for `sdk.Collection.list` / `count` / `iterate`. */
export type CollectionListOptions = ListOptions<CollectionWhere, CollectionOrderBy>

/** @internal */
export type _CollectionNoOpCollision = Expect<NoOperatorCollision<BranchOf<CollectionListEndpointQuery>>>

/* ---------------------------------------------------------------------------
 * Notes in a collection (Note sub-list).
 * ------------------------------------------------------------------------- */

type CollectionNotesEndpointQuery = GetEndpointQuery<'/api/v1/collections/{collection_id}/notes'>

/** Typed filter for notes listed through a collection. */
export type CollectionNoteWhere = Where<BranchOf<CollectionNotesEndpointQuery>>

/** Signed sort keys for notes listed through a collection. */
export type CollectionNoteOrderBy = OrderByOf<CollectionNotesEndpointQuery>

/** Options for `sdk.Collection.notes`. */
export type CollectionNotesOptions = ListOptions<CollectionNoteWhere, CollectionNoteOrderBy>

/** @internal */
export type _CollectionNoteNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<CollectionNotesEndpointQuery>>
>

/* ---------------------------------------------------------------------------
 * Artifacts in a collection (Artifact sub-list). The signed sort-key union
 * `CollectionArtifactOrderBy` lives in `./artifact` (its historical home).
 * ------------------------------------------------------------------------- */

type CollectionArtifactsEndpointQuery =
  GetEndpointQuery<'/api/v1/collections/{collection_id}/artifacts'>

/** Typed filter for artifacts listed through a collection. */
export type CollectionArtifactWhere = Where<BranchOf<CollectionArtifactsEndpointQuery>>

/** Options for `sdk.Collection.artifacts`. */
export type CollectionArtifactsOptions = ListOptions<
  CollectionArtifactWhere,
  CollectionArtifactOrderBy
>

/** @internal */
export type _CollectionArtifactNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<CollectionArtifactsEndpointQuery>>
>

/* ---------------------------------------------------------------------------
 * Suggested notes for a collection (CollectionSuggestion sub-list).
 * ------------------------------------------------------------------------- */

type CollectionSuggestedNotesEndpointQuery =
  GetEndpointQuery<'/api/v1/collections/{collection_id}/suggested-notes'>

/** Typed filter for a collection's suggested-notes list. */
export type CollectionSuggestedNotesWhere = Where<BranchOf<CollectionSuggestedNotesEndpointQuery>>

/** Signed sort keys for a collection's suggested-notes list. */
export type CollectionSuggestedNotesOrderBy = OrderByOf<CollectionSuggestedNotesEndpointQuery>

/** Options for `sdk.Collection.suggestedNotes`. */
export type CollectionSuggestedNotesOptions = ListOptions<
  CollectionSuggestedNotesWhere,
  CollectionSuggestedNotesOrderBy
>

/** @internal */
export type _CollectionSuggestedNotesNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<CollectionSuggestedNotesEndpointQuery>>
>

/* ---------------------------------------------------------------------------
 * Collection create/update requests.
 * ------------------------------------------------------------------------- */

/** Create collection request */
export type CreateCollectionRequest = Schemas.CollectionCreate

/** Update collection request */
export type UpdateCollectionRequest = Schemas.CollectionUpdate & Partial<{ pinned: boolean }>

/** Set collection notes request (replaces all notes on the collection) */
export type SetCollectionNotesRequest = Schemas.CollectionNotesUpdate

/** Set collection artifacts request (replaces all artifacts on the collection) */
export type SetCollectionArtifactsRequest = Schemas.CollectionArtifactsUpdate
