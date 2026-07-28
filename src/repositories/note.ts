/**
 * Note repository. `sdk.Note` exposes plain-data reads/creates plus the
 * per-record operations (`update`/`delete`/`retry`/`copy`/`setTags`), each
 * taking the note id as its first argument. Lists take the TypeScript-native
 * `{ where, orderBy, … }` options (see `../contracts/query`); returned notes
 * are plain `Schemas.Note` data — no model class.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type { UploadOptions } from '../api/upload'
import type {
  CreateNoteFromFileRequest,
  Note,
  NoteOrderBy,
  NoteSuggestedCollectionsOptions,
  NoteWhere,
} from '../contracts/note'
import { createListSurface, type ListSurface } from './base'
import {
  downloadPresignedUrl,
  type PresignedDownloadOptions,
  type PresignedUrlQueryOptions,
} from './presigned-download'
import { buildListQuery } from './query'
import { fetchRawContent, type RawContentOptions } from './raw-content'

export type NoteRetryQuery =
  EndpointByMethod['post']['/api/v1/notes/{note_id}/retry']['parameters']['query']

type NoteListEndpointQuery = EndpointByMethod['get']['/api/v1/notes/']['parameters']['query']
type NoteSuggestedCollectionsEndpointQuery =
  EndpointByMethod['get']['/api/v1/notes/{note_id}/suggested-collections']['parameters']['query']

export type NotePresignedUrlOptions = PresignedUrlQueryOptions
export type NoteDownloadOptions = PresignedDownloadOptions
export type NoteContentOptions = RawContentOptions
export type NoteFileContentUpdateOptions = Pick<UploadOptions, 'filename' | 'onProgress' | 'signal'>

export interface NoteRepository extends ListSurface<Note, NoteWhere, NoteOrderBy> {
  /** Create a note from an artifact. */
  createFromArtifact(body: Schemas.NoteCreateFromArtifact): Promise<Note>
  /** Create a note from a conversation. */
  createFromConversation(body: Schemas.NoteCreateFromConversation): Promise<Note>
  /**
   * Create one note from one or more already-uploaded files. Pass `file_id`
   * for a single file, or `file_ids` to combine several into one note.
   */
  createFromFile(body: CreateNoteFromFileRequest): Promise<Note>
  /** Create a note from a message. */
  createFromMessage(body: Schemas.NoteCreateFromMessage): Promise<Note>
  /** Create a note from plain text. */
  createFromText(body: Schemas.ArticleCreateFromText): Promise<Note>
  /** Create a note from a URL (or share text containing one). */
  createFromUrl(body: Schemas.ArticleCreateFromUrl): Promise<Note>
  /** Get a note by id. */
  get(noteId: string): Promise<Note>
  /** Get a public note by its share slug. */
  getBySlug(slug: string): Promise<Note>
  /**
   * Fetch a note's resolved content. The body is the content itself —
   * markdown/HTML text, or the image bytes for image notes — so this returns
   * the raw `Response` (branch on its `Content-Type`, then `text()`/`blob()`).
   * Throws `AncherApiError` on a non-2xx status.
   */
  getContent(noteId: string, options?: NoteContentOptions): Promise<Response>
  /** Mint a presigned CDN URL for a note's display file. */
  displayPresignedUrl(noteId: string, options?: NotePresignedUrlOptions): Promise<string>
  /**
   * Mint a presigned CDN URL for a note's display file and fetch it
   * credential-less. Returns the raw response.
   */
  downloadDisplay(noteId: string, options?: NoteDownloadOptions): Promise<Response>
  /** Mint a presigned CDN URL for a file through note-scoped access rules. */
  filePresignedUrl(
    noteId: string,
    fileId: string,
    options?: NotePresignedUrlOptions
  ): Promise<string>
  /**
   * Mint a note-scoped file presigned URL and fetch it credential-less. Returns
   * the raw response.
   */
  downloadFile(noteId: string, fileId: string, options?: NoteDownloadOptions): Promise<Response>
  /** Get a file's metadata through note-scoped access rules. */
  getFile(noteId: string, fileId: string): Promise<Schemas.FileInfo>
  /**
   * Replace a note's content file (multipart `PUT`); the server records a new
   * revision. Returns the updated file data.
   */
  updateFileContent(
    noteId: string,
    fileId: string,
    file: Blob,
    options?: NoteFileContentUpdateOptions
  ): Promise<Schemas.FileUploadResponse>
  /** List the collections the classifier suggested for a note (paginated). */
  suggestedCollections(
    noteId: string,
    options?: NoteSuggestedCollectionsOptions
  ): Promise<Schemas.Page_CollectionSuggestion_>
  /** Update a note (`PATCH`); returns the updated note. */
  update(noteId: string, patch: Schemas.NoteUpdate): Promise<Note>
  /** Delete a note (`DELETE`). */
  delete(noteId: string): Promise<void>
  /** Retry a note's content pipeline (`POST`); returns the updated note. */
  retry(noteId: string, query?: NoteRetryQuery): Promise<Note>
  /** Copy a (public) note for the current user; returns the new note. */
  copy(noteId: string, body?: Schemas.NoteCopy): Promise<Note>
  /** Set a note's tags (`PUT`, replaces all existing); returns the updated note. */
  setTags(noteId: string, body: Schemas.NoteTagsUpdate): Promise<Note>
}

