/**
 * Note-scoped podcast types (VITA-1388).
 *
 * A podcast is one generated episode per saved note. New rows put the timed
 * transcript in `transcript_file` and measured length in `duration_seconds`;
 * `transcript` remains for legacy rows. Generation is asynchronous — `POST /notes/{id}/podcasts`
 * answers **202** with a `processing` row and the client polls
 * `GET /podcasts/{id}` until it settles.
 *
 * A note detail/by-slug payload embeds its podcast. List payloads carry its
 * metadata but leave file URLs unsigned; public note reads expose ready rows
 * with nullable owner and error fields.
 */

import type { Eq, Expect } from './assert'
import type { File } from './file'
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
 * `file_id`, `file`, and `transcript_file` are null until ready. `generated_at`
 * is nullable and only meaningful for completed episodes. Although the schema
 * types it as a date-time string, the API currently serializes Unix seconds;
 * consumers must normalize it before passing it to `Date`. Compatibility
 * fields remain optional for older API payloads; current generated schemas
 * require the measured duration and transcript-file references.
 */
interface CompatiblePodcastFields {
  duration_seconds?: number | null
  file: File | null
  target_minutes?: number
  transcript_file?: File | null
  transcript_file_id?: string | null
}

export type Podcast = Omit<Schemas.Podcast, keyof CompatiblePodcastFields> &
  CompatiblePodcastFields
