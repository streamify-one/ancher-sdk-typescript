/**
 * File repository. `File` is `Schemas.FileUploadResponse` (the upload/metadata
 * shape; `Schemas.FileInfo` is assignable to it). The repository (`sdk.File`)
 * wraps the presigned upload flow, metadata fetch, and the note-scoped
 * revision list; returned data is plain `Schemas`-typed — no model class.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type { UploadOptions } from '../api/upload'
import type { FileRevision, FileRevisionListOptions } from '../contracts/file'
import type { Page } from './base'
import {
  downloadPresignedUrl,
  type PresignedDownloadOptions,
  type PresignedUrlQueryOptions,
} from './presigned-download'
import { buildListQuery } from './query'

export type File = Schemas.FileUploadResponse

type FileRevisionsEndpointQuery =
  EndpointByMethod['get']['/api/v1/notes/{note_id}/files/{file_id}/revisions']['parameters']['query']

export type FilePresignedUrlOptions = PresignedUrlQueryOptions
export type FileDownloadOptions = PresignedDownloadOptions

export interface UploadFileOptions {
  /** Filename to register. Defaults to `file.name` when `file` is a `File`. */
  filename?: string
  /** MIME type. Defaults to `file.type`, then `application/octet-stream`. */
  mimetype?: string
  /** Abort signal for the whole flow (presigned mint, S3 PUT, finalize). */
  signal?: AbortSignal
}

export type UploadBatchOptions = Pick<UploadOptions, 'onProgress' | 'signal'>

export interface UploadDirectOptions
  extends Pick<UploadOptions, 'filename' | 'onProgress' | 'signal'> {
  /** Create the file as publicly readable (wire default: `false`). */
  public?: boolean
}

export interface FileRepository {
  /** Get a file's metadata by id. */
  get(fileId: string): Promise<File>
  /** Mint a presigned CDN URL for a file's content bytes. */
  presignedUrl(fileId: string, options?: FilePresignedUrlOptions): Promise<string>
  /**
   * Mint a presigned CDN URL and fetch it credential-less. Returns the raw
   * response so callers can choose `blob()`, `text()`, or streaming reads.
   */
  download(fileId: string, options?: FileDownloadOptions): Promise<Response>
  /**
   * Upload a file via the presigned S3 flow → {@link File} data.
   * (presigned URL → direct S3 `PUT` → finalize).
   */
  upload(file: Blob, options?: UploadFileOptions): Promise<File>
  /**
   * Upload a file in one direct multipart `POST /files/` request — supports
   * upload progress (`onProgress`) and aborting (`signal`). Prefer
   * {@link upload} (the presigned S3 flow) for large files; this route
   * buffers the bytes through the API.
   */
  uploadDirect(file: Blob, options?: UploadDirectOptions): Promise<File>
  /**
   * Upload several files in one multipart `POST /files/batch` request.
   * Each entry must carry its own name (wrap plain Blobs in
   * `new File([blob], name)`); per-file failures come back in each result's
   * `error` field rather than rejecting the batch.
   */
  uploadBatch(
    files: readonly Blob[],
    options?: UploadBatchOptions
  ): Promise<Schemas.BatchFileUploadResult[]>
  /** Verify a file's DB/S3 integrity (`POST /files/{id}/verifications`). */
  verify(fileId: string): Promise<Schemas.FileVerificationResponse>
  /** Delete a file by id (`DELETE`). */
  delete(fileId: string): Promise<void>
  /**
   * List a note-scoped file's revisions (paginated). Only the note owner can
   * list.
   */
  revisions(
    noteId: string,
    fileId: string,
    options?: FileRevisionListOptions
  ): Promise<Page<FileRevision>>
  /**
   * Revert a note-scoped content file to an earlier revision (records a new
   * revision with the old bytes). Returns the updated file data.
   */
  revertRevision(noteId: string, fileId: string, revisionId: string): Promise<File>
}

export function createFileRepository(client: AncherClient): FileRepository {
  const doFetch = client.config.fetch ?? globalThis.fetch
  const presignedUrl: FileRepository['presignedUrl'] = async (fileId, options = {}) => {
    const { download_url } = await client.api.post(
      '/api/v1/files/{file_id}/content/presigned-urls',
      {
        path: { file_id: fileId },
        query: options,
      }
    )
    return download_url
  }

  return {
    async upload(file, options = {}) {
      // A `Blob` may actually be a DOM `File` with a `.name` — read structurally.
      const filename = options.filename ?? (file as { name?: string }).name
      if (!filename) {
        throw new Error('A filename is required — pass `options.filename` when uploading a Blob.')
      }
      const mimetype = options.mimetype ?? (file.type || 'application/octet-stream')

      const abortable = options.signal ? { overrides: { signal: options.signal } } : {}
      const { upload_url, s3_key } = await client.api.post('/api/v1/files/presigned-urls', {
        body: { filename, mimetype },
        ...abortable,
      })

      const stored = await doFetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': mimetype },
        body: file,
        signal: options.signal,
      })
      if (!stored.ok) {
        throw new Error(`S3 upload failed with status ${stored.status}`)
      }

      return await client.api.post('/api/v1/files/completions', {
        body: { s3_key, filename },
        ...abortable,
      })
    },

    async uploadDirect(file, options = {}) {
      const { public: isPublic, ...uploadOptions } = options
      return await client.upload<Schemas.FileUploadResponse>('/api/v1/files/', file, {
        ...uploadOptions,
        ...(isPublic !== undefined ? { fields: { public: String(isPublic) } } : {}),
      })
    },

    async uploadBatch(files, options = {}) {
      const unnamed = files.findIndex(file => !(file as { name?: string }).name)
      if (unnamed !== -1) {
        throw new Error(
          `Batch file at index ${unnamed} has no filename — wrap plain Blobs in \`new File([blob], name)\`.`
        )
      }
      return await client.upload<Schemas.BatchFileUploadResult[]>('/api/v1/files/batch', files, {
        ...options,
        fieldName: 'files',
      })
    },

    async verify(fileId) {
      return await client.api.post('/api/v1/files/{file_id}/verifications', {
        path: { file_id: fileId },
      })
    },

    async get(fileId) {
      return await client.api.get('/api/v1/files/{file_id}', { path: { file_id: fileId } })
    },

    presignedUrl,

    async download(fileId, options = {}) {
      const { signal, ...presignedOptions } = options
      const url = await presignedUrl(fileId, presignedOptions)
      return downloadPresignedUrl(doFetch, url, signal, 'File download')
    },

    async delete(fileId) {
      await client.api.delete('/api/v1/files/{file_id}', { path: { file_id: fileId } })
    },

    async revisions(noteId, fileId, options) {
      return await client.api.get('/api/v1/notes/{note_id}/files/{file_id}/revisions', {
        path: { note_id: noteId, file_id: fileId },
        query: buildListQuery(options) as FileRevisionsEndpointQuery,
      })
    },

    async revertRevision(noteId, fileId, revisionId) {
      return await client.api.post(
        '/api/v1/notes/{note_id}/files/{file_id}/revisions/{revision_id}/revert',
        {
          path: { note_id: noteId, file_id: fileId, revision_id: revisionId },
        }
      )
    },
  }
}
