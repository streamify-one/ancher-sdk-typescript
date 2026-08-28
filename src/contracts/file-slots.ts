/**
 * File-slot accessors — the one place the API's file-resolution rules live in
 * TypeScript. Every client used to re-derive "which `File` is the thumbnail"
 * by hand from the raw `files` map (web `note-helpers.ts`, the extension's
 * mention presenter, mobile's `transform.ts`); each of those breaks under the
 * v1.5.0 restructure. Read files through these instead.
 *
 * The accessors accept all three payload shapes the API has or will have, so
 * a client never branches on the API version:
 *
 *  - **(A) ≤ v1.4**: a `files` map keyed by slot (`content`, `thumbnail`, …)
 *    on the note, the nested `article`, and the artifact.
 *  - **(B) v1.5.0** (VITA-1141): typed slots — `content_file`,
 *    `content_tldr_file`, `thumbnail_file`, `display_file` — with `files`
 *    kept as a deprecated computed map of the same four keys.
 *  - **(C) after VITA-1065**: the nested `article` is hidden and its
 *    `origin_files` are hoisted onto the note.
 *
 * Resolution order everywhere: typed slot → `files[slot]`; note → article;
 * `note.origin_files` → `article.origin_files`. Each accessor cites the
 * `app/schemas/*.py` property it mirrors and calls out where it deliberately
 * goes beyond the backend (the note → article fallback, the image-content
 * thumbnail fallback).
 *
 * Inputs are structural and generic on the file type, so a client with its own
 * generated `Note`/`File` types (mobile) gets its own `File` back — no casts.
 */

import type { Eq, Expect } from './assert'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Input shapes.
 * ------------------------------------------------------------------------- */

/** The minimum a file needs to be resolved through the accessors. */
export interface SlotFile {
  id: string
  mimetype?: string | null
  presigned_url?: string | null
  /** Nested revision (API ≤ v1.5.0). */
  revision?: { revision_number?: number | null } | null
  /** Flattened onto the file once `revision` is hidden (api PR #530 shape). */
  revision_number?: number | null
  content_hash?: string | null
}

/**
 * Anything that carries file slots — a Note, an Article or an Artifact — in
 * any of the three API shapes. Every field is optional so a payload from any
 * version (or a partial fixture) type-checks.
 */
export interface FileSlotHolder<F extends SlotFile = SlotFile> {
  /** Pre-slot shape (API ≤ v1.4) and the deprecated computed map (v1.5.0). */
  files?: Partial<Record<string, F | null>> | null
  /** Typed slots (API ≥ v1.5.0). */
  content_file?: F | null
  content_tldr_file?: F | null
  thumbnail_file?: F | null
  display_file?: F | null
  transcript_file?: F | null
}

/** A note's file surface across shapes (A), (B) and (C). */
export interface NoteFileSlots<F extends SlotFile = SlotFile> extends FileSlotHolder<F> {
  /** The nested article; hidden (`null`/absent) after VITA-1065. */
  article?: (FileSlotHolder<F> & { origin_files?: readonly F[] | null }) | null
  /** Hoisted onto the note by VITA-1065. */
  origin_files?: readonly F[] | null
}

/**
 * An artifact's file surface. (No `file_ref` here: that singular field left
 * the API schema in May 2026 — no backend since v1.3.9 sends it.)
 */
export type ArtifactFileSlots<F extends SlotFile = SlotFile> = FileSlotHolder<F>

/** @internal */
export type _NoteIsNoteFileSlots = Expect<
  Eq<Schemas.Note extends NoteFileSlots<Schemas.File> ? true : false, true>
>
/** @internal */
export type _ArticleIsFileSlotHolder = Expect<
  Eq<Schemas.Article extends FileSlotHolder<Schemas.File> ? true : false, true>
>
/** @internal */
export type _ArtifactIsArtifactFileSlots = Expect<
  Eq<Schemas.Artifact extends ArtifactFileSlots<Schemas.File> ? true : false, true>
>
/** @internal */
export type _FileIsSlotFile = Expect<Eq<Schemas.File extends SlotFile ? true : false, true>>

/* ---------------------------------------------------------------------------
 * Slot reads.
 * ------------------------------------------------------------------------- */

type Slot = 'content' | 'content_tldr' | 'thumbnail' | 'display' | 'transcript'

/** Typed slot first (v1.5.0), then the `files` map; `null` normalized to `undefined`. */
function readSlot<F extends SlotFile>(
  holder: FileSlotHolder<F> | null | undefined,
  slot: Slot
): F | undefined {
  if (!holder) return undefined
  return holder[`${slot}_file`] ?? holder.files?.[slot] ?? undefined
}

function isImage(file: SlotFile | undefined): boolean {
  return Boolean(file?.mimetype?.startsWith('image/'))
}

