/// <reference lib="dom" />
/**
 * Browser auth preset.
 *
 * Reproduces the cookie-session behavior of the design-system's original
 * `src/lib/api-client.ts`: CSRF double-submit from the `streamify_csrf_token`
 * cookie, a persisted device ID, the local timezone, and silent session refresh
 * via `PUT {origin}/api/v1/web-session` using the HTTP-only refresh-token cookie.
 *
 * Browser-only (reads `document.cookie`, `localStorage`, `Intl`).
 */

import type { AncherClientConfig } from '../api/config'
import { newTraceparent } from '../api/trace'

const DEVICE_ID_KEY = 'ancher-device-id'
const CSRF_COOKIE_NAME = 'streamify_csrf_token'

/** Read the CSRF token from cookie (double-submit pattern). */
export function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`))
  const value = match?.[1]
  return value ? decodeURIComponent(value) : null
}

/** Get or lazily create a persisted device ID. */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Refresh the session using the refresh-token cookie. The server sets new
 * HTTP-only auth cookies; there is no response body. De-duplicates concurrent
 * refreshes. Returns `true` on success.
 */
export function makeRefreshSession(origin: string): () => Promise<boolean> {
  return function refreshSession(): Promise<boolean> {
    if (isRefreshing && refreshPromise) return refreshPromise
    isRefreshing = true
    refreshPromise = (async () => {
      try {
        const csrfToken = getCsrfToken()
        const response = await fetch(`${origin}/api/v1/web-session`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-device-id': getDeviceId(),
            // Hand-built headers, so `buildContextHeaders` never runs here.
            traceparent: newTraceparent(),
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
          credentials: 'include',
        })
        return response.ok
      } catch {
        return false
      } finally {
        isRefreshing = false
        refreshPromise = null
      }
    })()
    return refreshPromise
  }
}

/**
 * Build a browser {@link AncherClientConfig} with cookie-session auth wired up.
 *
 * @param origin API origin only (no `/api/v1`), e.g. `https://api.ancher.ai`
 *   or `window.location.origin`.
 * @param overrides extra config (e.g. `onError` to open an insufficient-credits
 *   dialog, or `onActivationRequired` for the activation gate).
 */
export function browserAuthConfig(
  origin: string,
  overrides?: Partial<AncherClientConfig>
): AncherClientConfig {
  return {
    baseUrl: origin,
    credentials: 'include',
    getCsrfToken,
    getDeviceId,
    getTimezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    refreshSession: makeRefreshSession(origin),
    ...overrides,
  }
}
