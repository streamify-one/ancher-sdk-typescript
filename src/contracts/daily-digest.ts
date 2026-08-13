/**
 * Daily-digest types: entity, enums, and typed list options for the daily
 * digest endpoints.
 *
 * A digest is a generated podcast: `summary` is the formatted transcript and
 * `file` is the generated audio, presigned at the router boundary. Note the
 * list endpoint's `order_by` union has **no `digest_date`** key — sort newest
 * first with `'-created_at'` (`generated_at` is nullable and sorts unreliably).
 */

import type { Eq, Expect } from './assert'
import type { GetEndpointQuery, Page } from './common'
import type { BranchOf, ListOptions, NoOperatorCollision, OrderByOf, Where } from './query'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Enums.
 * ------------------------------------------------------------------------- */

/**
 * Daily-digest generation status.
 *
 * Lives here rather than in `./notification` (where it started, because the
 * notification envelope embeds a digest): `contracts/index.ts` re-exports every
 * module with `export *`, and TypeScript silently *omits* an ambiguous
 * star-export rather than erroring — so declaring this in two modules would
 * make `import { DailyDigestStatus } from '@ancher-ai/sdk/contracts'` resolve
 * to nothing, with no diagnostic anywhere.
 */
export const DailyDigestStatus = {
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
} as const satisfies Record<string, Schemas.DailyDigest['status']>
export type DailyDigestStatus = (typeof DailyDigestStatus)[keyof typeof DailyDigestStatus]
/** @internal */
export type _DailyDigestStatusExhaustive = Expect<
  Eq<DailyDigestStatus, Schemas.DailyDigest['status']>
>

/* ---------------------------------------------------------------------------
 * Daily digest entity.
 * ------------------------------------------------------------------------- */

/** A generated daily digest podcast — transcript, key points, audio, and sources. */
export type DailyDigest = Schemas.DailyDigest

/** Daily-digest list response. */
export type DailyDigestListResponse = Page<DailyDigest>

/* ---------------------------------------------------------------------------
 * Daily digest list surface.
 * ------------------------------------------------------------------------- */

type DailyDigestListEndpointQuery = GetEndpointQuery<'/api/v1/daily-digests/'>

/** Typed filter for daily-digest lists. */
export type DailyDigestWhere = Where<BranchOf<DailyDigestListEndpointQuery>>

/** Signed sort keys for daily-digest lists (e.g. `'-created_at'`). */
export type DailyDigestOrderBy = OrderByOf<DailyDigestListEndpointQuery>

/** Options for `sdk.DailyDigest.list` / `count` / `iterate`. */
export type DailyDigestListOptions = ListOptions<DailyDigestWhere, DailyDigestOrderBy>

/** @internal */
export type _DailyDigestNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<DailyDigestListEndpointQuery>>
>
