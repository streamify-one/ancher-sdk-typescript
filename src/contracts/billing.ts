/**
 * Billing types — mirrors backend schemas in app/schemas/billing.py.
 * Decimals are serialized as strings on the wire to avoid float drift.
 */

import type { Eq, Expect } from './assert'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Enums.
 * ------------------------------------------------------------------------- */

/**
 * A billing source. Beyond the external providers, the free tier is modeled
 * as an `internal` subscription — it has no external billing account, so it
 * can't be managed in a portal or store. Checked against the provider fields
 * on several generated schemas so a backend divergence forces an explicit
 * split here.
 */
export const BillingProvider = {
  Stripe: 'stripe',
  Apple: 'apple',
  Google: 'google',
  Internal: 'internal',
} as const satisfies Record<string, Schemas.Subscription['provider']>
export type BillingProvider = (typeof BillingProvider)[keyof typeof BillingProvider]
/** @internal */
export type _BillingProviderSubscriptionExhaustive = Expect<
  Eq<BillingProvider, Schemas.Subscription['provider']>
>
/** @internal */
export type _BillingProviderListingExhaustive = Expect<
  Eq<BillingProvider, Schemas.PlanProviderListing['provider']>
>
/** @internal */
export type _BillingProviderCheckoutExhaustive = Expect<
  Eq<BillingProvider, Schemas.CheckoutSessionRequest['provider']>
>

/** Charge cadence for subscription plans (`null` on credit packs). */
export const BillingInterval = {
  Month: 'month',
  Year: 'year',
} as const satisfies Record<string, NonNullable<Schemas.Plan['billing_interval']>>
export type BillingInterval = (typeof BillingInterval)[keyof typeof BillingInterval]
/** @internal */
export type _BillingIntervalExhaustive = Expect<
  Eq<BillingInterval, NonNullable<Schemas.Plan['billing_interval']>>
>

/** Plan kind — recurring subscription or one-time credit pack. */
export const PlanKind = {
  Subscription: 'subscription',
  CreditPack: 'credit_pack',
} as const satisfies Record<string, Schemas.Plan['kind']>
export type PlanKind = (typeof PlanKind)[keyof typeof PlanKind]
/** @internal */
export type _PlanKindExhaustive = Expect<Eq<PlanKind, Schemas.Plan['kind']>>

/** Subscription lifecycle status. */
export const SubscriptionStatus = {
  Incomplete: 'incomplete',
  Trialing: 'trialing',
  Active: 'active',
  PastDue: 'past_due',
  Canceled: 'canceled',
  Expired: 'expired',
} as const satisfies Record<string, Schemas.Subscription['status']>
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]
/** @internal */
export type _SubscriptionStatusExhaustive = Expect<Eq<SubscriptionStatus, Schemas.Subscription['status']>>

/**
 * Payment row status. Hand-written — the payments endpoint has no generated
 * counterpart yet, so there is no `Expect`/`Eq` drift check; mirrors the
 * backend's `PaymentStatus` (`app/types/billing_types.py`) until it reaches
 * the OpenAPI spec.
 */
