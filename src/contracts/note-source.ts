/**
 * Note source-field accessors — the one place the "where does a note's
 * source metadata live" rule is written in TypeScript.
 *
 * Up to API v1.4 a note carried its scraped/uploaded provenance on the nested
 * `article` (`url`, `site_name`, `author`, …); the note itself only held the
 * user's overrides. v1.5.0 (VITA-1141 / VITA-1065) hides the article and
 * hoists those fields onto the note as computed properties, each already
 * resolved "override first, otherwise the article's value"
 * (`app/schemas/note.py`: `title`, `description`, `source`, `url`, `author`,
 * `site_name`, `published_date`, `language`).
 *
 * Every accessor reads the note first and falls back to the nested article,
 * so a client written against these never branches on the API version. Inputs
 * are structural: any object with the optional fields below qualifies.
 */

import type { Eq, Expect } from './assert'
import type { Schemas } from './schemas'

export interface NoteOriginFile {
  filename?: string | null
  mimetype?: string | null
}

/** The provenance fields a note or its nested article may carry. */
export interface NoteSourceFields {
  author?: string | null
  description?: string | null
  error_message?: string | null
  language?: string | null
  origin_files?: NoteOriginFile[] | null
  /** Typed `string` by the spec but serialized as Unix SECONDS (see {@link getNotePublishedDate}). */
  published_date?: string | number | null
  site_name?: string | null
  source?: string | null
  status?: string | null
  title?: string | null
  url?: string | null
}

/** A note across shapes: hoisted fields (v1.5.0) and/or the nested article (≤ v1.4). */
export interface NoteSourceHolder extends NoteSourceFields {
  article?: NoteSourceFields | null
}

/** @internal — the generated Note must satisfy the structural input. */
export type _NoteIsNoteSourceHolder = Expect<
  Eq<Schemas.Note extends NoteSourceHolder ? true : false, true>
>

function read<K extends Exclude<keyof NoteSourceFields, 'origin_files' | 'published_date'>>(
  note: NoteSourceHolder | null | undefined,
  key: K
): string | undefined {
  return note?.[key] ?? note?.article?.[key] ?? undefined
}

/**
 * The effective title: the user's override when set, otherwise the article's.
 * v1.5.0 resolves this server-side into `Note.title`; ≤ v1.4 carried the
 * override on the note and the scraped title on the article.
 */
export function getNoteTitle(note: NoteSourceHolder | null | undefined): string | undefined {
  return read(note, 'title')
}

/** The effective description, override first (`Note.description`). */
export function getNoteDescription(note: NoteSourceHolder | null | undefined): string | undefined {
  return read(note, 'description')
}

/**
 * The normalized source URL — absent for text and file notes.
 * Mirrors `Note.url` (`app/schemas/note.py`), read from the article on ≤ v1.4.
 */
export function getNoteSourceUrl(note: NoteSourceHolder | null | undefined): string | undefined {
  return read(note, 'url')
}

/** Name of the source website or publication (`Note.site_name`). */
export function getNoteSiteName(note: NoteSourceHolder | null | undefined): string | undefined {
  return read(note, 'site_name')
}

/** Author name extracted from the source (`Note.author`). */
export function getNoteAuthor(note: NoteSourceHolder | null | undefined): string | undefined {
  return read(note, 'author')
}

const PLATFORM_SOURCE_DOMAINS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['twitter', ['twitter.com', 'x.com']],
  ['instagram', ['instagram.com']],
  ['linkedin', ['linkedin.com']],
  ['youtube', ['youtube.com', 'youtu.be']],
  ['tiktok', ['tiktok.com']],
  ['bilibili', ['bilibili.com', 'b23.tv']],
  ['xiaohongshu', ['xiaohongshu.com', 'xhslink.com', 'xhslink.cn']],
  ['douyin', ['douyin.com']],
  ['wechat', ['weixin.qq.com']],
]

function platformSourceFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, '')
    return PLATFORM_SOURCE_DOMAINS.find(([, domains]) =>
      domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))
    )?.[0]
  } catch {
    return undefined
  }
}

