/**
 * Notification repository (`/notifications`). `sdk.Notification` exposes the
 * typed list surface (`list`/`count`/`iterate` over the TypeScript-native
 * `{ where, orderBy, … }` options — see `../contracts/query`) plus the
 * per-record status operations (`setStatus`/`markRead`/`markDismissed`), each
 * taking the notification id as its first argument. Returned notifications are
 * plain data (via the `Notification` contract alias) — no model class.
 *
 * Notifications are a discriminated union of envelopes discriminated on `type`
 * (`suggestion` / `recommendation` / `digest` / `system`).
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type {
  Notification,
  NotificationOrderBy,
  NotificationWhere,
} from '../contracts/notification'
import { createListSurface, type ListSurface, type Page } from './base'

type NotificationListEndpointQuery =
  EndpointByMethod['get']['/api/v1/notifications/']['parameters']['query']

export interface NotificationRepository
  extends ListSurface<Notification, NotificationWhere, NotificationOrderBy> {
  /** Update a notification's inbox status (`PATCH`); returns the updated notification. */
  setStatus(
    notificationId: string,
    body: Schemas.NotificationStatusUpdate
  ): Promise<Notification>
  /** Mark a notification as read; returns the updated notification. */
  markRead(notificationId: string): Promise<Notification>
  /** Mark a notification as dismissed; returns the updated notification. */
  markDismissed(notificationId: string): Promise<Notification>
}

export function createNotificationRepository(client: AncherClient): NotificationRepository {
  // The contracts `Notification` refines the generated envelope union with
  // client-side `type` discriminants; the SDK asserts that shape at this
  // boundary (codegen emits the looser envelope types). Localized to the repo.
  const listSurface = createListSurface<Notification, NotificationWhere, NotificationOrderBy>(
    async (query) =>
      (await client.api.get('/api/v1/notifications/', {
        query: query as NotificationListEndpointQuery,
      })) as unknown as Page<Notification>
  )

  return {
    ...listSurface,
    async setStatus(notificationId, body) {
      return (await client.api.patch('/api/v1/notifications/{notification_id}', {
        path: { notification_id: notificationId },
        body,
      })) as unknown as Notification
    },
    async markRead(notificationId) {
      return (await client.api.patch('/api/v1/notifications/{notification_id}', {
        path: { notification_id: notificationId },
        body: { status: 'read' },
      })) as unknown as Notification
    },
    async markDismissed(notificationId) {
      return (await client.api.patch('/api/v1/notifications/{notification_id}', {
        path: { notification_id: notificationId },
        body: { status: 'dismissed' },
      })) as unknown as Notification
    },
  }
}
