/**
 * Notification API Types
 *
 * In-app notification envelopes, discriminated on `type`, plus the enums and
 * typed list options for the notification endpoints.
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

type NotificationListEndpointQuery = GetEndpointQuery<'/api/v1/notifications/'>

/* ---------------------------------------------------------------------------
 * Enums.
 * ------------------------------------------------------------------------- */

/**
 * Wire literal union for the notification `type` discriminator. Codegen widens
 * the envelopes' `type` field to plain `string`, so the list criteria's
 * exact-match union is the generated source of truth to drift-check against.
 */
type NotificationTypeWire = NonNullable<NonNullable<NotificationListEndpointQuery['type']>['eq']>

/** Notification type discriminator. */
export const NotificationType = {
  CollectionSuggestion: 'collection_suggestion',
  ContentRecommendation: 'content_recommendation',
  DailyDigest: 'daily_digest',
  System: 'system',
} as const satisfies Record<string, NotificationTypeWire>
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]
/** @internal */
export type _NotificationTypeExhaustive = Expect<Eq<NotificationType, NotificationTypeWire>>

/** Notification inbox state. */
export const NotificationStatus = {
  Unread: 'unread',
  Read: 'read',
  Dismissed: 'dismissed',
} as const satisfies Record<string, Schemas.SystemEnvelope['status']>
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus]
/** @internal */
export type _NotificationStatusSystemExhaustive = Expect<
  Eq<NotificationStatus, Schemas.SystemEnvelope['status']>
>
/** @internal */
export type _NotificationStatusSuggestionExhaustive = Expect<
  Eq<NotificationStatus, Schemas.CollectionSuggestionEnvelope['status']>
>
/** @internal */
export type _NotificationStatusRecommendationExhaustive = Expect<
  Eq<NotificationStatus, Schemas.ContentRecommendationEnvelope['status']>
>
/** @internal */
export type _NotificationStatusDigestExhaustive = Expect<
  Eq<NotificationStatus, Schemas.DailyDigestEnvelope['status']>
>

/**
 * Writable notification inbox states — the `PATCH` body union. A notification
 * can be marked `read`/`dismissed` but never moved back to `unread`.
 */
export type NotificationStatusUpdate = Exclude<NotificationStatus, 'unread'>
/** @internal */
export type _NotificationStatusUpdateExhaustive = Expect<
  Eq<NotificationStatusUpdate, Schemas.NotificationStatusUpdate['status']>
>

// `DailyDigestStatus` lives in `./daily-digest` alongside the entity it belongs
// to. It cannot also be declared here — `contracts/index.ts` star-exports every
// module, and an ambiguous star-export is silently dropped from the barrel.

/* ---------------------------------------------------------------------------
 * Notification entity (envelope union).
 * ------------------------------------------------------------------------- */

// The generated envelopes widen the `type` discriminator to `string`, so each
// alias narrows it back to its literal to restore the discriminated union.

/** Notification carrying an AI collection suggestion */
export type CollectionSuggestionNotification = Omit<
  Schemas.CollectionSuggestionEnvelope,
  'type'
> & {
  type: 'collection_suggestion'
}

/** Notification carrying an external content recommendation */
export type ContentRecommendationNotification = Omit<
  Schemas.ContentRecommendationEnvelope,
  'type'
> & {
  type: 'content_recommendation'
}

/** Notification carrying a generated daily digest */
export type DailyDigestNotification = Omit<Schemas.DailyDigestEnvelope, 'type'> & {
  type: 'daily_digest'
}

/** Plain system announcement notification */
export type SystemNotification = Omit<Schemas.SystemEnvelope, 'type'> & {
  type: 'system'
}

/** Any notification envelope, discriminated on `type` */
export type Notification =
  | CollectionSuggestionNotification
  | ContentRecommendationNotification
  | DailyDigestNotification
  | SystemNotification

// The narrowed envelope discriminants and the NotificationType enum must
// describe the same set of wire strings.
/** @internal */
export type _NotificationTypeMatchesEnvelopes = Expect<Eq<NotificationType, Notification['type']>>

/* ---------------------------------------------------------------------------
 * Notification list surface.
 * ------------------------------------------------------------------------- */

/** Notification list response */
export type NotificationListResponse = Page<Notification>

/** Typed filter for notification lists. */
export type NotificationWhere = Where<BranchOf<NotificationListEndpointQuery>>

/** Signed sort keys for notification lists (e.g. `'-created_at'`). */
export type NotificationOrderBy = OrderByOf<NotificationListEndpointQuery>

/** Options for `sdk.Notification.list` / `count` / `iterate`. */
export type NotificationListOptions = ListOptions<NotificationWhere, NotificationOrderBy>

/** @internal */
export type _NotificationNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<NotificationListEndpointQuery>>
>
