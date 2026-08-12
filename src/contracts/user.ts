/**
 * User-related types
 */

import type { Eq, Expect } from './assert'
import type { Schemas } from './schemas'

/** User info for registration */
export type UserInfo = Schemas.UserRegistrationInfo

/** Registration preference settings (`timezone` is the IANA zone union) */
export type UserRegistrationPreferences = Schemas.UserRegistrationPreferences

/** User demographic information */
export type UserDemographic = Schemas.UserDemographic

/** User preferences */
export type UserPreferences = Schemas.UserPreferences

/** Full user registration payload */
export type UserRegistration = Schemas.UserRegistration

/** Basic user response */
export type UserResponse = Schemas.User

/** User demographic response */
export type UserDemographicResponse = Schemas.UserDemographicResponse

/** User preferences response */
export type UserPreferencesResponse = Schemas.UserPreferencesResponse

/** Full user response with nested objects (same as User which includes demographic/preferences) */
export type UserFullResponse = Schemas.User

/** User update payload */
export type UserUpdate = Schemas.UserUpdate

/** User demographic update */
export type UserDemographicUpdate = Schemas.UserDemographicUpdate

/** User preferences update */
export type UserPreferencesUpdate = Schemas.UserPreferencesUpdate

/** Target Daily Digest podcast duration, in minutes. */
export const PodcastLengthMinutes = {
  Two: 2,
  Five: 5,
  Ten: 10,
  Fifteen: 15,
} as const satisfies Record<string, Schemas.UserPreferencesResponse['podcast_length_minutes']>
export type PodcastLengthMinutes = (typeof PodcastLengthMinutes)[keyof typeof PodcastLengthMinutes]
/** @internal */
export type _PodcastLengthMinutesExhaustive = Expect<
  Eq<PodcastLengthMinutes, Schemas.UserPreferencesResponse['podcast_length_minutes']>
>

/**
 * Inclusive bounds for `daily_digest_cadence_days`. The wire type is a plain
 * integer, so these mirror the backend's `ge`/`le` constraints rather than
 * being derived from it — a codegen refresh will not catch a bound change.
 */
export const DAILY_DIGEST_CADENCE_MIN_DAYS = 1
export const DAILY_DIGEST_CADENCE_MAX_DAYS = 30

/** Conversation feature flags */
export type ConversationFeatureFlag = Schemas.ConversationFeatureFlag

/** Insight feature flags */
export type InsightFeatureFlag = Schemas.InsightFeatureFlag

/**
 * Feature flags for the current user (`GET /users/me/feature_flags`). The
 * wire shape is a heterogeneous array of per-domain flag objects, matching
 * the generated response type.
 */
export type FeatureFlagsResponse = (ConversationFeatureFlag | InsightFeatureFlag)[]

/** Activation-code submission body (`POST /users/me/activation-code`). */
export type ActivationCodeSubmission = Schemas.ActivationCodeSubmission

/** Email verification request */
export type EmailVerificationRequest =
  Schemas.Body_confirm_verification_api_v1_users_verification_put

/** Resend verification code request */
export type ResendVerificationRequest = Schemas.ResendVerificationRequest

/** Credit balance response */
export type BalanceResponse = Schemas.BalanceResponse
