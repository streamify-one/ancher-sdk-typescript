/**
 * Authentication and session types
 */

import type { EndpointByMethod } from '../api/generated/api.client'
import type { Eq, Expect } from './assert'
import type { GetEndpointQuery, Page } from './common'
import type {
  BranchOf,
  ListOptions,
  NoOperatorCollision,
  OrderByOf,
  Where,
} from './query'
import type { Schemas } from './schemas'

type SessionOAuthProviderParam =
  EndpointByMethod['post']['/api/v1/session/{provider}']['parameters']['path']['provider']
type WebSessionOAuthProviderParam =
  EndpointByMethod['post']['/api/v1/web-session/{provider}']['parameters']['path']['provider']

/**
 * OAuth ID-token providers accepted by the `POST /session/{provider}` and
 * `POST /web-session/{provider}` login routes. Checked against both generated
 * path-param unions so a backend divergence forces an explicit split here.
 */
export const OAuthProvider = {
  Apple: 'apple',
  Google: 'google',
} as const satisfies Record<string, SessionOAuthProviderParam>
export type OAuthProvider = (typeof OAuthProvider)[keyof typeof OAuthProvider]
/** @internal */
export type _OAuthProviderSessionExhaustive = Expect<Eq<OAuthProvider, SessionOAuthProviderParam>>
/** @internal */
export type _OAuthProviderWebSessionExhaustive = Expect<Eq<OAuthProvider, WebSessionOAuthProviderParam>>

/** Login credentials */
export type UserLogin = Schemas.UserLogin

/** OAuth login request */
export type OAuthLoginRequest = Schemas.OAuthLoginRequest

/** Device information */
export type DeviceResponse = Schemas.DeviceResponse

/** User session details */
export type UserSessionResponse = Schemas.UserSessionResponse

/** List of user sessions */
export type UserSessionListResponse = Page<UserSessionResponse>

/* ---------------------------------------------------------------------------
 * Active-session list surface (`GET /sessions` — the user's logged-in
 * sessions across devices, plain `Schemas.UserSession` records).
 * ------------------------------------------------------------------------- */

type SessionListEndpointQuery = GetEndpointQuery<'/api/v1/sessions'>

/** Typed filter for active-session lists. */
export type SessionWhere = Where<BranchOf<SessionListEndpointQuery>>

/** Signed sort keys for active-session lists (e.g. `'-last_used_at'`). */
export type SessionOrderBy = OrderByOf<SessionListEndpointQuery>

/** Options for `sdk.Session.list` / `count` / `iterate`. */
export type SessionListOptions = ListOptions<SessionWhere, SessionOrderBy>

/** @internal */
export type _SessionNoOpCollision = Expect<NoOperatorCollision<BranchOf<SessionListEndpointQuery>>>

/** Password reset request */
export type PasswordResetRequest = Schemas.ResetPasswordRequest

/** Verify reset code request */
export type VerifyResetCodeRequest = Schemas.VerifyResetCode

/** Verify reset code response */
export type VerifyResetCodeResponse = Schemas.VerifyResetCodeResponse

/** Complete password reset */
export type CompletePasswordReset = Schemas.ResetPassword

/** Change password request */
export type ChangePasswordRequest = Schemas.ChangePassword
