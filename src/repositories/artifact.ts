/**
 * Artifact repository (`/artifacts`). `sdk.Artifact` exposes plain-data
 * reads/creates plus the per-record operations (`update`/`delete`), each
 * taking the artifact id as its first argument. Lists take the
 * TypeScript-native `{ where, orderBy, … }` options (see `../contracts/query`);
 * returned artifacts are plain data via the `Artifact` contract alias — no
 * model class.
 */

import type { AncherClient } from '../api/client'
import { buildApiError } from '../api/errors'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type { UploadOptions } from '../api/upload'
import type {
  Artifact,
  ArtifactOrderBy,
  ArtifactUpdate,
  ArtifactWhere,
} from '../contracts/artifact'
import type { FileUploadResponse } from '../contracts/file'
import { createListSurface, type ListSurface } from './base'
import {
  downloadPresignedUrl,
  type PresignedDownloadOptions,
  type PresignedUrlKind,
  type PresignedUrlQueryOptions,
} from './presigned-download'
import { fetchRawContent, type RawContentOptions } from './raw-content'

type ArtifactListEndpointQuery = EndpointByMethod['get']['/api/v1/artifacts/']['parameters']['query']
export type ArtifactDownloadKind = PresignedUrlKind

export interface ArtifactPresignedUrlOptions extends PresignedUrlQueryOptions {
  /**
   * Which artifact file sibling to sign. `display` falls back to content
   * server-side; `thumbnail` falls back to content when no thumbnail exists.
   */
  kind?: ArtifactDownloadKind
}

export interface ArtifactDownloadOptions
  extends ArtifactPresignedUrlOptions,
    Pick<PresignedDownloadOptions, 'signal'> {}

export type ArtifactContentOptions = RawContentOptions
export type ArtifactContentUpdateOptions = Pick<UploadOptions, 'filename' | 'onProgress' | 'signal'>

export interface ArtifactRepository extends ListSurface<Artifact, ArtifactWhere, ArtifactOrderBy> {
  /** Create an artifact wrapping an uploaded file. */
  create(body: Schemas.ArtifactCreate): Promise<Artifact>
  /** Get an artifact by id. */
  get(artifactId: string): Promise<Artifact>
  /** Get a public artifact by its share slug. */
  getBySlug(slug: string): Promise<Artifact>
  /** Update an artifact (`PATCH`). */
  update(artifactId: string, patch: ArtifactUpdate): Promise<Artifact>
  /** Delete an artifact (`DELETE`). */
  delete(artifactId: string): Promise<void>
  /** Set an artifact's tags (`PUT`, replaces all existing); returns the updated artifact. */
  setTags(artifactId: string, body: Schemas.ArtifactTagsUpdate): Promise<Artifact>
  /** Mint a presigned CDN URL for an artifact file sibling. */
  presignedUrl(artifactId: string, options?: ArtifactPresignedUrlOptions): Promise<string>
  /**
   * Mint a presigned CDN URL and fetch it credential-less. Returns the raw
   * response so callers can choose `blob()`, `text()`, or streaming reads.
   */
  download(artifactId: string, options?: ArtifactDownloadOptions): Promise<Response>
  /**
   * Fetch an artifact's content **as stored**. The body is the content itself
   * — markdown/HTML text or binary — so this returns the raw `Response`.
   * Throws `AncherApiError` on a non-2xx status.
   *
   * Embedded `streamify-file://<id>` markers arrive **unresolved**; mint each
   * referenced file via `filePresignedUrl` to render them, and never persist
   * the resolved form.
   */
  getContent(artifactId: string, options?: ArtifactContentOptions): Promise<Response>
  /**
   * Mint a presigned CDN URL for a file embedded in the artifact's body,
   * gated by artifact access rather than the file's own.
   *
   * This is how a `streamify-file://<id>` marker in a markdown/HTML body is
   * resolved for display. Artifact ownership (or its public flag) gates the
   * mint, so a share viewer reading a public artifact can load its images
   * without those files being public in their own right.
   *
   * There is no `revision`: a marker names a file, not a revision, and the API
   * signs only the current one on this route.
   */
  filePresignedUrl(
    artifactId: string,
    fileId: string,
    options?: Omit<PresignedUrlQueryOptions, 'revision'>
  ): Promise<string>
  /**
   * Replace an artifact's content file (multipart `PUT`); the server records
   * a new revision. Returns the updated file data.
   */
  updateContent(
    artifactId: string,
    file: Blob,
    options?: ArtifactContentUpdateOptions
  ): Promise<FileUploadResponse>
}

