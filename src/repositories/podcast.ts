/**
 * Podcast repository (`/notes/{id}/podcasts`, `/podcasts/{id}`).
 *
 * `sdk.Podcast` has no list surface — the API exposes neither a criteria list
 * nor a by-note lookup (VITA-1388), only "make one" and "read one by id".
 * Returned podcasts are plain `Schemas.Podcast` data via the `Podcast` contract
 * alias; no model class.
 *
 * Generation is asynchronous. `createForNote` returns as soon as the row is
 * enqueued, so the *caller* owns the poll loop — repository ops stay thin, the
 * same way `notesApi.pollUntilComplete` lives in the web app rather than here.
 */

import type { AncherClient } from '../api/client'
import type { Podcast } from '../contracts/podcast'

export interface PodcastRepository {
  /**
   * Request a podcast for a note (HTTP 202).
   *
   * Resolves with the newly created row in `status: 'processing'` — poll `get`
   * until it reaches `ready` or `error`. Billing-gated: an exhausted balance
   * rejects with `API-BIS002`. The note must be owned by the caller and ready.
   *
   * Every call creates a **new** podcast and bills again; there is no re-run
   * endpoint, so a retry is another `createForNote`.
   */
  createForNote(noteId: string): Promise<Podcast>

  /**
   * Get a podcast by id. Ready rows carry `file_id` and a presigned `file`.
   *
   * Takes a `signal` because this is the polled operation: a client watching a
   * generation should be able to drop an in-flight tick when its surface goes
   * away, rather than let it land on nothing.
   */
  get(podcastId: string, options?: PodcastGetOptions): Promise<Podcast>
}

export interface PodcastGetOptions {
  signal?: AbortSignal
}

export function createPodcastRepository(client: AncherClient): PodcastRepository {
  return {
    async createForNote(noteId) {
      return await client.api.post('/api/v1/notes/{note_id}/podcasts', {
        path: { note_id: noteId },
      })
    },

    async get(podcastId, options) {
      return await client.api.get('/api/v1/podcasts/{podcast_id}', {
        path: { podcast_id: podcastId },
        ...(options?.signal ? { overrides: { signal: options.signal } } : {}),
      })
    },
  }
}
