/**
 * Note-scoped podcast types (VITA-1388).
 *
 * A podcast is a single generated audio episode for one saved note: `transcript`
 * is the formatted script, `file` is the generated `audio/mpeg`, presigned at
 * the router boundary. Generation is asynchronous — `POST /notes/{id}/podcasts`
 * answers **202** with a `processing` row and the client polls
 * `GET /podcasts/{id}` until it settles.
 *
 * There is deliberately **no list surface here**: the API exposes neither a
 * criteria list nor a by-note lookup, so there is no endpoint query to derive
 * `Where`/`OrderBy` from. A client that wants to show a note's podcast again
 * after a reload needs an API follow-up, not a contract change.
 */

import type { Eq, Expect } from './assert'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Enums.
 * ------------------------------------------------------------------------- */

/**
 * Podcast generation status.
 *
 * `error` is **not necessarily terminal**: the worker writes it before each of
 * its automatic retries and flips the row back to `processing` when one starts.
 */
export const PodcastStatus = {
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
} as const satisfies Record<string, Schemas.Podcast['status']>
export type PodcastStatus = (typeof PodcastStatus)[keyof typeof PodcastStatus]
/** @internal */
export type _PodcastStatusExhaustive = Expect<Eq<PodcastStatus, Schemas.Podcast['status']>>

/* ---------------------------------------------------------------------------
 * Podcast entity.
 * ------------------------------------------------------------------------- */

/**
 * A generated podcast episode for one note — title, transcript, and audio.
 *
 * `file_id` and `file` are null while `status` is `processing`. **`generated_at`
 * is typed `string` but arrives as Unix seconds** — it carries no
 * `unix-timestamp` schema override, unlike `created_at`/`updated_at`, so
 * normalize it rather than passing it to `new Date`.
 */
export type Podcast = Schemas.Podcast
