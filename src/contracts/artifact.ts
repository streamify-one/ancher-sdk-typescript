/**
 * Artifact types: the artifact entity (with FE-only live/legacy file-reference
 * fields), typed list options for the artifact list endpoint, and display
 * helpers. Reaction enum constants live in `./note` (`ReactionType`), which
 * drift-checks against `Schemas.Artifact['reaction']` there.
 */

import type { Eq, Expect } from './assert'
import type { GetEndpointQuery, Page } from './common'
import type {
  BranchOf,
  ListOptions,
  NoOperatorCollision,
  OrderByOf,
  Where,
} from './query'
import {
  getArtifactContentFile,
  getArtifactDisplayFile,
  getArtifactThumbnailFile,
  getFileRevisionNumber,
  getFileUrl,
} from './file-slots'
import type { ReactionType } from './note'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Artifact entity.
 * ------------------------------------------------------------------------- */

/** Embedded file info carried on an artifact's file reference. */
type ArtifactFileInfo = Pick<Schemas.FileInfo, 'filename' | 'id' | 'mimetype' | 'size'>

/** The live (post-migration) file reference embedded on an artifact. */
interface LiveArtifactFileReference {
  category: string | null
  file: (ArtifactFileInfo & Partial<Schemas.File>) | null
  file_id: string
  label: string | null
  mutable: boolean
}

/** Fields present on live-backend artifact payloads. */
interface LiveArtifactFields {
  file_id: string
  file_ref: LiveArtifactFileReference | null
}

/** Fields present on legacy artifact payloads (pre file_ref migration). */
interface LegacyArtifactFields {
  content_file_id: string
  display_file_id: string | null
}

/** FE-only field derived client-side from the pinned-items list. */
interface ArtifactPinnedFields {
  pinned: boolean
}

/**
 * Artifact entity — the OpenAPI schema bridged across the legacy/live file
 * reference shapes, plus FE-only local fields.
 */
export type Artifact = Omit<Schemas.Artifact, 'content_file_id' | 'display_file_id'> &
  Partial<LegacyArtifactFields> &
  Partial<LiveArtifactFields> &
  Partial<ArtifactPinnedFields>

/** Create artifact request. */
export type ArtifactCreate = Schemas.ArtifactCreate

/** Artifact list response. */
export type ArtifactListResponse = Page<Artifact>

/**
 * Update artifact request — the wire shape only. `pinned` is a client-derived
 * read-model field (see {@link Artifact}) and deliberately absent: the API has
 * no such field and would silently drop it. `reaction` is narrowed to
 * {@link ReactionType}: the API treats `null` as "not provided"
 * (`if reaction is not None` in `app/services/artifact.py`), so clearing a
 * reaction is `'neutral'`, never `null`.
 */
export type ArtifactUpdate = Omit<Schemas.ArtifactUpdate, 'reaction'> & {
  reaction?: ReactionType
}
/** @internal */
export type _ArtifactUpdateReactionNarrowed = Expect<
  Eq<ArtifactUpdate['reaction'], ReactionType | undefined>
>
/** @internal */
export type _ArtifactUpdateNoLocalFields = Expect<
  Eq<keyof ArtifactPinnedFields extends keyof ArtifactUpdate ? true : false, false>
>
/** @internal */
export type _ArtifactUpdateAssignable = Expect<
  Eq<ArtifactUpdate extends Schemas.ArtifactUpdate ? true : false, true>
>

/** Set-artifact-tags request (replace-all, mirroring the note endpoint). */
export type ArtifactTagsUpdate = Schemas.ArtifactTagsUpdate

/* ---------------------------------------------------------------------------
 * Artifact list surface.
 * ------------------------------------------------------------------------- */

type ArtifactListEndpointQuery = GetEndpointQuery<'/api/v1/artifacts/'>

/** Typed filter for artifact lists. */
export type ArtifactWhere = Where<BranchOf<ArtifactListEndpointQuery>>

/** Signed sort keys for artifact lists (e.g. `'-updated_at'`, `'+name'`). */
export type ArtifactOrderBy = OrderByOf<ArtifactListEndpointQuery>

