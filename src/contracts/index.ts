/**
 * `@ancher-ai/sdk/contracts` — the API type surface.
 *
 * Friendly entity aliases (`Note`, `Artifact`, …), list-query/criteria helpers,
 * pagination + SSE/streaming types, and a few runtime helpers — all layered over
 * the SDK's single generated `Schemas`. Re-exports every domain module so this
 * barrel is the one import source (`import { … } from '@ancher-ai/sdk/contracts'`).
 */

export * from './api-key'
export * from './activity'
export * from './artifact'
export * from './assert'
export * from './auth'
export * from './billing'
export * from './collection'
export * from './common'
export * from './conversation'
export * from './daily-digest'
export * from './file'
export * from './note'
export * from './notification'
export * from './onboarding'
export * from './pin'
export * from './podcast'
export * from './query'
export * from './recommendation'
export * from './schemas'
export * from './search'
export * from './suggestion'
export * from './user'

// `BalanceResponse` is exported by both ./billing and ./user — billing is the
// canonical source; the explicit re-export resolves the star-export ambiguity.
export type { BalanceResponse } from './billing'
