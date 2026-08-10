/** Daily activity aggregates returned by `GET /activity/usage`. */

import type { EndpointByMethod, Schemas } from '../api/generated/api.client'

/** Query accepted by the server-side daily usage aggregation. */
export type UsageActivityQuery =
  EndpointByMethod['get']['/api/v1/activity/usage']['parameters']['query']

/** One active local calendar day in the requested timezone. */
export type UsageActivityDay = Schemas.UsageActivityDay

/** Totals for the requested inclusive date window. */
export type UsageActivityTotals = Schemas.UsageActivityTotals

/** Daily activity plus window totals. Inactive dates are omitted from `days`. */
export type UsageActivity = Schemas.UsageActivity
