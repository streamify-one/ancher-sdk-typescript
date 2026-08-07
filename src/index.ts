/**
 * Ancher API SDK — public surface.
 *
 * A fully-typed TypeScript client for the Ancher API, generated from the
 * OpenAPI spec (`pnpm generate`) and fronted by a configurable transport
 * (auth, CSRF, silent refresh, error normalization).
 */

// Raw API layer — generated typed client + transport.
export { type AncherClient, createAncherClient } from './api/client'
export { ANCHER_BASE_URL, type AncherClientConfig, type MaybePromise } from './api/config'
// Errors
export {
  ACTIVATION_REQUIRED_ERROR_CODE,
  AncherApiError,
  API_ERROR_DEFINITIONS,
  API_ERROR_LAYERS,
  API_ERROR_MODULES,
  type ApiError,
  type ApiErrorCode,
  ApiErrorCodes,
  type ApiErrorDefinition,
  buildApiError,
  getErrorDefinition,
  hasErrorCode,
  INSUFFICIENT_CREDITS_ERROR_CODE,
  isActivationRequiredError,
  isAncherApiError,
  isApiError,
  isInsufficientCreditsError,
  parseErrorCode,
} from './api/errors'
// W3C Trace Context helpers — for hand-built requests that bypass the transport.
export { formatTraceparent, newSpanId, newTraceId, newTraceparent } from './api/trace'
// Generated client — types only (`Schemas` is a type-only namespace of every
// request/response shape, e.g. `Schemas.Note`).
export type {
  EndpointByMethod,
  EndpointParameters,
  ErrorStatusCode,
  Fetcher,
  Method,
  Schemas,
  SuccessStatusCode,
} from './api/generated/api.client'
// Generated client — runtime values + low-level escape hatches.
export {
  ApiClient,
  createApiClient,
  errorStatusCodes,
  successStatusCodes,
  TypedStatusError,
} from './api/generated/api.client'
// Token lifecycle primitive — shared core behind the OAuth2 preset.
export {
  createTokenManager,
  type ManagedTokens,
  memoryTokenStore,
  type TokenManager,
  type TokenManagerOptions,
  type TokenStore,
} from './api/token-manager'
// Transport / upload (advanced)
export { createFetcher } from './api/transport'
export { createUploader, type Uploader, type UploadOptions } from './api/upload'
export {
  appendVisibleTextPart,
  createInitialStreamState,
  dispatchSSEEvent,
  parseSSEEvent,
  processSSEBuffer,
  traceEventToMessageEvents,
  type AgentRunContext,
  type AgentToolCall,
  type AgentToolReturn,
  type SSEHandlers,
  type SSEStreamState,
} from './sse-conversation'
// SDK layer — entity repositories (createAncherSdk) + model/repository types.
export * from './create-ancher-sdk'