function sourceFromOrigin(file: NoteOriginFile): string {
  const mimetype = file.mimetype?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype.startsWith('video/')) return 'video'
  if (mimetype.startsWith('audio/')) return 'audio'
  if (mimetype === 'text/markdown') return 'markdown'
  if (mimetype.startsWith('text/') || mimetype === 'application/json') return 'text'
  return 'document'
}

/**
 * Effective content provenance: a media kind or platform name when it can be
 * derived, otherwise the note's creation channel.
 *
 * The ONE accessor that reads the article first: on ≤ v1.4 the note's
 * `source` was a plain frozen field that serialized its literal default
 * (`'text'`) instead of the article's value (`app/schemas/note.py` documents
 * the bug), so every client preferred the article's. On v1.5.0 `Note.source`
 * is the creation channel (`file` / `url`) and the article is gone, so
 * provenance is recovered from the hoisted URL or origin files.
 */
export function getNoteSource(note: NoteSourceHolder | null | undefined): string | undefined {
  const articleSource = note?.article?.source
  if (articleSource != null) return articleSource

  const channel = note?.source ?? undefined
  if (channel === 'url') return platformSourceFromUrl(getNoteSourceUrl(note)) ?? channel
  if (channel === 'conversation' || channel === 'message' || channel === 'artifact') return 'text'
  if (channel !== 'file') return channel

  const origins = note?.origin_files ?? note?.article?.origin_files ?? []
  const first = origins[0]
  if (!first) return channel
  const firstSource = sourceFromOrigin(first)
  return origins.some(file => sourceFromOrigin(file) !== firstSource) ? 'mixed' : firstSource
}

/**
 * Original publication date of the source (`Note.published_date`).
 *
 * **Typed `string` by the spec but arrives as Unix seconds** — the API
 * serializes every datetime that way (`BaseDataSchema` `ser_json_temporal`),
 * the same trap `Conversation.last_interacted_at` documents. Returned as
 * received; normalize (`seconds × 1000`) before `new Date`, never pass it
 * straight in.
 */
export function getNotePublishedDate(
  note: NoteSourceHolder | null | undefined
): string | number | undefined {
  return note?.published_date ?? note?.article?.published_date ?? undefined
}

/** Content language code, e.g. `en`, `zh` (`Note.language`). */
export function getNoteLanguage(note: NoteSourceHolder | null | undefined): string | undefined {
  return read(note, 'language')
}

/**
 * The processing error, note-level first. v1.5.0 writes the same message to
 * both note and article (`worker/tasks/note/common.py` `set_status`), so the
 * note alone is enough there; ≤ v1.4 could carry it only on the article.
 */
export function getNoteErrorMessage(note: NoteSourceHolder | null | undefined): string | undefined {
  return read(note, 'error_message')
}

/**
 * The status the UI should show, accounting for article-side processing on
 * ≤ v1.4, where the note could already read `ready` while its article was
 * still `queued` / `processing` / `error`. On v1.5.0 the backend keeps the
 * note's status in step with the article's (`set_status` writes both), so the
 * note's own status is the answer.
 *
 * Rule, in order: the note's own `queued` / `processing`; then the article's;
 * then an `error` on either side; otherwise the note's status. This is
 * mobile's `getDisplayStatus` verbatim (the note's pending state is read
 * first because it carries its own tone); web's variant lets only the
 * article's `queued` / `processing` win, so a failed article under a ready
 * note stayed `ready` there — surfacing the failure is the deliberate choice.
 *
 * Generic on the status literal so a client keeps its own `NoteStatus` union.
 */
export function getNoteProcessingStatus<S extends string>(
  note: { status?: S | null; article?: { status?: S | null } | null } | null | undefined
): S | undefined {
  const noteStatus = note?.status ?? undefined
  if (noteStatus === 'queued' || noteStatus === 'processing') return noteStatus
  const articleStatus = note?.article?.status ?? undefined
  if (articleStatus === 'queued' || articleStatus === 'processing') return articleStatus
  if (noteStatus === 'error' || articleStatus === 'error') return 'error' as S
  return noteStatus
}
