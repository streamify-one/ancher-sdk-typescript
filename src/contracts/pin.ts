/**
 * Pinned-item types: entities, enums, and typed list options for the
 * `/pinned` endpoints. The `/pinned` list embeds the full underlying entity
 * per pin; we model the embedded slots with the app's (augmented) entity
 * types so the sidebar rows can use them directly.
 */

import type { Artifact } from './artifact'
import type { Eq, Expect } from './assert'
import type { Collection } from './collection'
import type { GetEndpointQuery } from './common'
import type { Note } from './note'
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

/** Type of the entity a pin points at. */
export const PinType = {
  Note: 'note',
  Collection: 'collection',
  Artifact: 'artifact',
} as const satisfies Record<string, Schemas.PinnedItemEnvelope['type']>
export type PinType = (typeof PinType)[keyof typeof PinType]
/** @internal */
export type _PinTypeExhaustive = Expect<Eq<PinType, Schemas.PinnedItemEnvelope['type']>>

/* ---------------------------------------------------------------------------
 * Pinned-item entity + requests.
 * ------------------------------------------------------------------------- */

/**
 * A single pinned item. Exactly one of `note` / `collection` / `artifact` is
 * populated, selected by `type`; the shape is flat so the list renders with a
 * single `switch (item.type)`.
 */
export interface PinnedItem {
  artifact: Artifact | null
  collection: Collection | null
  entity_id: string
  /** Position in the pinned list; lower comes first. */
  index: number
  note: Note | null
  type: PinType
}

/** `POST /pinned` body. */
export type PinItemRequest = Schemas.PinItemRequest

/** Raw `GET /pinned` and `PUT /pinned` response (envelopes embed raw schemas). */
export type PinListResponse = Schemas.Page_PinnedItemEnvelope_

/** One entry in the `PUT /pinned` reorder body. */
export type ReorderPinEntry = Schemas.PinnedItemReorderEntry

/** `PUT /pinned` body — every currently-pinned item, in the new order. */
export type ReorderPinsRequest = Schemas.PinnedItemsReorder

/* ---------------------------------------------------------------------------
 * Pinned-item list surface.
 * ------------------------------------------------------------------------- */

type PinnedListEndpointQuery = GetEndpointQuery<'/api/v1/pinned/'>

/** Typed filter for pinned-item lists. */
export type PinnedWhere = Where<BranchOf<PinnedListEndpointQuery>>

/** Signed sort keys for pinned-item lists (e.g. `'+index'`). */
export type PinOrderBy = OrderByOf<PinnedListEndpointQuery>

/** Options for `sdk.Pinned.list` / `count` / `iterate`. */
export type PinnedListOptions = ListOptions<PinnedWhere, PinOrderBy>

/** @internal */
export type _PinnedNoOpCollision = Expect<NoOperatorCollision<BranchOf<PinnedListEndpointQuery>>>