export function createArtifactRepository(client: AncherClient): ArtifactRepository {
  const listSurface = createListSurface<Artifact, ArtifactWhere, ArtifactOrderBy>((query) =>
    client.api.get('/api/v1/artifacts/', {
      query: query as ArtifactListEndpointQuery,
    })
  )
  const doFetch = client.config.fetch ?? globalThis.fetch
  const filePresignedUrl: ArtifactRepository['filePresignedUrl'] = async (
    artifactId,
    fileId,
    options = {}
  ) => {
    // Raw `request`: this endpoint postdates the committed OpenAPI snapshot,
    // so it has no generated path type yet. Swap for `client.api.post` once
    // codegen catches up.
    const query = new URLSearchParams(
      Object.entries(options).flatMap(([key, value]) =>
        value == null ? [] : [[key, String(value)] as [string, string]]
      )
    ).toString()
    const response = await client.request(
      `/api/v1/artifacts/${encodeURIComponent(artifactId)}/files/${encodeURIComponent(fileId)}/content/presigned-urls${query ? `?${query}` : ''}`,
      { method: 'POST' }
    )
    if (!response.ok) {
      throw await buildApiError(response, 'Artifact file presign failed')
    }
    const { download_url: downloadUrl } = (await response.json()) as { download_url: string }
    return downloadUrl
  }
  const presignedUrl: ArtifactRepository['presignedUrl'] = async (artifactId, options = {}) => {
    const { kind = 'content', ...query } = options
    const body =
      kind === 'content'
        ? await client.api.post('/api/v1/artifacts/{artifact_id}/content/presigned-urls', {
            path: { artifact_id: artifactId },
            query,
          })
        : kind === 'display'
          ? await client.api.post('/api/v1/artifacts/{artifact_id}/display/presigned-urls', {
              path: { artifact_id: artifactId },
              query,
            })
          : await client.api.post('/api/v1/artifacts/{artifact_id}/thumbnail/presigned-urls', {
              path: { artifact_id: artifactId },
              query,
            })
    return body.download_url
  }

  return {
    ...listSurface,
    filePresignedUrl,
    async get(artifactId) {
      return await client.api.get('/api/v1/artifacts/{artifact_id}', {
        path: { artifact_id: artifactId },
      })
    },
    async getBySlug(slug) {
      return await client.api.get('/api/v1/artifacts/by-slug/{slug}', { path: { slug } })
    },
    async create(body) {
      return await client.api.post('/api/v1/artifacts/', { body })
    },
    async update(artifactId, patch) {
      return await client.api.patch('/api/v1/artifacts/{artifact_id}', {
        path: { artifact_id: artifactId },
        body: patch,
      })
    },
    async delete(artifactId) {
      await client.api.delete('/api/v1/artifacts/{artifact_id}', {
        path: { artifact_id: artifactId },
      })
    },
    async setTags(artifactId, body) {
      return await client.api.put('/api/v1/artifacts/{artifact_id}/tags', {
        path: { artifact_id: artifactId },
        body,
      })
    },
    presignedUrl,
    async download(artifactId, options = {}) {
      const { signal, ...presignedOptions } = options
      const url = await presignedUrl(artifactId, presignedOptions)
      return downloadPresignedUrl(doFetch, url, signal, 'Artifact download')
    },
    async getContent(artifactId, options) {
      return await fetchRawContent(
        client,
        `/api/v1/artifacts/${encodeURIComponent(artifactId)}/content`,
        options,
        'Artifact content fetch failed'
      )
    },
    async updateContent(artifactId, file, options = {}) {
      return await client.upload<FileUploadResponse>(
        `/api/v1/artifacts/${encodeURIComponent(artifactId)}/content`,
        file,
        { ...options, method: 'PUT' }
      )
    },
  }
}
