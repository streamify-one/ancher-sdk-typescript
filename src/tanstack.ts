/**
 * TanStack Query integration (optional entry point).
 *
 * Re-exports the generated `TanstackQueryApiClient` — the `--tanstack` output of
 * `pnpm generate` — and a helper to build it from an {@link AncherClient}. This
 * module imports `@tanstack/react-query`; keep it out of the core bundle by
 * importing from `@ancher-ai/sdk/tanstack` only where you use React Query.
 *
 * ```ts
 * const client = createAncherClient(config)
 * const tq = createTanstackClient(client)
 * const { data } = useQuery(tq.get('/notes/', { query: { limit: 20 } }).queryOptions)
 * ```
 */

import type { AncherClient } from './api/client'
import { TanstackQueryApiClient } from './api/generated/tanstack.client'

export { TanstackQueryApiClient } from './api/generated/tanstack.client'

export function createTanstackClient(client: AncherClient): TanstackQueryApiClient {
  return new TanstackQueryApiClient(client.api)
}
