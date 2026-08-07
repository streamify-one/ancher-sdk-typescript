/**
 * User repository. Current-user resource (`/users/me`): `sdk.User` exposes
 * plain-data reads (`me`, `preferences`, `demographic`, `featureFlags`) plus
 * the current-user operations (`update`/`completeTutorial`/`changePassword`/
 * `updatePreferences`/`updateDemographic`/`submitActivationCode`/
 * `regenerateInvitationCode`/`delete`). Interactive account flows
 * (registration, email verification, password reset) are deliberately not
 * here — they belong to the web app, over the raw `client.api`. Returned
 * users are plain `Schemas.User` data — no model class.
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
  }
}
