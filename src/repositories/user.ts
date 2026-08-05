/**
 * User repository. Current-user resource (`/users/me`): `sdk.User` exposes
 * plain-data reads (`me`, `preferences`, `demographic`, `featureFlags`) plus
 * the current-user operations (`update`/`completeTutorial`/`changePassword`/
 * `updatePreferences`/`updateDemographic`/`submitActivationCode`/
 * `regenerateInvitationCode`/`delete`) and the registration/verification/
 * password-reset flows. Returned users are plain `Schemas.User` data — no
 * model class.
 */

import type { AncherClient } from '../api/client'
import type { Schemas } from '../api/generated/api.client'
import type { FeatureFlagsResponse } from '../contracts/user'

export type User = Schemas.User

export interface UserRepository {
  /** Get the current authenticated user. */
  me(): Promise<User>
  /** Update basic profile fields (`PUT /users/me`); returns the updated user. */
  update(patch: Schemas.UserUpdate): Promise<User>
  /** Mark the tutorial complete (one-way); returns the updated user. */
  completeTutorial(): Promise<User>
  /** Change the current user's password (`PUT /users/me/password`, requires current password). */
  changePassword(body: Schemas.ChangePassword): Promise<void>
  /** Get the current user's preferences (`GET /users/me/preferences`). */
  preferences(): Promise<Schemas.UserPreferencesResponse>
  /** Update preferences (`PUT /users/me/preferences`). Returns the saved preferences. */
  updatePreferences(patch: Schemas.UserPreferencesUpdate): Promise<Schemas.UserPreferencesResponse>
  /** Get the current user's demographic info (`GET /users/me/demographic`). */
  demographic(): Promise<Schemas.UserDemographicResponse>
  /** Update demographic info (`PUT /users/me/demographic`). Returns the saved demographic. */
  updateDemographic(patch: Schemas.UserDemographicUpdate): Promise<Schemas.UserDemographicResponse>
  /** Get the current user's feature flags (`GET /users/me/feature_flags`). */
  featureFlags(): Promise<FeatureFlagsResponse>
  /** Consume an activation code to complete account activation (`204`). */
  submitActivationCode(body: Schemas.ActivationCodeSubmission): Promise<void>
  /**
   * Generate a new invitation code for the current user
   * (`PUT /users/me/invitation-code`). The spec leaves the response untyped —
   * it stays `unknown` until the backend types it; regenerate the client then.
   */
  regenerateInvitationCode(): Promise<unknown>
  /** Delete the current user's account (`DELETE /users/me`). */
  delete(): Promise<void>
  /** Register a new user (sends verification; returns nothing). */
  register(body: Schemas.UserRegistration): Promise<void>
  /** Verify an email address with the 6-digit code (`PUT /users/verification`). */
  verifyEmail(body: Schemas.Body_confirm_verification_api_v1_users_verification_put): Promise<void>
  /** Resend the verification code to an unverified email (`POST /users/verification-requests`). */
  resendVerification(body: Schemas.ResendVerificationRequest): Promise<void>
  /**
   * Verify an email and land authenticated in one call (`POST /web-verification`).
   *
   * Takes no password: redeeming a code that was mailed to the address proves
   * control of the inbox, which is what the session is being granted on. Use
   * this wherever the password is not to hand — a verification reached from a
   * sign-in that reported the address unverified — so the user is not asked to
   * sign in a second time immediately after proving who they are. Sets
   * HTTP-only cookies, so web only.
   */
  verifyEmailAndCreateSession(body: Schemas.WebVerification): Promise<void>
  /** Step 1: request a password reset (sends a 6-digit code via email) (`POST /users/password-reset-requests`). */
  requestPasswordReset(body: Schemas.ResetPasswordRequest): Promise<void>
  /** Step 2: exchange the 6-digit code for a reset token (`POST /users/password-reset-tokens`). */
  verifyResetCode(body: Schemas.VerifyResetCode): Promise<Schemas.VerifyResetCodeResponse>
  /** Step 3: complete the password reset using the reset token (`PUT /users/password`). */
  resetPassword(body: Schemas.ResetPassword): Promise<void>
}

export function createUserRepository(client: AncherClient): UserRepository {
  return {
    async me() {
      return await client.api.get('/api/v1/users/me')
    },
    async update(patch) {
      return await client.api.put('/api/v1/users/me', { body: patch })
    },
    async completeTutorial() {
      return await client.api.put('/api/v1/users/me', { body: { tutorial_completed: true } })
    },
    async changePassword(body) {
      await client.api.put('/api/v1/users/me/password', { body })
    },
    async preferences() {
      return await client.api.get('/api/v1/users/me/preferences')
    },
    async updatePreferences(patch) {
      return await client.api.put('/api/v1/users/me/preferences', { body: patch })
    },
    async demographic() {
      return await client.api.get('/api/v1/users/me/demographic')
    },
    async updateDemographic(patch) {
      return await client.api.put('/api/v1/users/me/demographic', { body: patch })
    },
    async featureFlags() {
      return await client.api.get('/api/v1/users/me/feature_flags')
    },
    async submitActivationCode(body) {
      await client.api.post('/api/v1/users/me/activation-code', { body })
    },
    async regenerateInvitationCode() {
      return await client.api.put('/api/v1/users/me/invitation-code')
    },
    async delete() {
      await client.api.delete('/api/v1/users/me')
    },
    async register(body) {
      await client.api.post('/api/v1/users', { body })
    },
    async verifyEmail(body) {
      await client.api.put('/api/v1/users/verification', { body })
    },
    async resendVerification(body) {
      await client.api.post('/api/v1/users/verification-requests', { body })
    },
    async verifyEmailAndCreateSession(body) {
      // header: {} matches the web-session calls — the x-device-* headers are
      // optional on the wire but structurally required by the generated types,
      // and the client supplies the real ones via its getHeaders hook.
      await client.api.post('/api/v1/web-verification', { header: {}, body })
    },
    async requestPasswordReset(body) {
      await client.api.post('/api/v1/users/password-reset-requests', { body })
    },
    async verifyResetCode(body) {
      return await client.api.post('/api/v1/users/password-reset-tokens', { body })
    },
    async resetPassword(body) {
      await client.api.put('/api/v1/users/password', { body })
    },
  }
}
