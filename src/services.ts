/**
 * Action/singleton services — SDK-layer repositories for resources that are
 * operations rather than CRUD entities, so they have no model class. They
 * return the raw response types (typed) directly.
 */

import type { AncherClient } from './api/client'
import type { EndpointByMethod, Schemas } from './api/generated/api.client'

// --- Billing (`/me/billing`, `/plans`) ---

/** Provider path param for the plans listing. */
export type PlansProvider =
  EndpointByMethod['get']['/api/v1/plans/{provider}']['parameters']['path']['provider']

export interface BillingRepository {
  /** Change the active plan (may return a checkout URL). */
  changePlan(body: Schemas.PlanChangeRequest): Promise<Schemas.PlanChangeResponse>
  /** Create a checkout session for a plan. */
  createCheckoutSession(
    body: Schemas.CheckoutSessionRequest
  ): Promise<Schemas.CheckoutSessionResponse>
  /** Create a Stripe billing-portal session. */
  createPortalSession(
    body?: Schemas.StripePortalSessionRequest
  ): Promise<Schemas.StripePortalSessionResponse>
  /** Current credit balance (subscription + topup buckets). */
  credits(): Promise<Schemas.BalanceResponse>
  /** Poll a checkout session's status. */
  getCheckoutSession(sessionId: string): Promise<Schemas.CheckoutSessionStatusResponse>
  /** List available plans for a provider. */
  plans(provider: PlansProvider): Promise<Schemas.PlanListResponse>
  /** Redeem a discount code. */
  redeemDiscountCode(
    body: Schemas.RedeemDiscountCodeRequest
  ): Promise<Schemas.RedeemDiscountCodeResponse>
  /** Current subscription + plan. */
  subscription(): Promise<Schemas.SubscriptionResponse>
  /** Verify a store purchase (mobile IAP). */
  verifyPurchase(body: Schemas.PurchaseVerifyRequest): Promise<Schemas.PurchaseResponse>
}

export function createBillingRepository(client: AncherClient): BillingRepository {
  return {
    credits: () => client.api.get('/api/v1/me/billing/credits'),
    subscription: () => client.api.get('/api/v1/me/billing/subscription'),
    redeemDiscountCode: body =>
      client.api.post('/api/v1/me/billing/discount-codes/redeem', { body }),
    createCheckoutSession: body => client.api.post('/api/v1/me/billing/checkout-session', { body }),
    getCheckoutSession: sessionId =>
      client.api.get('/api/v1/me/billing/checkout-session/{session_id}', {
        path: { session_id: sessionId },
      }),
    changePlan: body => client.api.post('/api/v1/me/billing/plan', { body }),
    createPortalSession: body =>
      client.api.post('/api/v1/me/billing/stripe/portal-session', { body: body ?? {} }),
    verifyPurchase: body => client.api.post('/api/v1/me/billing/purchases', { body }),
    plans: provider => client.api.get('/api/v1/plans/{provider}', { path: { provider } }),
  }
}

// --- Device (`/devices`) ---

export interface DeviceRepository {
  /** Register/update this device's push notification token. */
  setNotificationToken(token: string): Promise<void>
}

export function createDeviceRepository(client: AncherClient): DeviceRepository {
  return {
    async setNotificationToken(token) {
      await client.api.put('/api/v1/devices/current/notification-token', {
        body: { notification_token: token },
      })
    },
  }
}

// --- Retrieval (`/retrievals`, RAG) ---

export interface RetrievalRepository {
  /** Retrieve relevant content chunks for a query (RAG). */
  chunks(query: string): Promise<Schemas.Chunk[]>
  /**
   * Retrieve relevant notes for a query (RAG). Accepts either a plain query
   * string or the full {@link Schemas.RetrievalRequest} body (limit + filters).
   */
  notes(query: string | Schemas.RetrievalRequest): Promise<Schemas.NoteRetrievalResult[]>
}

export function createRetrievalRepository(client: AncherClient): RetrievalRepository {
  return {
    notes: query =>
      client.api.post('/api/v1/retrievals', {
        body: typeof query === 'string' ? { query } : query,
      }),
    chunks: query => client.api.post('/api/v1/retrievals/chunks', { body: { query } }),
  }
}

// --- Web session (`/web-session`, cookie auth) ---

/** OAuth provider path param for the web-session OAuth login route. */
export type WebSessionProvider =
  EndpointByMethod['post']['/api/v1/web-session/{provider}']['parameters']['path']['provider']

