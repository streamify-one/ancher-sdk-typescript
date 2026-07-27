/**
 * Error types for the Ancher SDK.
 *
 * Mirrors the error envelope the Ancher API returns:
 *
 * ```json
 * { "error": { "code": "API-BIS002", "message": "Insufficient credits" } }
 * ```
 *
 * or the FastAPI validation shape:
 *
 * ```json
 * { "detail": [{ "loc": ["body", "name"], "msg": "field required", "type": "value_error.missing" }] }
 * ```
 *
 * The machine-readable `code` is resolved against the generated catalog in
 * {@link ./error-codes} (mirroring the backend's `app/errors.py`) so a caught
 * error can expose its canonical definition — message, HTTP status, and
 * module/layer breakdown — via {@link AncherApiError.definition}.
 */

import {
  type ApiErrorCode,
  type ApiErrorDefinition,
  getErrorDefinition,
  parseErrorCode,
} from './error-codes'

export {
  API_ERROR_DEFINITIONS,
  API_ERROR_LAYERS,
  API_ERROR_MODULES,
  type ApiErrorCode,
  ApiErrorCodes,
  type ApiErrorDefinition,
  getErrorDefinition,
  parseErrorCode,
} from './error-codes'

/** A code value that is either a known {@link ApiErrorCode} or any other string. */
type MaybeApiErrorCode = ApiErrorCode | (string & {})

/**
 * Structural shape of a normalized API error (the wire envelope's fields after
 * parsing). {@link AncherApiError} instances satisfy this, and so do the plain
 * error objects some hosts throw from their own glue (e.g. a synthesized
 * `{ message, status }` on a failed refresh). Use this as the *type* for a
 * caught API error when you only care about the shape, and {@link isApiError}
 * as the matching structural guard.
 */
export interface ApiError {
  /** Machine-readable API error code, e.g. `API-BIS002` (insufficient credits). */
  code?: MaybeApiErrorCode
  details?: Array<{ loc: string[]; msg: string; type: string }>
  message: string
  status: number
  /** W3C trace id for the failed request — the key into Tempo/Loki. */
  traceId?: string
}

/** A normalized API error thrown by the SDK transport for non-2xx responses. */
export class AncherApiError extends Error {
  /** HTTP status code. */
  readonly status: number
  /** Machine-readable API error code, e.g. `API-BIS002` (insufficient credits). */
  readonly code?: MaybeApiErrorCode
  /** FastAPI-style validation details, when present. */
  readonly details?: Array<{ loc: string[]; msg: string; type: string }>
  /** The raw parsed response body, for callers that need more than the above. */
  readonly body?: unknown
  /**
   * W3C trace id for the failed request — the key support uses to find the
   * exact request in Tempo (and its log lines in Loki). Read from the error
   * envelope's `trace_id`, falling back to the `X-Trace-Id` response header.
   */
  readonly traceId?: string

  constructor(init: {
    message: string
    status: number
    code?: string
    details?: AncherApiError['details']
    body?: unknown
    traceId?: string
  }) {
    super(init.message)
    this.name = 'AncherApiError'
    this.status = init.status
    this.code = init.code
    this.details = init.details
    this.body = init.body
    this.traceId = init.traceId
  }

  /**
   * The canonical catalog definition for {@link code} (name + default message +
   * HTTP status), or `undefined` if the code isn't a known API error code.
   */
  get definition(): ApiErrorDefinition | undefined {
    return getErrorDefinition(this.code)
  }

  /**
   * The decoded module / layer / sequence of {@link code}, e.g. `API-BIS002` →
   * `{ module: 'BI', moduleName: 'Billing …', layer: 'S', … }`. `undefined` for
   * a malformed/absent code.
   */
  get parsedCode(): ReturnType<typeof parseErrorCode> {
    return parseErrorCode(this.code)
  }
}

/** API error code returned when the user's credit balance can't cover new billable work. */
export const INSUFFICIENT_CREDITS_ERROR_CODE = 'API-BIS002'

/** API error code returned when a user must consume an activation code before continuing. */
export const ACTIVATION_REQUIRED_ERROR_CODE = 'API-USR010'

/**
 * Type guard for {@link AncherApiError} (a precise `instanceof` check).
 */
export function isAncherApiError(error: unknown): error is AncherApiError {
  return error instanceof AncherApiError
}

/**
 * Structural guard for {@link ApiError}: any object carrying `message` + `status`.
 * Looser than {@link isAncherApiError} on purpose — it matches both
 * `AncherApiError` instances and plain `{ message, status }` error envelopes, so
 * callers narrowing a caught `unknown` keep working regardless of who threw it.
 */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

/**
 * Structural check for the billing admission refusal (HTTP 402 / `API-BIS002`).
 *
 * Checks `code` rather than `status` so it matches both {@link AncherApiError}
 * instances and any object carrying the same `code` — the code, not the status,
 * is the contract.
 */
export function isInsufficientCreditsError(error: unknown): boolean {
  return hasErrorCode(error, INSUFFICIENT_CREDITS_ERROR_CODE)
}

/**
 * Structural check for the activation gate (HTTP 403 / `API-USR010`).
 */
export function isActivationRequiredError(error: unknown): boolean {
  return hasErrorCode(error, ACTIVATION_REQUIRED_ERROR_CODE)
}

/**
 * Structural check that an error carries a specific API error code. Works for
 * both {@link AncherApiError} instances and any object with a matching `code`.
 * Pass an {@link ApiErrorCode} for autocompletion (e.g. `ApiErrorCodes.CONVERSATION_RUN_IN_PROGRESS`).
 */
export function hasErrorCode(error: unknown, code: MaybeApiErrorCode): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}

/**
 * Parse a non-OK `Response` into an {@link AncherApiError}, reading the JSON
 * error envelope for the machine-readable `code`, `message`, `trace_id`, and
 * validation `details` when present. Never throws — falls back to status text.
 *
 * The trace id falls back to the `X-Trace-Id` response header, so it survives
 * responses that aren't our envelope at all (a gateway 502, an HTML error page).
 */
export async function buildApiError(
  response: Response,
  fallbackMessage?: string
): Promise<AncherApiError> {
  let message =
    fallbackMessage || response.statusText || `Request failed with status ${response.status}`
  let details: AncherApiError['details']
  let code: string | undefined
  let body: unknown
  let traceId: string | undefined

  try {
    body = await response.clone().json()
    const errorBody = body as {
      error?: { code?: unknown; message?: unknown; trace_id?: unknown }
      detail?: unknown
      message?: unknown
    }
    traceId = typeof errorBody.error?.trace_id === 'string' ? errorBody.error.trace_id : undefined
    details = Array.isArray(errorBody.detail)
      ? (errorBody.detail as AncherApiError['details'])
      : undefined
    code = typeof errorBody.error?.code === 'string' ? errorBody.error.code : undefined
    message =
      (typeof errorBody.error?.message === 'string' ? errorBody.error.message : null) ||
      (typeof (errorBody.detail as { message?: unknown })?.message === 'string'
        ? (errorBody.detail as { message: string }).message
        : null) ||
      (typeof errorBody.detail === 'string' ? errorBody.detail : null) ||
      (typeof errorBody.message === 'string' ? errorBody.message : null) ||
      getErrorDefinition(code)?.message ||
      message
  } catch {
    // Body was not JSON / already consumed — keep the fallback message.
  }

  // `||=` (not `??=`) so an empty header normalizes to undefined rather than ''.
  traceId ||= response.headers.get('x-trace-id') || undefined

  return new AncherApiError({ message, status: response.status, code, details, body, traceId })
}
