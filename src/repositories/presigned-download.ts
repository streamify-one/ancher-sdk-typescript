import type { EndpointByMethod } from '../api/generated/api.client'

export type PresignedUrlQueryOptions =
  EndpointByMethod['post']['/api/v1/files/{file_id}/content/presigned-urls']['parameters']['query']

export type PresignedUrlKind = 'content' | 'display' | 'thumbnail'

export interface PresignedDownloadOptions extends PresignedUrlQueryOptions {
  /** Abort signal for the CDN fetch. */
  signal?: AbortSignal
}

export async function downloadPresignedUrl(
  doFetch: typeof fetch,
  url: string,
  signal: AbortSignal | undefined,
  label: string
): Promise<Response> {
  const response = await doFetch(url, { signal })
  if (!response.ok) {
    throw new Error(`${label} failed with status ${response.status}`)
  }
  return response
}
