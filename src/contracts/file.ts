/**
 * File-related types: upload flow shapes and the file-revision list surface.
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

/** Fields carried only by the pre-v1.5 file payload. */
interface LegacyFileFields {
  current_revision_id: string | null
  revision: LegacyFileRevision | null
  s3_id: string
  user_id: string | null
}

/** The pre-v1.5 revision shape, before its active fields moved onto `File`. */
export type LegacyFileRevision = Omit<Schemas.FileRevision, 'metadata' | 'mimetype' | 'size'> & {
  s3_object: Schemas.S3Object | null
}

/**
 * File metadata across the v1.4 nested-revision and v1.5 flattened shapes.
 * The generated schema remains the exact v1.5 wire contract; this public
 * entity keeps consumers source-compatible while they migrate to accessors.
 */
export type File = Omit<Schemas.File, 'metadata' | 'revision_number'> &
  Partial<Pick<Schemas.File, 'metadata' | 'revision_number'>> &
  Partial<LegacyFileFields>

/**
 * File info for display. v1.5.0 (VITA-1141) folded the separate `FileInfo`
 * schema into `File`; the name stays so callers need not change.
 */
export type FileInfo = File | LegacyFileInfo

/**
 * File upload response. v1.5.0 (VITA-1141) returns the `File` itself from
 * every upload endpoint (`FileUploadResponse` is gone); the name stays.
 */
export type FileUploadResponse = File | LegacyFileInfo

/** Flat file response returned by upload and metadata endpoints before v1.5. */
export interface LegacyFileInfo {
  content_hash: string | null
  content_hash_md5: string | null
  current_revision_id: string | null
  expires_at: string | null
  filename: string
  id: string
  is_public: boolean
  mimetype: string | null
  parent_file_id: string | null
  s3_id: string | null
  size: number | null
}

/** Presigned upload request */
export type PresignedUploadRequest = Schemas.PresignedUploadRequest

/** Presigned upload response */
export type PresignedUploadResponse = Schemas.PresignedUploadResponse

/** Presigned download response */
export type PresignedDownloadResponse = Schemas.PresignedDownloadResponse

/** Complete upload request */
export type CompleteUploadRequest = Schemas.CompleteUploadRequest

/** File verification response (`POST /files/{id}/verifications`) */
export type FileVerificationResponse = Schemas.FileVerificationResponse

/**
 * Per-file result of the multipart batch upload (`POST /files/batch` returns
 * a bare `BatchFileUploadResult[]`; per-file failures ride in each `error`).
 */
export type BatchFileUploadResult = Schemas.BatchFileUploadResult & {
  /** Present on pre-v1.5 batch-upload responses. */
  s3_id?: string | null
}

/* ---------------------------------------------------------------------------
 * File revision list surface.
 * ------------------------------------------------------------------------- */

/** File revision across the v1.4 nested-S3-object and v1.5 flattened shapes. */
export type FileRevision = Schemas.FileRevision | LegacyFileRevision

/** File revision list response */
export type FileRevisionListResponse = Page<FileRevision>

type FileRevisionListEndpointQuery =
  GetEndpointQuery<'/api/v1/notes/{note_id}/files/{file_id}/revisions'>

/** Typed filter for a file's revision list. */
export type FileRevisionWhere = Where<BranchOf<FileRevisionListEndpointQuery>>

/** Signed sort keys for a file's revision list (e.g. `'-revision_number'`). */
export type FileRevisionOrderBy = OrderByOf<FileRevisionListEndpointQuery>

/** Options for `sdk.File.revisions`. */
export type FileRevisionListOptions = ListOptions<FileRevisionWhere, FileRevisionOrderBy>

/** @internal */
export type _FileRevisionNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<FileRevisionListEndpointQuery>>
>
