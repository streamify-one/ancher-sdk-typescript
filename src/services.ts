/**
 * Action/singleton services — SDK-layer repositories for resources that are
 * operations rather than CRUD entities, so they have no model class. They
 * return the raw response types (typed) directly.
 */

import type { AncherClient } from './api/client'
import type { EndpointByMethod, Schemas } from './api/generated/api.client'
import type { UsageActivityQuery } from './contracts/activity'

// --- Activity (`/activity`) ---

export interface ActivityRepository {
  /** Aggregated captures and artifact creations for an inclusive local-date window. */
  usage(query: UsageActivityQuery): Promise<Schemas.UsageActivity>
}

export function createActivityRepository(client: AncherClient): ActivityRepository {
  return {
    usage: query => client.api.get('/api/v1/activity/usage', { query }),
  }
}

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

// --- Onboarding (`/onboarding`) ---

export interface OnboardingRepository {
  /**
   * Claim the credits attached to a completed checklist item. Rejects with
   * `API-ONS001` when the task isn't completed yet and `API-ONS002` when it was
   * already claimed — both 409s, so treat them as state, not failure.
   */
  claimReward(task: Schemas.OnboardingTaskState['task']): Promise<Schemas.OnboardingReward>
  /** The checklist: every item with its completion and claim state. */
  status(): Promise<Schemas.OnboardingStatus>
}

export function createOnboardingRepository(client: AncherClient): OnboardingRepository {
  return {
    status: () => client.api.get('/api/v1/onboarding'),
    claimReward: task =>
      client.api.post('/api/v1/onboarding/{task}/reward', { path: { task } }),
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
