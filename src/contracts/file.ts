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

/** File metadata */
export type File = Schemas.File

/** File info for display */
export type FileInfo = Schemas.FileInfo

/** File upload response */
export type FileUploadResponse = Schemas.FileUploadResponse

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
export type BatchFileUploadResult = Schemas.BatchFileUploadResult

/* ---------------------------------------------------------------------------
 * File revision list surface.
 * ------------------------------------------------------------------------- */

/** File revision */
export type FileRevision = Schemas.FileRevision

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
