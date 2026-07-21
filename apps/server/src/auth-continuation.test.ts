import { describe, expect, it } from 'vitest'

import {
  AUTH_CONTINUE_HEADER,
  getAuthContinue,
  resolveAuthContinue,
  runWithAuthContinue,
} from './auth-continuation'

const REF = 'social_ref_1234567890abcdef'

describe('auth continuation', () => {
  it('keeps safe in-app redirect targets, including the social Alert intent', () => {
    expect(
      resolveAuthContinue(
        new Headers({ [AUTH_CONTINUE_HEADER]: `/alerts?ref=${REF}&utm_source=x` }),
      ),
    ).toBe(`/alerts?ref=${REF}&utm_source=x`)
    expect(
      resolveAuthContinue(new Headers({ [AUTH_CONTINUE_HEADER]: '/deadlines?scope=me#next' })),
    ).toBe('/deadlines?scope=me#next')

    for (const path of [
      `//evil.example/alerts?ref=${REF}`,
      `https://evil.example/alerts?ref=${REF}`,
      '/api/auth/sign-out',
      '/rpc/pulse',
    ]) {
      expect(resolveAuthContinue(new Headers({ [AUTH_CONTINUE_HEADER]: path }))).toBeNull()
    }
  })

  it('makes continuation available only inside the request frame', async () => {
    expect(getAuthContinue()).toBeNull()
    await runWithAuthContinue(`/alerts?ref=${REF}`, async () => {
      await Promise.resolve()
      expect(getAuthContinue()).toBe(`/alerts?ref=${REF}`)
    })
    expect(getAuthContinue()).toBeNull()
  })
})
