# @ancher-ai/sdk

A fully-typed TypeScript SDK for the **Ancher API**.

Every path, method, request body, and response is typed straight from the
OpenAPI spec via codegen, and fronted by a small configurable transport that
handles auth, CSRF, silent token refresh, and error normalization. The SDK is
built for **code and headless machine clients** — server-side (static API key),
CLI/native (OAuth2 access token), or any custom scheme: authentication is just
a set of injectable hooks. Interactive account flows (registration, email
verification, password reset, Google/Apple social login) are deliberately not
part of the SDK surface — those belong to the product web app.

This package was extracted from the `streamify-one-design-system` app — it
combines that app's `pnpm generate` codegen pipeline with its `src/lib/api-client.ts`
transport, generalized into a standalone, runtime-agnostic library.

## Two layers

- **Raw API layer** — `createAncherClient(config)` → `{ api, upload, config }`.
  The generated typed client, 1:1 with the OpenAPI spec, plus the transport. No
  business logic; every endpoint is a typed `client.api.<method>(path, …)` call.
- **SDK layer** — `createAncherSdk(config | client)` → one ergonomic **entity
  repository** per resource (`sdk.Note`, `sdk.File`, …). Repositories return
  **plain typed data** (the wire shapes from `@ancher-ai/sdk/contracts` — no model
  classes, no instance methods) and wrap multi-step flows into single calls
  (e.g. `sdk.File.upload` runs the three-step presigned upload). Every
  operation lives on the repository; per-record mutations take the id first
  (`sdk.Note.update(id, patch)`, `sdk.Note.delete(id)`). Lists take a
  TypeScript-native `{ where, orderBy, … }` options object (see
  [Listing, filtering, counting](#listing-filtering-counting)). The raw client
  stays reachable as `sdk.client` for anything the SDK layer doesn't wrap.

Use the SDK layer by default; drop to the raw layer for endpoints it doesn't
cover. The SDK layer is deliberately thin.

Types (entity aliases like `Note`, list-option types like `NoteListOptions`,
and the runtime enum constants) ship from the **`@ancher-ai/sdk/contracts`**
entrypoint.

## Install

```bash
pnpm add @ancher-ai/sdk
# optional, only if you use the TanStack Query integration:
pnpm add @tanstack/react-query
```

## Quick start

`baseUrl` is optional and defaults to `https://api.ancher.ai` (exported as
`ANCHER_BASE_URL`) — pass it only to target another environment.

### Server-side (static API key)

```ts
import { createAncherClient } from '@ancher-ai/sdk'

const client = createAncherClient({
  apiKey: process.env.ANCHER_API_KEY,
  credentials: 'omit', // token auth, no cookies
  // baseUrl defaults to https://api.ancher.ai; pass an origin to target another env:
  // baseUrl: 'https://api.staging.ancher.ai',  // origin only — paths carry /api/v1
})

// Fully typed — path, query, body, and response are all checked.
const notes = await client.api.get('/api/v1/notes/', { query: { limit: 20 } })
const note = await client.api.post('/api/v1/notes/text', { body: { text: 'Hello' } })
```

### OAuth2 (standard authorization server / third parties)

The `oauth2` preset is for an actual OAuth2 server — Authorization Code + PKCE,
confidential clients (`clientSecret`), token endpoint + refresh — **without the
transport ever running the redirect dance** (your app owns the login UI). Its
token lifecycle rides on `createTokenManager`.

```ts
import { createAncherClient } from '@ancher-ai/sdk'
import { createOAuth2Auth } from '@ancher-ai/sdk/oauth2'

const oauth = createOAuth2Auth({
  authorizationEndpoint: 'https://issuer.example.com/oauth2/authorize',
  tokenEndpoint: 'https://issuer.example.com/oauth2/token',
  clientId: 'my-app',
  redirectUri: 'myapp://callback',
  store: secureTokenStore,
})

const { url, codeVerifier, state } = await oauth.getAuthorizationUrl()
// host opens `url`; on redirect, verify `state`, then:
await oauth.exchangeCode({ code, codeVerifier })

const client = createAncherClient({ ...oauth.authConfig })
```

> **Why no username/password auth method?** The SDK is a headless surface:
> interactive login (passwords, Google/Apple ID tokens) belongs to the product
> web app. Machine clients use `apiKey` (server-to-server) or the OAuth2
> preset's tokens (CLI/native) — the SDK stores **tokens, never a password**,
> and the refresh token renews the session. The core client surface is
> password-free, so the right choice is the obvious one.

#### Pluggable token storage

`store` is a `TokenStore` (`get`/`set`, both may be async). The SDK defaults to
in-memory and ships **no** runtime-specific store — implement one for your
client. Tokens are plain JSON (`expiresAt` is epoch-ms, not a `Date`), so they
serialize without any custom (de)serialization, and `set(null)` is the clear
signal (`logout` uses it).

Browser extension — back it with `chrome.storage.session`, and build the store
(and the OAuth client that owns it) **only in the background service worker**:

```ts
// Background service worker ONLY — never a content script or page context.
import type { OAuth2TokenStore } from '@ancher-ai/sdk/oauth2'

const chromeStorageTokenStore: OAuth2TokenStore = {
  async get() {
    const { ancherTokens } = await chrome.storage.session.get('ancherTokens')
    return ancherTokens ?? null
  },
  async set(tokens) {
    if (tokens) await chrome.storage.session.set({ ancherTokens: tokens })
    else await chrome.storage.session.remove('ancherTokens')
  },
}
```

> **Why `storage.session`, not `storage.local`?** `storage.session` is
> restricted to trusted contexts by default (`TRUSTED_CONTEXTS`) — content
> scripts, which share a page with arbitrary site code, can never read the
> tokens. `storage.local` is readable from every extension context and survives
> on disk. Keep the default access level (don't call `setAccessLevel`), and let
> other contexts reach the API by messaging the worker rather than building
> their own store. The trade-off: `storage.session` is cleared when the browser
> restarts, so users sign in again per browser session. If you need sign-in to
> survive restarts, treat that as a deliberate security decision — weigh the
> broader exposure of `storage.local` (or encrypt-at-rest schemes) explicitly
> rather than reaching for it as the default.

> **Extension gotcha — centralize auth in the service worker.** The refresh
> de-dup is per-manager-instance (per JS context). If the service worker, popup,
> and content scripts each build their own client, a simultaneous expiry can fire
> one refresh *per context* — a race with rotating refresh tokens. Build the
> client once in the service worker and have other contexts call it via
> `chrome.runtime.sendMessage`. (This is a context-sharing concern, not a storage
> one — a shared `chrome.storage` store doesn't fix it.)

On mobile, implement the same interface over secure storage (Keychain /
Keystore / Expo SecureStore).

### Custom token source (`getAccessToken`)

For any token that isn't a static key — a rotating session token, a token from
your own store — provide `getAccessToken` directly. It's re-invoked on every
request (and every retry after `refreshSession`), so always return the *current*
token:

```ts
const client = createAncherClient({
  credentials: 'omit',
  getAccessToken: () => tokenStore.getAccessToken(), // sync or async
  refreshSession: async () => tokenStore.refresh(),  // return true to retry once
})
```

#### Proactive refresh (`getSessionExpiresAt`)

The transport refreshes **reactively** on a 401 (retry once), and — when you
also provide `getSessionExpiresAt` — **proactively**: any request issued within
`refreshLeewaySeconds` (default 120) of the expiry awaits a de-duplicated
`refreshSession()` first, so the request never pays the 401 round trip. Failed
refreshes back off for ~30 s; an unknown (`null`) expiry disables the proactive
path and leaves the reactive one. This works for token *and* cookie sessions —
a cookie host tracks expiry itself and returns it here:

```ts
const client = createAncherClient({
  refreshSession: async () => refreshMyCookieSession(), // e.g. PUT /web-session
  getSessionExpiresAt: () => sessionExpiresAtMs,        // epoch-ms or null
})
```

For a hand-built request that bypasses the transport, run the same guarded
check first with `client.ensureFreshSession()`. Don't set `getSessionExpiresAt`
by hand for `createTokenManager`/OAuth2-preset clients — their `authConfig`
already supplies it from the token store.

Need proactive (pre-expiry) renewal, de-dup, and storage but with your own
refresh call? Use `createTokenManager` directly — it's the lifecycle core behind
the `oauth2` preset, and returns a ready-to-spread `authConfig`:

```ts
import { createTokenManager } from '@ancher-ai/sdk'

const manager = createTokenManager({
  refresh: async (current) => exchangeMyRefreshToken(current.refreshToken), // → ManagedTokens | null
  store: myTokenStore, // optional; in-memory by default
})
await manager.setTokens(initialTokens)
const client = createAncherClient({ ...manager.authConfig })
```

### TanStack Query

```ts
import { createAncherClient } from '@ancher-ai/sdk'
import { createTanstackClient } from '@ancher-ai/sdk/tanstack'
import { useQuery } from '@tanstack/react-query'

const client = createAncherClient(/* ... */)
const tq = createTanstackClient(client)

function Notes() {
  const { data } = useQuery(tq.get('/api/v1/notes/', { query: { limit: 20 } }).queryOptions)
  // ...
}
```

### File upload

Uploading is a three-step **presigned S3 flow** (request URL → `PUT` bytes to S3
→ finalize). The SDK layer wraps all three into one call:

```ts
import { createAncherSdk } from '@ancher-ai/sdk'

const sdk = createAncherSdk({ apiKey: process.env.ANCHER_API_KEY })
const file = await sdk.File.upload(blob) // → plain File data ({ id, filename, size, mimetype, … })

// For a Blob (no `.name`/`.type`), pass them explicitly:
await sdk.File.upload(blob, { filename: 'report.pdf', mimetype: 'application/pdf' })

// Metadata by id:
const meta = await sdk.File.get(fileId)
```

Under the hood that is exactly the raw-layer sequence below — reach for it
directly only if you need to interleave the steps (custom S3 PUT, progress, etc.):

```ts
// 1. Ask the API for a presigned upload URL (typed JSON endpoint).
const { upload_url, s3_key } = await client.api.post('/api/v1/files/presigned-urls', {
  body: { filename: file.name, mimetype: file.type },
})

// 2. PUT the raw bytes straight to S3 — NOT through the SDK. No Authorization
//    header or cookies; Content-Type must match the `mimetype` from step 1.
const put = await fetch(upload_url, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file,
})
if (!put.ok) throw new Error(`S3 upload failed: ${put.status}`)

// 3. Finalize — the API fetches the object, hashes it, and creates the record.
const uploaded = await client.api.post('/api/v1/files/completions', {
  body: { s3_key, filename: file.name },
}) // → Schemas.FileUploadResponse: { id, filename, size, mimetype, … }
```

> Presigned URLs are short-lived (60–3600s, default 300), and the API sniffs the
> real MIME type from the bytes on completion — your `mimetype` is a hint, not
> authoritative. You can optionally confirm integrity afterward with
> `POST /api/v1/files/{file_id}/verifications`.

#### Direct multipart (small files)

For a one-shot small upload you can skip the dance and post multipart straight to
the API with the typed `sdk.File.uploadDirect`:

```ts
const uploaded = await sdk.File.uploadDirect(file, {
  onProgress: (pct) => console.log(pct), // 0–100; uses XMLHttpRequest when set
  // public: true,                       // create publicly readable (default false)
  // signal: abortController.signal,     // optional cancellation
})
```

Underneath sits `client.upload`, a standalone `multipart/form-data` helper (the
generated client is JSON-only) for endpoints without a typed wrapper — you pass
the response type, and the endpoint string is unchecked. It sends one field
(default `file`, override via `fieldName`; extra scalar fields via `fields`) and
shares the same auth / refresh / activation / error handling as the rest of the
client.

## Entities (SDK layer)

`createAncherSdk(config | client)` exposes a repository per entity. Repositories
hold **every** operation for their resource — `create`/`get`/`list` plus
id-keyed per-record mutations (`update(id, patch)`, `delete(id)`, …) — and
return plain typed data:

```ts
import { createAncherSdk } from '@ancher-ai/sdk'
import { NoteStatus, type Note } from '@ancher-ai/sdk/contracts'

const sdk = createAncherSdk({ apiKey: process.env.ANCHER_API_KEY })

const note = await sdk.Note.createFromUrl({ text: 'https://example.com' }) // plain Note
await sdk.Note.update(note.id, { title: 'Renamed' })  // PATCH, id first
await sdk.Note.delete(note.id)                                 // DELETE

const page = await sdk.Note.list({ where: { status: NoteStatus.Ready }, limit: 20 }) // Page<Note>
```

### Listing, filtering, counting

Every criteria list endpoint exposes the same typed surface:

- **`list(options?)`** → `Promise<Page<X>>` — one page.
- **`count(where?)`** → `Promise<number>` — matching-record count (a `limit: 1`
  list reading `total`).
- **`iterate(options?)`** → `AsyncGenerator<X>` — items lazily across pages.

`options` is `{ where?, orderBy?, limit?, offset? }` for a first/offset page,
**or** `{ cursor }` (optionally with a matching `limit`) for a continuation
page. The per-entity option
types (`NoteListOptions`, `NoteWhere`, `NoteOrderBy`, …) are exported from
`@ancher-ai/sdk/contracts` and are *derived from the generated OpenAPI criteria
types*, so each endpoint's exact filter surface (which fields exist, which
relations are filterable) flows through codegen and is checked at compile time.

```ts
import { likePattern, NoteStatus } from '@ancher-ai/sdk/contracts'

const page = await sdk.Note.list({
  where: {
    status: NoteStatus.Ready,                    // scalar shorthand = equals
    reaction: null,                              // null shorthand   = isNull: true
    created_at: { gte: new Date('2026-01-01') }, // Date accepted on *_at / *_date fields
    title: { ilike: likePattern(searchTerm) },   // escaped substring search
    tags: { id: { in: tagIds } },                // nested relation (endpoints that support it)
    OR: [{ title: { ilike: q } }, { description: { ilike: q } }],
  },
  orderBy: ['-updated_at', '-id'],               // signed sort keys; a single key may be bare
  limit: 20,
})

// Continuation: the cursor already encodes criteria/order/limit — send it ALONE.
if (page.has_more && page.next_cursor) {
  const next = await sdk.Note.list({ cursor: page.next_cursor })
}

// Count without fetching items:
const readyCount = await sdk.Note.count({ status: NoteStatus.Ready })

// Iterate across pages lazily — `break` stops network traffic; `limit` is the
// per-page fetch size. Terminates on `has_more === false` (the API mints a
// next_cursor even on the final page, so never loop on cursor truthiness).
for await (const note of sdk.Note.iterate({ where: { status: NoteStatus.Ready }, limit: 100 })) {
  if (isEnough(note)) break
}
```

**`where` semantics** (translated to the wire criteria DSL by the SDK):

- **Field keys mirror the wire names** (`created_at`, `title_override`, …).
  A bare scalar means *equals*; `null` means *is unset* (`isNull: true`).
- **Operator objects** use camelCase Prisma-style names: `equals`, `not`, `in`,
  `notIn`, `lt`, `lte`, `gt`, `gte`, `contains`, `notContains`, `startsWith`,
  `endsWith`, `like`, `ilike`, `notLike`, `isNull`. The SDK renames them to the
  wire operators (`lte`/`gte` become the wire's `le`/`ge`, `equals` → `eq`, …).
- **`{ equals: null }`** → `isNull: true`; **`{ not: null }`** → `isNull: false`.
  `null` in any other operand position throws a `TypeError` (the API would
  silently drop the filter and return everything).
- **`undefined` values are skipped** at field/operator positions, so
  conditional filters are just `status: onlyReady ? NoteStatus.Ready :
  undefined` — no conditional spreads. One caveat: an `AND`/`OR` *branch* whose
  every filter is undefined throws a `TypeError` (silently changing what the
  group matches would be worse) — conditionalize the array
  (`OR: cond ? [a, b] : [a]`), not a branch's fields.
- **`AND: [...]` / `OR: [...]` / `NOT: {...}`** compose sub-criteria (`NOT`
  takes a *single* object). Multi-field `NOT` means **none-of**:
  `NOT: { a, b }` excludes rows matching `a` and rows matching `b` (¬a ∧ ¬b) —
  unlike Prisma's object form, which negates the conjunction. To negate a
  conjunction, De Morgan it with per-field negative operators
  (`OR: [{ a: { not: … } }, …]`). Empty `AND: []` / `OR: []` throw a
  `TypeError` (the API would silently match everything). Nested **relation** filters
  (`tags: { id: { in } }`) are only legal at the root of a `where` — the types
  enforce this, matching the wire contract.
- **`in: []` matches nothing** and `notIn: []` matches everything — both are
  forwarded verbatim, not optimized away.
- **Dates**: datetime operands accept `Date` (serialized to ISO 8601, including
  inside `in`/`notIn` arrays) or a pre-formatted ISO string. Note the asymmetry:
  entity timestamps in *responses* are Unix **seconds** — convert with
  `new Date(note.created_at * 1000)` before using one as a criteria operand.
- **`likePattern(term)`** escapes the LIKE wildcards (`%`, `_`, `\`) and wraps
  the term in `%…%` — always use it when passing user input to `like`/`ilike`,
  otherwise a user searching `"100%"` gets wildcard semantics.
- **`orderBy`** takes the same signed strings as the wire (`'-updated_at'`
  desc, `'+title'` asc), single or array; the per-entity `XOrderBy` unions are
  generated so invalid keys fail typecheck.
- **A cursor cannot carry criteria or ordering.** `{ cursor }` with any of
  `where`/`orderBy`/`offset` throws a `TypeError` client-side (the API rejects
  the combination with a 422 — the cursor already encodes them). `limit` is
  allowed alongside a cursor when it matches the cursor's encoded page size,
  so re-running the same call with the cursor appended keeps working.
- **Unknown top-level option keys throw** a `TypeError` — stale raw-DSL params
  (`order_by`, `and`, `status: { eq }`, …) fail loudly instead of silently
  returning an unfiltered list.

Scoped lists take their path params first and the same typed options:
`sdk.Note.suggestedCollections(noteId, options?)`,
`sdk.Collection.notes(collectionId, options?)`,
`sdk.Collection.artifacts(collectionId, options?)`,
`sdk.Collection.suggestedNotes(collectionId, options?)`,
`sdk.Message.list(conversationId, options?)`, and
`sdk.File.revisions(noteId, fileId, options?)`. Each returns a single page;
`count`/`iterate` exist on the top-level repositories.

### Runtime enums

Enum-like unions ship as **const objects with a same-name type** from
`@ancher-ai/sdk/contracts`. Values are the plain wire strings, so
`note.status === 'ready'` still typechecks — use the constant where it reads
better, and `isEnumValue` to validate untyped input (CLI flags, URL params):

```ts
import { isEnumValue, NoteStatus } from '@ancher-ai/sdk/contracts'

if (note.status === NoteStatus.Ready) { /* … */ }

const raw: string = searchParams.get('status') ?? ''
if (isEnumValue(NoteStatus, raw)) {
  // raw: NoteStatus
}
```

Each constant carries a two-directional compile-time drift check against the
generated schema union (`satisfies` catches extra values, an `Expect<Eq<…>>`
line catches missing ones), so a codegen refresh that changes the API union
breaks `pnpm typecheck` until the constant is updated — the enums can never
silently drift from the API.

Available: `NoteStatus` (+ `ArticleStatus` alias), `ReactionType`,
`PaletteColor`, `CollectionStatus`, `MessageRole`, `ConversationRunStatus`,
`ClarificationAction`, `ClarificationResolutionStatus`, `SelectedContentType`,
`ResourceAttachmentType`, `NotificationType`, `NotificationStatus`,
`DailyDigestStatus`, `PinType`, `RecommendationStatus`, `RecommendationAction`,
`SuggestionStatus`, `OAuthProvider`, `BillingProvider`, `BillingInterval`,
`PlanKind`, `SubscriptionStatus`, `PlanChangeKind`, `CheckoutSessionStatus`,
`CheckoutPaymentStatus`, `CheckoutMode`, `DiscountRedemptionOutcome`. Derived
request-body unions: `SuggestionResolution` (`SuggestionStatus` minus
`'pending'`), `NotificationStatusUpdate` (`NotificationStatus` minus
`'unread'`).

### Entity repositories

| `sdk.X` | Operations |
| --- | --- |
| `Note` | `list`/`count`/`iterate`, `createFromText`/`FromUrl`/`FromFile`/`FromArtifact`/`FromConversation`/`FromMessage`, `get`, `getBySlug`, `getContent(id, options?)` (raw `Response`), `getFile(noteId, fileId)`, `updateFileContent(noteId, fileId, file, options?)`, `displayPresignedUrl(id, options?)`, `downloadDisplay(id, options?)`, `filePresignedUrl(noteId, fileId, options?)`, `downloadFile(noteId, fileId, options?)`, `suggestedCollections(noteId, options?)`, `update(id, patch)`, `delete(id)`, `retry(id)`, `copy(id)`, `setTags(id, body)` |
| `File` | `upload` (presigned 3-step), `uploadDirect(file, options?)` (one-shot multipart with `onProgress`/`signal`), `uploadBatch(files, options?)` (multipart), `get`, `verify(id)`, `presignedUrl(id, options?)`, `download(id, options?)`, `delete(id)`, `revisions(noteId, fileId, options?)`, `revertRevision(noteId, fileId, revisionId)` |
| `User` | `me`, `update`, `preferences`/`updatePreferences`, `demographic`/`updateDemographic`, `featureFlags`, `completeTutorial`, `changePassword`, `submitActivationCode`, `regenerateInvitationCode`, `delete` |
| `ApiKey` | `list()` (no params → `ApiKey[]`), `create`¹, `delete(id)` (revoke) |
| `Artifact` | `list`/`count`/`iterate`, `get`, `getBySlug`, `getContent(id, options?)` (raw `Response`), `create`, `update(id, patch)`, `updateContent(id, file, options?)`, `delete(id)`, `presignedUrl(id, options?)`, `download(id, options?)` |
| `Tag` | `list`/`count`/`iterate`, `create`, `update(id, patch)`, `delete(id)` |
| `Collection` | `list`/`count`/`iterate`, `get`, `create`, `update(id, patch)`, `delete(id)`, `notes(id, options?)` + `addNote`/`setNotes`/`removeNote`, `artifacts(id, options?)` + `addArtifact`/`setArtifacts`/`removeArtifact`, `suggestedNotes(id, options?)` |
| `Conversation` | `list`/`count`/`iterate`, `get`, `start`²/`send`², `startChat`²/`chat`²/`stream`², `interrupt(id)`, `update(id, patch)`, `delete(id)` |
| `Message` | `list(conversationId, options?)`, `get(conversationId, id)`, `update(conversationId, id, patch)` |
| `Pinned` | `list`/`count`/`iterate`, `pin`, `reorder`, `unpin(entityId)` |
| `Notification` | `list`/`count`/`iterate`, `setStatus(id, body)`, `markRead(id)`, `markDismissed(id)` |
| `Suggestion` | `list`/`count`/`iterate`, `update(id, body)`, `accept(id)`, `dismiss(id)`, `acceptMany(ids)`, `dismissMany(ids)` |
| `Recommendation` | `list`/`count`/`iterate`, `save(id)`, `dismiss(id)`, `notInterested(id)` |
| `Session` | `list`/`count`/`iterate`, `current` (token session), `revoke(id)`, `revokeAll` |
| `Connection` | `list()` (no params → `Connection[]`), `connect`, `delete(id)` |

**Action services** (singleton, no entity — return typed results directly):

| `sdk.X` | Operations |
| --- | --- |
| `Billing` | `credits`, `subscription`, `redeemDiscountCode`, `createCheckoutSession`, `getCheckoutSession`, `changePlan`, `createPortalSession`, `verifyPurchase`, `plans` |
| `Device` | `setNotificationToken` |
| `Onboarding` | `status`, `claimReward(task)` (onboarding checklist + its credit rewards) |
| `Retrieval` | `notes`, `chunks` (RAG) |
| `ImagePrompt` | `generate` (multipart) |
| `TextSelection` | `explain`, `summarize`, `translate` (selection toolbar) |

¹ `ApiKey.create` returns `ApiKeyCreateResponse` — it carries the one-time
plaintext secret; surface it immediately, never persist it.
² Chat is streaming. `start`/`send` POST and return a `ConversationRunReceipt`
(HTTP 202) for fire-and-forget; `chat`/`startChat`/`stream` consume the SSE
stream as structured **`ChatEvent`**s (see below).

> **Coverage.** Every product operation in the spec has a typed SDK method,
> with one deliberate exception class: **interactive account and browser-auth
> flows** are left to the raw `client.api`. That covers registration
> (`POST /users`), email verification (`PUT /users/verification`,
> `POST /users/verification-requests`), the password-reset trio
> (`/users/password-reset-*`, `PUT /users/password`), the `/web-session`
> cookie-session lifecycle (incl. Google/Apple web login), the token-session
> login/refresh/logout routes (`POST`/`PUT`/`DELETE /session`,
> `POST /session/{provider}` — the OAuth2 preset owns machine tokens instead),
> the external-connection OAuth **callback** redirect, and
> `POST /web-verification` — human flows that belong to the product apps, not
> a headless SDK.

### Chat streaming

The conversation SSE stream is surfaced as a typed `ChatEvent` discriminated
union — no raw envelopes. The live assistant text, tool activity, citations, and
clarifications are fanned out into structured events, each text/tool event
carrying a typed `AgentRun` (with `isMain` to tell the user-visible agent from
sub-agents). Consume it as an **async iterator** or with **callbacks**.

```ts
// Async iterator — send a message and stream the structured reply:
for await (const event of sdk.Conversation.chat(conversationId, { content: 'Summarize my notes' })) {
  switch (event.type) {
    case 'text':       process.stdout.write(event.text); break
    case 'tool-call':  console.log('↳', event.toolName, event.args); break
    case 'citations':  console.log(event.citations.map((c) => c.url)); break
    case 'done':       console.log('\n', event.finishReason); break
    case 'error':      throw new Error(event.message)
  }
}

// Callbacks — `consumeChat` drives the stream and accumulates main-agent text:
import { consumeChat } from '@ancher-ai/sdk'

const { text, finishReason } = await consumeChat(sdk.Conversation.stream(conversationId), {
  onText: (t) => append(t),
  onToolCall: (call, run) => trace(run.agentName, call.toolName),
  onClarificationRequested: (c) => askUser(c),
})

// Start a brand-new conversation and stream in one call:
for await (const event of sdk.Conversation.startChat({ content: 'Hi' })) { /* … */ }

// Resume after a disconnect, and interrupt:
const controller = new AbortController()
const stream = sdk.Conversation.stream(id, { after: lastEventId, signal: controller.signal })
await sdk.Conversation.interrupt(id) // stops the active run (surfaces as `done`, finishReason 'cancelled')
```

`ChatEvent` types: `text`, `thinking`, `tool-call`, `tool-return`, `narration`,
`review-rejected`, `citations`, `resource-updated`, `clarification-requested`,
`clarification-resolved`, `done`, `error`. Unmapped internal trace events are
dropped, so you only ever see meaningful, typed events.

## Configuration

`createAncherClient(config)` — every browser/app concern is an injectable hook,
so the same client runs in a browser, a Node service, an edge worker, or a test.

| Option | Purpose |
| --- | --- |
| `baseUrl` | API **origin** only, e.g. `https://api.ancher.ai` (no `/api/v1`, no trailing slash — generated paths already carry the prefix). Defaults to `ANCHER_BASE_URL` (`https://api.ancher.ai`). |
| `fetch` | Custom `fetch` (Node, undici, mock). Defaults to global `fetch`. |
| `credentials` | Request credentials mode. Defaults to `'include'`. |
| `getAccessToken` | Returns the current bearer token (OAuth2 access token, rotating mobile token, …). Re-invoked per request; takes precedence over `apiKey`. |
| `apiKey` / `apiKeyHeader` | Static bearer token — sugar for a constant `getAccessToken`. Defaults to `Authorization: Bearer`. |
| `defaultHeaders` | Headers merged into every request. |
| `getCsrfToken` | Returns the CSRF token → `X-CSRF-Token`. |
| `getDeviceId` | Returns a device ID → `x-device-id`. |
| `getTimezone` | Returns an IANA timezone → `x-timezone`. |
| `refreshSession` | Refresh the session; return `true` on success. Called reactively on 401 (retry once) and proactively near `getSessionExpiresAt`. De-duplicated by the transport. |
| `getSessionExpiresAt` | Epoch-ms expiry of the session credential (or `null` = unknown). Enables proactive refresh before requests issued within the leeway. Supplied automatically by `createTokenManager`'s `authConfig`. |
| `refreshLeewaySeconds` | Refresh this many seconds before `getSessionExpiresAt`. Default 120. |
| `onActivationRequired` | Called on the 403 activation gate (`API-USR010`); return `'retry'`. |
| `onError` | Side effect on every error (e.g. open insufficient-credits dialog on `API-BIS002`). |

## Errors

Non-2xx responses are normalized into `AncherApiError` (`message`, `status`,
`code`, `details`, `body`). Helpers:

```ts
import {
  AncherApiError,
  isAncherApiError,
  isInsufficientCreditsError,   // HTTP 402 / API-BIS002
  isActivationRequiredError,    // HTTP 403 / API-USR010
} from '@ancher-ai/sdk'
```

> When you call with `withResponse: true`, the error response is returned (not
> thrown) so you can inspect `.status` / `.data`; `onError` still fires.

## Regenerating from the API (`pnpm generate`)

The typed client under `src/api/generated/` is **codegen output** — never
hand-edit it. To refresh against the live API:

```bash
pnpm generate
```

This runs two steps (same pipeline as the source app):

1. `node scripts/fetch-openapi.js [url]` — downloads the OpenAPI spec to
   `openapi.json` and rewrites it: strips ignored tags (`Feishu`, `Slack`,
   `OAuth2`), the transport-injected header params (`x-csrf-token`,
   `x-device-id`, `x-timezone`), and the `x-data-frame-schema` extensions that
   the codegen ref parser can't resolve. Default URL:
   `https://api.ancher.ai/api/v1/openapi.json` (override with a `<url>` argument
   or the `ANCHER_OPENAPI_URL` env var).
2. `typed-openapi openapi.json --output src/api/generated/api.client.ts --tanstack` —
   regenerates `api.client.ts` (the typed `ApiClient`) and `tanstack.client.ts`
   (the `TanstackQueryApiClient`).

The hand-written enum constants and `Where` types in `src/contracts/` are
drift-checked against the generated output at compile time, so if a refresh
changes an enum union or names a field like a filter operator, `pnpm typecheck`
fails and points at what to update.

## Build

```bash
pnpm build       # tsup → dist (ESM + CJS + .d.ts): index, oauth2, tanstack, contracts
pnpm typecheck   # tsc --noEmit
```

## Layout

```
src/
├── index.ts                Public surface (raw layer + repository layer re-exports)
├── api/                    RAW layer — typed client + transport
│   ├── client.ts           createAncherClient
│   ├── config.ts           AncherClientConfig + ANCHER_BASE_URL
│   ├── transport.ts        Fetcher: CSRF/device/tz headers, criteria encoding, error normalization
│   ├── auth.ts             Shared auth + request lifecycle (token header, 401/403 retry)
│   ├── token-manager.ts    Token lifecycle core (proactive/reactive refresh, dedup, storage)
│   ├── upload.ts           Multipart upload helper (+ progress)
│   ├── errors.ts           AncherApiError + code helpers
│   ├── error-codes.ts      Generated error-code catalog — do not edit
│   └── generated/          Codegen output — do not edit (api.client.ts, tanstack.client.ts)
├── contracts/              Type surface + runtime helpers (@ancher-ai/sdk/contracts)
│   ├── index.ts            Barrel — the one import source for consumers
│   ├── schemas.ts          Re-export of the generated Schemas namespace
│   ├── common.ts           Page, UUID, BaseEntity, endpoint-query helpers
│   ├── query.ts            Typed list surface: Where/ListOptions operators + likePattern
│   ├── assert.ts           Expect/Eq drift-check helpers + isEnumValue
│   └── <entity>.ts         Per-domain aliases, enum constants, XWhere/XOrderBy/XListOptions
│                           (note, artifact, collection, conversation, notification, pin,
│                            recommendation, suggestion, file, billing, auth, user, …)
├── repositories/           Repository layer — plain-data repos over client.api
│   ├── base.ts             Page<T> + createListSurface (list/count/iterate factory)
│   ├── query.ts            buildListQuery: {where,orderBy,…} → wire criteria DSL
│   ├── index.ts            Re-exports
│   └── <entity>.ts         createXRepository (note, file, user, api-key, artifact, tag,
│                            collection, conversation, message, pinned, notification,
│                            suggestion, recommendation, session, connection)
├── create-ancher-sdk.ts    createAncherSdk → { client, Note, File, User, … }
├── services.ts             Action/singleton services (Billing, Device, Retrieval, ImagePrompt, TextSelection)
├── chat.ts                 Structured SSE chat-stream consumer (ChatEvent, consumeChat)
├── presets/
│   └── oauth2.ts           OAuth2 preset — PKCE, token exchange (optional entry)
└── tanstack.ts             TanStack Query integration (optional entry)
```
