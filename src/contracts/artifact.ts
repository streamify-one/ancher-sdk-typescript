/**
 * Artifact types: the artifact entity (with FE-only live/legacy file-reference
 * fields), typed list options for the artifact list endpoint, and display
 * helpers. Reaction enum constants live in `./note` (`ReactionType`), which
 * drift-checks against `Schemas.Artifact['reaction']` there.
 */

import type { Expect } from './assert'
import type { GetEndpointQuery, Page } from './common'
import type {
  BranchOf,
  ListOptions,
  NoOperatorCollision,
  OrderByOf,
  Where,
} from './query'
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

/** Update artifact request (plus the FE-only `pinned` local field). */
export type ArtifactUpdate = Schemas.ArtifactUpdate & Partial<ArtifactPinnedFields>

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

/** The embedded content file info, across the live and legacy payload shapes. */
export function getArtifactEmbeddedFile(
  artifact: Artifact | null | undefined
): ArtifactFileInfo | null {
  return artifact?.files?.content ?? artifact?.file_ref?.file ?? null
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
  const files = artifact?.files
  if (!files) return undefined

  const thumbnail = files.thumbnail?.presigned_url
  if (thumbnail) return thumbnail

  const display = files.display
  if (display?.mimetype?.startsWith('image/') && display.presigned_url) {
    return display.presigned_url
  }

  const content = files.content
  if (content?.mimetype?.startsWith('image/') && content.presigned_url) {
    return content.presigned_url
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
  return artifact?.files?.content?.revision?.revision_number ?? undefined
}