export const PaymentStatus = {
  Pending: 'pending',
  Paid: 'paid',
  Refunded: 'refunded',
  Failed: 'failed',
  Disputed: 'disputed',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

/**
 * Outcome of `POST /me/billing/plan`: 'same' (no change), 'checkout' (first
 * purchase — redirect to hosted_url), or 'upgraded' (applied now). Plan changes
 * are upgrade-only while subscribed, so there is no scheduled-downgrade outcome.
 */
export const PlanChangeKind = {
  Same: 'same',
  Checkout: 'checkout',
  Upgraded: 'upgraded',
} as const satisfies Record<string, Schemas.PlanChangeResponse['kind']>
export type PlanChangeKind = (typeof PlanChangeKind)[keyof typeof PlanChangeKind]
/** @internal */
export type _PlanChangeKindExhaustive = Expect<Eq<PlanChangeKind, Schemas.PlanChangeResponse['kind']>>

/**
 * Checkout-session lifecycle: 'complete' once the user finished checkout;
 * 'open' while still in progress; 'expired' when abandoned past its lifetime.
 */
export const CheckoutSessionStatus = {
  Open: 'open',
  Complete: 'complete',
  Expired: 'expired',
} as const satisfies Record<string, Schemas.CheckoutSessionStatusResponse['status']>
export type CheckoutSessionStatus = (typeof CheckoutSessionStatus)[keyof typeof CheckoutSessionStatus]
/** @internal */
export type _CheckoutSessionStatusExhaustive = Expect<
  Eq<CheckoutSessionStatus, Schemas.CheckoutSessionStatusResponse['status']>
>

/**
 * Checkout payment state: 'paid' once funds are captured; 'unpaid' while an
 * async payment method is still processing; 'no_payment_required' for trials.
 */
export const CheckoutPaymentStatus = {
  Paid: 'paid',
  Unpaid: 'unpaid',
  NoPaymentRequired: 'no_payment_required',
} as const satisfies Record<string, Schemas.CheckoutSessionStatusResponse['payment_status']>
export type CheckoutPaymentStatus = (typeof CheckoutPaymentStatus)[keyof typeof CheckoutPaymentStatus]
/** @internal */
export type _CheckoutPaymentStatusExhaustive = Expect<
  Eq<CheckoutPaymentStatus, Schemas.CheckoutSessionStatusResponse['payment_status']>
>

/**
 * Checkout mode: 'payment' for one-time credit-pack purchases; 'subscription'
 * for recurring plans.
 */
export const CheckoutMode = {
  Payment: 'payment',
  Subscription: 'subscription',
} as const satisfies Record<string, Schemas.CheckoutSessionStatusResponse['mode']>
export type CheckoutMode = (typeof CheckoutMode)[keyof typeof CheckoutMode]
/** @internal */
export type _CheckoutModeExhaustive = Expect<Eq<CheckoutMode, Schemas.CheckoutSessionStatusResponse['mode']>>

/** How a redeemed discount code was applied. */
export const DiscountRedemptionOutcome = {
  CreditGrantApplied: 'credit_grant_applied',
  PlanDiscountAttached: 'plan_discount_attached',
} as const satisfies Record<string, Schemas.RedeemDiscountCodeResponse['outcome']>
export type DiscountRedemptionOutcome =
  (typeof DiscountRedemptionOutcome)[keyof typeof DiscountRedemptionOutcome]
/** @internal */
export type _DiscountRedemptionOutcomeExhaustive = Expect<
  Eq<DiscountRedemptionOutcome, Schemas.RedeemDiscountCodeResponse['outcome']>
>

/* ---------------------------------------------------------------------------
 * Plans.
 * ------------------------------------------------------------------------- */

/** A purchasable plan (subscription or credit pack). */
export interface Plan {
  billing_interval: BillingInterval | null
  /** Decimal serialized as string. */
  credit_grant: string
  currency: string | null
  display_price_cents: number | null
  id: string
  is_active: boolean
  kind: PlanKind
  name: string
  slug: string
  trial_days: number
}

/** A plan's price/product listing on one provider. */
export interface PlanProviderListing {
  currency: string
  id: string
  is_active: boolean
  plan_id: string
  price_cents: number
  provider: BillingProvider
  provider_product_id: string
}

/** A plan together with its per-provider listings. */
export interface PlanWithListings {
  listings: PlanProviderListing[]
  plan: Plan
}

/** `GET /me/billing/plans` response. */
export interface PlanListResponse {
  plans: PlanWithListings[]
}

/* ---------------------------------------------------------------------------
 * Subscription & balance.
 * ------------------------------------------------------------------------- */

/** A subscription row. */
export interface Subscription {
  cancel_at: string | null
  canceled_at: string | null
  current_period_end: string | null
  current_period_start: string | null
  customer_id: string
  id: string
  last_renewed_at: string | null
  last_synced_at: string
  plan_id: string
  provider: BillingProvider
  provider_subscription_id: string
  status: SubscriptionStatus
  user_id: string
}

/** `GET /me/billing/subscription` response. */
export interface SubscriptionResponse {
  plan: Plan
  subscription: Subscription
}

/** Credit usage within one bucket (subscription or top-up). */
export interface BucketUsage {
  /** Live (non-expired) credits granted into the bucket. Decimal as string. */
  granted: string
  /** granted - used. Decimal as string. */
  remaining: string
  /** Credits consumed from those grants. Decimal as string. */
  used: string
}

/** `GET /me/billing/balance` response. */
export interface BalanceResponse {
  /** Monthly subscription credits (expire per credit window). */
  subscription: BucketUsage
  /** Purchased top-up credits (never expire, drain after subscription). */
  topup: BucketUsage
}

/* ---------------------------------------------------------------------------
 * Payments & checkout.
 * ------------------------------------------------------------------------- */

/** A payment row. */
export interface Payment {
  amount_cents: number
  currency: string
  customer_id: string | null
  id: string
  paid_at: string | null
  plan_id: string | null
  provider: BillingProvider
  provider_charge_id: string
  refunded_at: string | null
  status: PaymentStatus
  subscription_id: string | null
  user_id: string
}

/** New endpoint, gracefully degraded in the FE until backend ships. */
export interface PaymentListResponse {
  payments: Payment[]
}

/** `POST /me/billing/checkout-session` request. */
export interface CheckoutSessionRequest {
  plan_slug: string
  provider: BillingProvider
}

/** `POST /me/billing/checkout-session` response. */
export interface CheckoutSessionResponse {
  hosted_url: string
  provider: BillingProvider
  session_token: string | null
}

/** `POST /me/billing/plan` request. */
export interface PlanChangeRequest {
  plan_slug: string
  provider: BillingProvider
}

/** `POST /me/billing/plan` response. */
export interface PlanChangeResponse {
  /** Hosted-checkout URL to redirect to (only when kind='checkout'). */
  hosted_url: string | null
  kind: PlanChangeKind
  /** Provider-side checkout session id (kind='checkout'). */
  session_token: string | null
}

/** `GET /me/billing/checkout-session/{session_id}` — post-checkout verification. */
export interface CheckoutSessionStatusResponse {
  /** True once a one-time purchase's credits are in the balance; always false for subscriptions. */
  credits_granted: boolean
  /** 'payment' = one-time credit pack; 'subscription' = recurring plan. */
  mode: CheckoutMode
  payment_status: CheckoutPaymentStatus
  status: CheckoutSessionStatus
}

/** `POST /me/billing/stripe/portal-session` — opens the hosted billing portal. */
export interface StripePortalSessionRequest {
  /** Optional — the backend falls back to a configured default when omitted. */
  return_url?: string
}

/** `POST /me/billing/stripe/portal-session` response. */
export interface StripePortalSessionResponse {
  url: string
}

/** `POST /me/billing/discount-codes/redeem` — redeem a credit / discount code. */
export interface RedeemDiscountCodeRequest {
  code: string
}

/** `POST /me/billing/discount-codes/redeem` response. */
export interface RedeemDiscountCodeResponse {
  /**
   * Credits added (credit_grant only). Decimal serialized as string. The
   * backend currently always sends `null` here — derive the delta from
   * `new_balance` minus the pre-redeem balance instead.
   */
  credit_grant: string | null
  /** Balance after redemption. Decimal serialized as string. */
  new_balance: string
  outcome: DiscountRedemptionOutcome
}