/** Options for `sdk.Artifact.list` / `count` / `iterate`. */
export type ArtifactListOptions = ListOptions<ArtifactWhere, ArtifactOrderBy>

/** @internal */
export type _ArtifactNoOpCollision = Expect<NoOperatorCollision<BranchOf<ArtifactListEndpointQuery>>>

/* ---------------------------------------------------------------------------
 * Artifacts in a collection — sort keys only. The rest of that sub-list's
 * surface (`CollectionArtifactWhere` / `CollectionArtifactsOptions`) lives in
 * `./collection` with the other collection sub-lists; the signed sort-key
 * union stays here, its historical home, imported by `./collection`.
 * ------------------------------------------------------------------------- */

type CollectionArtifactsEndpointQuery =
  GetEndpointQuery<'/api/v1/collections/{collection_id}/artifacts'>

/** Signed sort keys for artifacts listed through a collection. */
export type CollectionArtifactOrderBy = OrderByOf<CollectionArtifactsEndpointQuery>

/* ---------------------------------------------------------------------------
 * Display helpers.
 * ------------------------------------------------------------------------- */

/**
 * Display name shown in lists, cards, and dialogs. Prefers the user-facing
 * `artifact.name`; callers that have resolved the underlying file may pass it
 * in to fall back to the filename when the name is empty.
 */
export function getArtifactDisplayName(
  artifact: Artifact,
  file?: Pick<Schemas.FileInfo, 'filename'> | null
): string {
  const name = artifact.name?.trim()
  if (name) return name
  const filename = file?.filename?.trim() ?? getArtifactEmbeddedFile(artifact)?.filename?.trim()
  if (filename) return filename
  return 'Untitled artifact'
}

/** Content file id across the live (`file_ref`/`file_id`) and legacy shapes. */
export function getArtifactFileId(artifact: Artifact | null | undefined): string | undefined {
  return artifact?.file_ref?.file_id ?? artifact?.file_id ?? artifact?.content_file_id
}

/** Legacy display file id, when the payload carries one. */
export function getArtifactDisplayFileId(
  artifact: Artifact | null | undefined
): string | undefined {
  return artifact?.display_file_id ?? undefined
}

/**
 * The embedded content file info, across the live and legacy payload shapes.
 * Slot resolution goes through {@link getArtifactContentFile}; the `file_ref`
 * arm only serves payloads from the 2026-05 backends that still sent it.
 */
export function getArtifactEmbeddedFile(
  artifact: Artifact | null | undefined
): ArtifactFileInfo | null {
  return getArtifactContentFile(artifact) ?? artifact?.file_ref?.file ?? null
}

/**
 * Render-ready preview URL for an artifact, derived from its embedded signed
 * `files` (each `File` carries a `presigned_url` signed at the router
 * boundary). Prefers the dedicated `thumbnail` (pinned to 720px server-side),
 * which the backend renders for any previewable kind — image, PDF, slide deck,
 * video. Falls back to the content/display file only when it's itself an image.
 * Returns `undefined` when no thumbnail exists and the content isn't an image,
 * so callers don't point an `<img>` at a raw PDF, text blob, etc. — and so
 * message lists can render thumbnails without a per-artifact presigned-URL fetch.
 */
export function getArtifactPreviewUrl(artifact: Artifact | null | undefined): string | undefined {
  const thumbnail = getFileUrl(getArtifactThumbnailFile(artifact, { displayFallback: false }))
  if (thumbnail) return thumbnail
  for (const file of [getArtifactDisplayFile(artifact), getArtifactContentFile(artifact)]) {
    if (file?.mimetype?.startsWith('image/') && file.presigned_url) return file.presigned_url
  }
  return undefined
}

/**
 * Current revision number of the artifact's content file, sourced from the
 * embedded `files.content.revision` on the artifact payload. Doubles as the
 * count of revisions (the agent's `edit_artifact_content` bumps this under the
 * same id). Returns `undefined` when no revision info is present. Mirrors the
 * note-side `getContentRevisionNumber`.
 */
export function getArtifactContentRevisionNumber(
  artifact: Artifact | null | undefined
): number | undefined {
  return getFileRevisionNumber(getArtifactContentFile(artifact))
}
