/**
 * Re-export generated OpenAPI schemas as the single source of truth.
 *
 * Usage:
 *   import type { Schemas } from './schemas'
 *   type MyType = Schemas.UserLogin
 */
export type { Schemas } from '../api/generated/api.client'
