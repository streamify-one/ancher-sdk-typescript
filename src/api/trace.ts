/// <reference lib="dom" />

/**
 * W3C Trace Context id generation (https://www.w3.org/TR/trace-context/).
 *
 * Hand-rolled rather than pulling in `@opentelemetry/api`: this package is
 * published, so a dependency every consumer pays for is a poor trade for one
 * header. `crypto.getRandomValues` is available in every runtime the SDK
 * targets (browser, Node, edge, service worker) — unlike `crypto.randomUUID`,
 * which is missing in Safari < 15.4 and would need a fallback guard.
 *
 * The trace flags are always `01` (sampled). The API pins its sampler to
 * `ALWAYS_ON`, so an unsampled `00` would be honored rather than ignored and
 * would silently drop the request from Tempo.
 */

/** `traceparent` version prefix — `00` is the only version defined today. */
const TRACE_VERSION = '00'

/** Trace flags: sampled. See the module doc for why this is never `00`. */
const TRACE_FLAGS_SAMPLED = '01'

const TRACE_ID_BYTES = 16
const SPAN_ID_BYTES = 8

/** Lowercase hex for a non-zero, cryptographically-random W3C identifier. */
function randomNonZeroHex(byteLength: number): string {
  let hex: string
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
    hex = ''
    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, '0')
    }
  } while (/^0+$/.test(hex))
  return hex
}

/**
 * A new trace id — 16 bytes as 32 lowercase hex chars. One per *logical*
 * request: it must stay stable across the 401 → refresh → replay retry so both
 * attempts land in the same trace.
 */
export function newTraceId(): string {
  return randomNonZeroHex(TRACE_ID_BYTES)
}

/**
 * A new span id — 8 bytes as 16 lowercase hex chars. One per *attempt*, so a
 * replay is a sibling span rather than a duplicate of the original.
 */
export function newSpanId(): string {
  return randomNonZeroHex(SPAN_ID_BYTES)
}

/** Compose a `traceparent` header value: `00-<32 hex>-<16 hex>-01`. */
export function formatTraceparent(traceId: string, spanId: string = newSpanId()): string {
  return `${TRACE_VERSION}-${traceId}-${spanId}-${TRACE_FLAGS_SAMPLED}`
}

/**
 * A complete `traceparent` for a brand-new trace. For the SDK transports prefer
 * {@link newTraceId} + {@link formatTraceparent} so retries share a trace id;
 * this is the one-shot form for hand-built requests that never retry.
 */
export function newTraceparent(): string {
  return formatTraceparent(newTraceId())
}
