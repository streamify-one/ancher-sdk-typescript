/// <reference lib="dom" />
/**
 * Multipart upload helper — the generalized port of `apiUpload` from the
 * design-system's `src/lib/api-client.ts`. The generated typed client only
 * speaks JSON; this covers `multipart/form-data` uploads with the same auth,
 * refresh, and activation-gate handling, plus optional progress reporting.
 */

import {
  abortError,
  buildContextHeaders,
  fetchWithDeadline,
  readWithDeadline,
  sendWithAuthRetry,
} from './auth'
import { ANCHER_BASE_URL, type AncherClientConfig } from './config'
import { newTraceId } from './trace'

export interface UploadOptions {
  /** Form field name for the file. Defaults to `'file'`. */
  fieldName?: string
  /** Extra scalar form fields appended alongside the file part(s). */
  fields?: Record<string, string>
  /**
   * Multipart part filename for a single-part upload. Defaults to the part's
   * own `.name` — a DOM `File`'s, or a {@link NativeFilePart}'s (array uploads
   * always use each part's `.name`).
   */
  filename?: string
  /** HTTP method for the multipart request. Defaults to `'POST'`. */
  method?: 'POST' | 'PUT'
  /** Progress callback (0–100). Uses `XMLHttpRequest` when available. */
  onProgress?: (progress: number) => void
  /** Abort signal. */
  signal?: AbortSignal
}

/**
 * React Native's file descriptor for `FormData`: the native networking layer
 * streams the file at `uri` itself, so no bytes cross into JS. Only React
 * Native's `FormData` understands it — the web/Node `FormData` stringifies a
 * plain object — so pass a `Blob` on those runtimes.
 */
export interface NativeFilePart {
  /** Local file URI (`file://…`, `content://…`, `ph://…`). */
  uri: string
  /** Multipart part filename (React Native percent-encodes non-ASCII names on the wire). */
  name: string
  /**
   * MIME type hint. Android refuses a part without one, so an empty string
   * falls back to `application/octet-stream`; iOS ignores it and sniffs the
   * type from the file extension. The API sniffs the real type from the bytes
   * either way.
   */
  type: string
}

/** One multipart file part: a `Blob`/`File`, or a React Native {@link NativeFilePart}. */
export type UploadPart = Blob | NativeFilePart

function isNativeFilePart(part: UploadPart): part is NativeFilePart {
  return typeof (part as NativeFilePart).uri === 'string'
}

export type Uploader = <T>(
  endpoint: string,
  file: UploadPart | readonly UploadPart[],
  options?: UploadOptions
) => Promise<T>

export function createUploader(config: AncherClientConfig): Uploader {
  const doFetch = config.fetch ?? globalThis.fetch
  const credentials = config.credentials ?? 'include'
  const baseUrl = config.baseUrl ?? ANCHER_BASE_URL

  async function authHeaders(traceId: string): Promise<Record<string, string>> {
    return { ...config.defaultHeaders, ...(await buildContextHeaders(config, traceId)) }
  }

  return async function upload<T>(
    endpoint: string,
    file: UploadPart | readonly UploadPart[],
    options: UploadOptions = {}
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`
    const fieldName = options.fieldName ?? 'file'
    const method = options.method ?? 'POST'
    // Held outside `send` so a 401 replay stays in the same trace.
    const traceId = newTraceId()

    const send = async (): Promise<Response> => {
      const formData = new FormData()
      const appendPart = (part: UploadPart, filename?: string) => {
        if (isNativeFilePart(part)) {
          // React Native's `FormData.append(name, value)` takes no filename
          // argument — the part's own `.name` is what it sends as the filename.
          const name = filename ?? part.name
          const type = part.type || 'application/octet-stream'
          // Pass the caller's object through untouched unless something must
          // change: an Expo `File` keeps `uri`/`type` on its prototype, which
          // a spread would drop — so rebuild the part from its properties.
          const named =
            name === part.name && type === part.type ? part : { uri: part.uri, name, type }
          formData.append(fieldName, named as unknown as Blob)
        } else if (filename !== undefined) {
          formData.append(fieldName, part, filename)
        } else {
          formData.append(fieldName, part)
        }
      }
      if (Array.isArray(file)) {
        // Repeated-field batch (e.g. `files`): each part carries its own
        // `.name`; plain Blobs fall back to the runtime default.
        for (const item of file as readonly UploadPart[]) appendPart(item)
      } else {
        appendPart(file as UploadPart, options.filename)
      }
      for (const [key, value] of Object.entries(options.fields ?? {})) {
        formData.append(key, value)
      }
      const headers = await authHeaders(traceId)
      // Do not set Content-Type; the runtime sets the multipart boundary.
      if (options.onProgress && typeof XMLHttpRequest !== 'undefined') {
        return uploadWithProgress(
          url,
          method,
          formData,
          headers,
          credentials,
          options.onProgress,
          options.signal,
          config.timeoutMs
        )
      }
      return fetchWithDeadline(config, options.signal, signal =>
        doFetch(url, { method, headers, credentials, body: formData, signal })
      )
    }

    // Same auth lifecycle as the JSON transport (`./auth`); `send` rebuilds the
    // multipart body + headers each attempt so retries pick up refreshed auth.
    const response = await sendWithAuthRetry(config, send, {
      throwOnStatusError: true,
      errorMessage: r => `Upload failed with status ${r.status}`,
      signal: options.signal,
    })

    return parseBody<T>(response)
  }
}

function parseBody<T>(response: Response): Promise<T> {
  // Body-phase timeouts must surface as `TimeoutError` as well, and the
  // deadline is released once the body is consumed (see `auth.ts`).
  return readWithDeadline(response, async () => {
    if (response.status === 204) return undefined as T
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  })
}

function uploadWithProgress(
  url: string,
  method: 'POST' | 'PUT',
  body: FormData,
  headers: Record<string, string>,
  credentials: RequestCredentials,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
  timeoutMs?: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const abortUpload = () => xhr.abort()

    if (signal?.aborted) {
      reject(abortError('Upload cancelled', 'AbortError'))
      return
    }
    signal?.addEventListener('abort', abortUpload, { once: true })
    const cleanup = () => signal?.removeEventListener('abort', abortUpload)

    xhr.open(method, url)
    xhr.withCredentials = credentials === 'include'
    if (timeoutMs && timeoutMs > 0) {
      xhr.timeout = timeoutMs
      xhr.ontimeout = () => {
        cleanup()
        reject(abortError('Upload timed out', 'TimeoutError'))
      }
    }
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }

    let lastReported = 0
    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) return
      const value = Math.min(Math.round((event.loaded / event.total) * 100), 95)
      if (value > lastReported) {
        lastReported = value
        onProgress(value)
      }
    }
    xhr.onload = () => {
      cleanup()
      onProgress(100)
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseXhrHeaders(xhr.getAllResponseHeaders()),
        })
      )
    }
    xhr.onerror = () => {
      cleanup()
      reject(new Error('Upload failed'))
    }
    xhr.onabort = () => {
      cleanup()
      reject(abortError('Upload cancelled', 'AbortError'))
    }
    xhr.send(body)
  })
}

function parseXhrHeaders(rawHeaders: string): Headers {
  const headers = new Headers()
  for (const line of rawHeaders.trim().split(/[\r\n]+/)) {
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue
    headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
  }
  return headers
}