/**
 * Body of the web OAuth login response. The endpoint sets the session cookies
 * and returns only `is_new_user`, which the client reads to fire its
 * client-side sign_up analytics event.
 *
 * NOTE: hand-typed bridge until the next `openapi.json` regen surfaces
 * `Schemas.OAuthWebLoginResponse`; swap this alias for it then.
 */
export interface OAuthWebLoginResult {
  is_new_user: boolean
}

/**
 * Cookie-session lifecycle for browser apps. The browser preset
 * (`@ancher-ai/sdk/browser`) already refreshes silently via `PUT /web-session`
 * internally — this surface is for the explicit auth flows a login UI drives.
 * The API sets/clears `HttpOnly` cookies on these calls; tokens are never
 * exposed to JS. OAuth login additionally returns `is_new_user` in the body.
 */
export interface WebSessionRepository {
  /** Info about the current cookie session (`GET /web-session`). */
  current(): Promise<Schemas.UserSessionResponse>
  /** Log in with email/password; the API sets the session cookies. */
  login(body: Schemas.WebLogin): Promise<void>
  /**
   * Log in with an OAuth ID token; the API sets the session cookies and returns
   * `is_new_user` so the client can fire its sign_up analytics event.
   */
  loginWithProvider(
    provider: WebSessionProvider,
    body: Schemas.OAuthLoginRequest
  ): Promise<OAuthWebLoginResult>
  /** Refresh the cookie session using the refresh-token cookie. */
  refresh(): Promise<void>
  /** Delete the session and clear the auth cookies (logout). */
  logout(): Promise<void>
}

export function createWebSessionRepository(client: AncherClient): WebSessionRepository {
  return {
    current: () => client.api.get('/api/v1/web-session'),
    // The `x-device-*`/`x-app-version` headers are optional wire params the
    // generated types still require structurally — send an empty object.
    async login(body) {
      await client.api.post('/api/v1/web-session', { header: {}, body })
    },
    async loginWithProvider(provider, body) {
      // The generated client still types this response as void (stale
      // `openapi.json`); the endpoint returns `{ is_new_user }` at runtime.
      // During rollout an old server may still 204 (empty body) — default to
      // is_new_user:false so login fails closed (no sign_up) instead of
      // throwing on the caller's `{ is_new_user }` destructure.
      const res = (await client.api.post('/api/v1/web-session/{provider}', {
        path: { provider },
        header: {},
        body,
      })) as unknown as OAuthWebLoginResult | null | undefined
      return res ?? { is_new_user: false }
    },
    async refresh() {
      await client.api.put('/api/v1/web-session', { header: {} })
    },
    async logout() {
      await client.api.delete('/api/v1/web-session')
    },
  }
}

// --- Image prompts (`/image-prompts`, multipart) ---

export interface ImagePromptRepository {
  /** Generate a prompt from an image (multipart upload). */
  generate(
    file: Blob,
    options?: { onProgress?: (progress: number) => void; signal?: AbortSignal }
  ): Promise<Schemas.ImagePromptResponse>
}

export function createImagePromptRepository(client: AncherClient): ImagePromptRepository {
  return {
    generate: (file, options) =>
      client.upload<Schemas.ImagePromptResponse>('/api/v1/image-prompts/', file, {
        ...options,
        // The endpoint's multipart part is named `image`, not the uploader's
        // `file` default.
        fieldName: 'image',
      }),
  }
}

// --- Text selections (`/text-selections`) ---

/**
 * The three built-in text-selection toolbar actions, each backed by a dedicated
 * endpoint that returns a single {@link Schemas.TextSelectionResponse} (plain
 * text or light markdown) — no conversation/streaming.
 */
export interface TextSelectionRepository {
  /** Explain the selected text. */
  explain(text: string): Promise<Schemas.TextSelectionResponse>
  /** Summarize the selected text. */
  summarize(text: string): Promise<Schemas.TextSelectionResponse>
  /** Translate the selected text into `targetLanguage` (a name or BCP-47 tag). */
  translate(text: string, targetLanguage: string): Promise<Schemas.TextSelectionResponse>
}

export function createTextSelectionRepository(client: AncherClient): TextSelectionRepository {
  return {
    explain: text => client.api.post('/api/v1/text-selections/explanations', { body: { text } }),
    summarize: text => client.api.post('/api/v1/text-selections/summaries', { body: { text } }),
    translate: (text, targetLanguage) =>
      client.api.post('/api/v1/text-selections/translations', {
        body: { text, target_language: targetLanguage },
      }),
  }
}