export function createNoteRepository(client: AncherClient): NoteRepository {
  const listSurface = createListSurface<Note, NoteWhere, NoteOrderBy>((query) =>
    client.api.get('/api/v1/notes/', {
      query: query as NoteListEndpointQuery,
    })
  )
  const doFetch = client.config.fetch ?? globalThis.fetch
  const displayPresignedUrl: NoteRepository['displayPresignedUrl'] = async (
    noteId,
    options = {}
  ) => {
    const { download_url } = await client.api.post(
      '/api/v1/notes/{note_id}/display/presigned-urls',
      {
        path: { note_id: noteId },
        query: options,
      }
    )
    return download_url
  }
  const filePresignedUrl: NoteRepository['filePresignedUrl'] = async (
    noteId,
    fileId,
    options = {}
  ) => {
    const { download_url } = await client.api.post(
      '/api/v1/notes/{note_id}/files/{file_id}/content/presigned-urls',
      {
        path: { note_id: noteId, file_id: fileId },
        query: options,
      }
    )
    return download_url
  }

  return {
    ...listSurface,
    async get(noteId) {
      return await client.api.get('/api/v1/notes/{note_id}', { path: { note_id: noteId } })
    },
    async getBySlug(slug) {
      return await client.api.get('/api/v1/notes/by-slug/{slug}', { path: { slug } })
    },
    async getContent(noteId, options) {
      return await fetchRawContent(
        client,
        `/api/v1/notes/${encodeURIComponent(noteId)}/content`,
        options,
        'Note content fetch failed'
      )
    },
    displayPresignedUrl,
    async downloadDisplay(noteId, options = {}) {
      const { signal, ...presignedOptions } = options
      const url = await displayPresignedUrl(noteId, presignedOptions)
      return downloadPresignedUrl(doFetch, url, signal, 'Note display download')
    },
    filePresignedUrl,
    async downloadFile(noteId, fileId, options = {}) {
      const { signal, ...presignedOptions } = options
      const url = await filePresignedUrl(noteId, fileId, presignedOptions)
      return downloadPresignedUrl(doFetch, url, signal, 'Note file download')
    },
    async getFile(noteId, fileId) {
      return await client.api.get('/api/v1/notes/{note_id}/files/{file_id}', {
        path: { note_id: noteId, file_id: fileId },
      })
    },
    async updateFileContent(noteId, fileId, file, options = {}) {
      return await client.upload<Schemas.FileUploadResponse>(
        `/api/v1/notes/${encodeURIComponent(noteId)}/files/${encodeURIComponent(fileId)}/content`,
        file,
        { ...options, method: 'PUT' }
      )
    },
    async suggestedCollections(noteId, options) {
      return await client.api.get('/api/v1/notes/{note_id}/suggested-collections', {
        path: { note_id: noteId },
        query: buildListQuery(options) as NoteSuggestedCollectionsEndpointQuery,
      })
    },
    async createFromText(body) {
      return await client.api.post('/api/v1/notes/text', { body })
    },
    async createFromUrl(body) {
      return await client.api.post('/api/v1/notes/url', { body })
    },
    async createFromFile(body) {
      return await client.api.post('/api/v1/notes/files', { body })
    },
    async createFromArtifact(body) {
      return await client.api.post('/api/v1/notes/artifacts', { body })
    },
    async createFromConversation(body) {
      return await client.api.post('/api/v1/notes/conversations', { body })
    },
    async createFromMessage(body) {
      return await client.api.post('/api/v1/notes/messages', { body })
    },
    async update(noteId, patch) {
      return await client.api.patch('/api/v1/notes/{note_id}', {
        path: { note_id: noteId },
        body: patch,
      })
    },
    async delete(noteId) {
      await client.api.delete('/api/v1/notes/{note_id}', { path: { note_id: noteId } })
    },
    async retry(noteId, query) {
      return await client.api.post('/api/v1/notes/{note_id}/retry', {
        path: { note_id: noteId },
        query: query ?? {},
      })
    },
    async copy(noteId, body) {
      return await client.api.post('/api/v1/notes/{note_id}/copy', {
        path: { note_id: noteId },
        body: body ?? {},
      })
    },
    async setTags(noteId, body) {
      return await client.api.put('/api/v1/notes/{note_id}/tags', {
        path: { note_id: noteId },
        body,
      })
    },
  }
}
