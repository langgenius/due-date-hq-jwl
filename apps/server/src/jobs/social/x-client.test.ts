import { describe, expect, it, vi } from 'vitest'
import { buildXOAuthHeader, createXPost, type XOAuthCredentials } from './x-client'

const CREDENTIALS: XOAuthCredentials = {
  apiKey: 'consumer-key',
  apiSecret: 'consumer-secret',
  accessToken: 'access-token',
  accessTokenSecret: 'access-secret',
}

describe('buildXOAuthHeader', () => {
  it('creates a deterministic OAuth 1.0a HMAC-SHA1 header', async () => {
    const header = await buildXOAuthHeader(CREDENTIALS, {
      method: 'POST',
      url: 'https://api.x.com/2/tweets',
      now: new Date('2026-07-21T13:00:00.000Z'),
      nonce: 'fixed-nonce',
    })

    expect(header).toContain('oauth_consumer_key="consumer-key"')
    expect(header).toContain('oauth_nonce="fixed-nonce"')
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"')
    expect(header).toContain('oauth_token="access-token"')
    expect(header).toMatch(/oauth_signature="[^"]+"/u)
  })
})

describe('createXPost', () => {
  it('returns the X Post ID after an accepted request', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: 'post-123', text: 'hello' } }), { status: 201 }),
      )

    await expect(
      createXPost('hello', CREDENTIALS, {
        fetch: fetcher,
        now: new Date('2026-07-21T13:00:00.000Z'),
        nonce: 'nonce',
      }),
    ).resolves.toEqual({ kind: 'published', externalPostId: 'post-123', text: 'hello' })
    expect(fetcher).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0]!
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('authorization')).toMatch(/^OAuth /u)
    expect(init?.body).toBe(JSON.stringify({ text: 'hello' }))
  })

  it.each([400, 401, 429])(
    'classifies an HTTP %s response as a definite failure',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: `rejected-${status}` }), { status }),
        )

      await expect(createXPost('hello', CREDENTIALS, { fetch: fetcher })).resolves.toEqual({
        kind: 'definite_failure',
        httpStatus: status,
        reason: `rejected-${status}`,
      })
    },
  )

  it('classifies an HTTP 5xx response as unknown because acceptance is ambiguous', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: 'upstream failed' }), { status: 503 }),
      )

    await expect(createXPost('hello', CREDENTIALS, { fetch: fetcher })).resolves.toEqual({
      kind: 'unknown',
      httpStatus: 503,
      reason: 'upstream failed',
    })
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('classifies a network failure as unknown and never retries itself', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('connection reset'))

    await expect(createXPost('hello', CREDENTIALS, { fetch: fetcher })).resolves.toEqual({
      kind: 'unknown',
      reason: 'connection reset',
    })
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('classifies a successful response without a Post ID as unknown', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ data: { text: 'hello' } }), { status: 201 }))

    await expect(createXPost('hello', CREDENTIALS, { fetch: fetcher })).resolves.toEqual({
      kind: 'unknown',
      httpStatus: 201,
      reason: 'X API returned success without a Post ID.',
    })
  })
})
