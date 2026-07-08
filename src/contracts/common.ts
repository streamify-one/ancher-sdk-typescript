/**
 * Common API types shared across modules
 */

import type { EndpointByMethod } from '../api/generated/api.client'
import type { Schemas } from './schemas'

/** UUID string type alias for clarity */
export type UUID = string

/** Unix timestamp in seconds (float) */
export type UnixTimestamp = number

/** Base entity with timestamps */
export interface BaseEntity {
  created_at: UnixTimestamp
  id: UUID
  updated_at: UnixTimestamp
}

/** Standard API page response. */
export interface Page<T> {
  has_more: boolean
  items: T[]
  next_cursor: string | null
  total?: number
}

/** Validation error detail */
export type ValidationErrorDetail = Schemas.ValidationError

/** HTTP validation error response */
export type HTTPValidationError = Schemas.HTTPValidationError

/** Generic API error response */
export interface APIError {
  detail: string | ValidationErrorDetail[]
}

/** Extract the generated query params object from a generated endpoint type. */
export type EndpointQuery<TEndpoint> = TEndpoint extends {
  parameters: { query: infer TQuery }
}
  ? TQuery
  : never

/** Generated query params for endpoints that are addressable by path. */
export type GetEndpointQuery<TPath extends keyof EndpointByMethod['get']> = EndpointQuery<
  EndpointByMethod['get'][TPath]
>