/* ---------------------------------------------------------------------------
 * Note slots.
 * ------------------------------------------------------------------------- */

/**
 * The note's content file — the mutable copy the note owns, falling back to
 * the article's parsed copy when the payload carries only that.
 *
 * Mirrors `Note.content_file` (`app/schemas/note.py:263`) plus the note →
 * article fallback the backend itself does NOT do; every client relies on it
 * for payloads that only carry an article-side content file. Use
 * {@link getNoteOwnContentFile} when only the note-owned file will do.
 */
export function getNoteContentFile<F extends SlotFile>(
  note: NoteFileSlots<F> | null | undefined
): F | undefined {
  return readSlot(note, 'content') ?? readSlot(note?.article, 'content')
}

/**
 * The note-owned content file only — no article fallback. This is the only
 * valid target of `PUT /notes/{id}/files/{fileId}/content`, and the file whose
 * revision advances on save: the backend mints it as a separate mutable copy
 * of the article's immutable parsed copy (`app/utils/content.py`), and the PUT
 * endpoint rejects any other file.
 *
 * Mirrors `Note.content_file` (`app/schemas/note.py:263`) exactly.
 */
export function getNoteOwnContentFile<F extends SlotFile>(
  note: NoteFileSlots<F> | null | undefined
): F | undefined {
  return readSlot(note, 'content')
}

/**
 * The TLDR variant of the content (VITA-963), note copy first. Signed on list
 * and detail responses, so {@link getFileUrl} is usable straight away.
 *
 * Mirrors `Note.content_tldr_file` (`app/schemas/note.py:267`) + article fallback.
 */
export function getNoteTldrFile<F extends SlotFile>(
  note: NoteFileSlots<F> | null | undefined
): F | undefined {
  return readSlot(note, 'content_tldr') ?? readSlot(note?.article, 'content_tldr')
}

/**
 * The rendered display file — the browser-renderable stand-in for an origin
 * the client cannot show itself (e.g. the PDF rendered from a `.pptx`).
 * `undefined` when no rendition exists; the API exposes no generation status,
 * so "still rendering" and "never will" are indistinguishable here.
 *
 * Mirrors `Note.display_file` (`app/schemas/note.py:271`) + article fallback.
 */
export function getNoteDisplayFile<F extends SlotFile>(
  note: NoteFileSlots<F> | null | undefined
): F | undefined {
  return readSlot(note, 'display') ?? readSlot(note?.article, 'display')
}

/**
 * The file to render as the note's thumbnail:
 *
 *  1. the note's or the article's `thumbnail` slot, whichever carries a
 *     `presigned_url` (the backend signs the note's copy — the article's is a
 *     separate, unsigned instance);
 *  2. otherwise the note's or the article's content file when it is a signed
 *     image — direct image-upload notes carry no thumbnail slot at all, their
 *     content IS the picture (deliberately beyond the backend rule; every
 *     client depends on it or such notes render blank);
 *  3. otherwise the thumbnail slot even unsigned (its `id` still drives an
 *     authenticated fetch);
 *  4. otherwise any image in the note's own `files` map — on API ≤ v1.4 that
 *     map also carries `generated` files (`app/utils/content.py:275-288`), the
 *     only picture some notes have. v1.5.0's map holds just the four slots, so
 *     this level retires by itself there;
 *  5. otherwise `undefined`.
 *
 * Mirrors `Note.thumbnail_file` (`app/schemas/note.py:259`) and the thumbnail
 * presign scope (`:238`).
 */
export function getNoteThumbnailFile<F extends SlotFile>(
  note: NoteFileSlots<F> | null | undefined
): F | undefined {
  const noteThumbnail = readSlot(note, 'thumbnail')
  const articleThumbnail = readSlot(note?.article, 'thumbnail')
  for (const file of [noteThumbnail, articleThumbnail]) {
    if (file?.presigned_url) return file
  }
  for (const file of [readSlot(note, 'content'), readSlot(note?.article, 'content')]) {
    if (file?.presigned_url && isImage(file)) return file
  }
  if (noteThumbnail ?? articleThumbnail) return noteThumbnail ?? articleThumbnail
  for (const file of Object.values(note?.files ?? {})) {
    if (file && isImage(file)) return file
  }
  return undefined
}

/**
 * Every origin file, in API order — a note created from several uploads owns
 * all of them (VITA-1151). Returned as the API sends them; whether an entry is
 * renderable (has `id` + `mimetype`) is the caller's policy.
 *
 * Mirrors `Article.origin_files` (`app/schemas/note.py:94`), read from the note
 * itself once VITA-1065 hoists it there.
 */
export function getNoteOriginFiles<F extends SlotFile>(
  note: NoteFileSlots<F> | null | undefined
): F[] {
  return [...(note?.origin_files ?? note?.article?.origin_files ?? [])]
}

