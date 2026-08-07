import { describe, expect, it, vi } from 'vitest'
import { createAncherClient } from './client'

describe('client.ensureFreshSession', () => {
  it('runs the guarded proactive check and shares scheduler state with the transport', async () => {
    // A failing refresh + a permanently-stale expiry: only the SHARED failure
    // cooldown can explain the transport staying quiet afterwards. (With
    // per-caller state the request below would fire its own proactive
    // refresh.)
    const refreshSession = vi.fn().mockResolvedValue(false)
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    const client = createAncherClient({
      baseUrl: 'https://api.test',
      fetch: fetchMock,
      refreshSession,
      getSessionExpiresAt: () => Date.now() + 60_000, // always inside the leeway
    })

    await client.ensureFreshSession() // fails, arms the shared cooldown
    expect(refreshSession).toHaveBeenCalledTimes(1)

    await client.request('/api/v1/notes/')
    expect(refreshSession).toHaveBeenCalledTimes(1) // suppressed by the shared cooldown
    expect(fetchMock).toHaveBeenCalledTimes(1) // the request itself still went out
  })

  it('resolves as a no-op when the proactive hooks are not configured', async () => {
    const client = createAncherClient({ baseUrl: 'https://api.test', fetch: vi.fn() })

    await expect(client.ensureFreshSession()).resolves.toBeUndefined()
  })
})