/**
 * The transcript file of an audio/video note.
 *
 * Mirrors `Note.transcript_file` (`app/schemas/note.py:275`), which reads the
 * article's transcript. **No API version serializes this field yet** — it is a
 * plain property on both `main` and `releases/v1.5.0` — so this returns
 * `undefined` until the backend exposes `transcript_file`; it is here so that
 * exposing it needs no client change.
 */
export function getNoteTranscriptFile<F extends SlotFile>(
  note: NoteFileSlots<F> | null | undefined
): F | undefined {
  return readSlot(note, 'transcript') ?? readSlot(note?.article, 'transcript')
}

/* ---------------------------------------------------------------------------
 * Artifact slots.
 * ------------------------------------------------------------------------- */

/**
 * The artifact's content body.
 *
 * Mirrors `Artifact.content_file` (`app/schemas/artifact.py:108`).
 */
export function getArtifactContentFile<F extends SlotFile>(
  artifact: ArtifactFileSlots<F> | null | undefined
): F | undefined {
  return readSlot(artifact, 'content')
}

/**
 * The rendered display sibling (e.g. the PDF of a slide deck), or `undefined`.
 *
 * Mirrors `Artifact.display_file` (`app/schemas/artifact.py:113`).
 */
export function getArtifactDisplayFile<F extends SlotFile>(
  artifact: ArtifactFileSlots<F> | null | undefined
): F | undefined {
  return readSlot(artifact, 'display')
}

/**
 * The card preview: the `thumbnail` slot, falling back to `display` for
 * artifacts created before thumbnails existed — the backend signs `display`
 * as the thumbnail target then (720px wide), so on list payloads that is the
 * file carrying the preview URL. The fallback may be a non-image (a display
 * PDF); check {@link getFileMimetype} before pointing an `<img>` at it, or
 * pass `{ displayFallback: false }` for the bare slot (render-target logic
 * that already treats `display` separately wants that).
 *
 * Mirrors the thumbnail presign rule (`app/schemas/artifact.py:105`) rather
 * than the bare `Artifact.thumbnail_file` property, which has no fallback —
 * the rule is what decides which file actually carries a signed URL.
 */
export function getArtifactThumbnailFile<F extends SlotFile>(
  artifact: ArtifactFileSlots<F> | null | undefined,
  options: { displayFallback?: boolean } = {}
): F | undefined {
  const thumbnail = readSlot(artifact, 'thumbnail')
  if (thumbnail || options.displayFallback === false) return thumbnail
  return readSlot(artifact, 'display')
}

/* ---------------------------------------------------------------------------
 * File-level reads — the only sanctioned reads of these fields.
 * ------------------------------------------------------------------------- */

/**
 * The signed CDN URL of a file, if the response carried one.
 *
 * `File.presigned_url` (`app/schemas/file.py:76-90`) is populated only inside a
 * router presign context and only for the slots that scope signs: list
 * responses sign `thumbnail` and `content_tldr`
 * (`app/types/presign_types.py:24`); detail responses also sign `display` and
 * origin files. A note's `content` is never signed (it is served
 * by `GET /notes/{id}/content`, which rewrites `streamify-file://` links), nor
 * is an artifact's content when it is markdown/HTML — expect `undefined` there
 * and fetch through the content endpoint instead.
 */
export function getFileUrl(file: SlotFile | null | undefined): string | undefined {
  return file?.presigned_url ?? undefined
}

/** The file's MIME type (`File.mimetype`), `null` when the payload has none. */
export function getFileMimetype(file: SlotFile | null | undefined): string | null {
  return file?.mimetype ?? null
}

/**
 * The current revision number (`FileRevision.revision_number`, or the file's
 * own `revision_number` once the revision object is hidden), used as the
 * save-preflight snapshot for content edits; `undefined` when the payload
 * carries no revision.
 */
export function getFileRevisionNumber(file: SlotFile | null | undefined): number | undefined {
  // Flattened onto the file once `revision` is hidden (api PR #530), nested before.
  return file?.revision_number ?? file?.revision?.revision_number ?? undefined
}

/**
 * A key that changes exactly when the file's bytes change: `id:content_hash`.
 * Use it for caches keyed on "is this still the same picture" — a file keeps
 * its `id` across an in-place revision, and a signed URL changes on every
 * re-sign. Replaces keying on `s3_id`, which VITA-1424 removes from the
 * public surface; `content_hash` (`app/schemas/file.py:46`) is the SHA-256 of
 * the content, not a storage internal. `undefined` when the payload has no
 * hash — fail closed and key on the URL instead.
 */
export function getFileContentKey(file: SlotFile | null | undefined): string | undefined {
  if (!file?.id || !file.content_hash) return undefined
  return `${file.id}:${file.content_hash}`
}
