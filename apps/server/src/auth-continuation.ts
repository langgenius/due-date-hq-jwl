import { AsyncLocalStorage } from 'node:async_hooks'

export const AUTH_CONTINUE_HEADER = 'x-auth-continue'
const AUTH_CONTINUE_ORIGIN = 'https://app.duedatehq.invalid'
const MAX_CONTINUE_LENGTH = 2_048
const continuationStore = new AsyncLocalStorage<string | null>()

// Authentication headers are untrusted input. Preserve only a bounded path on
// the app origin, never an absolute URL or a Worker API/RPC endpoint.
export function resolveAuthContinue(headers: Headers): string | null {
  const raw = headers.get(AUTH_CONTINUE_HEADER)
  if (!raw || raw.length > MAX_CONTINUE_LENGTH || !raw.startsWith('/') || raw.startsWith('//')) {
    return null
  }

  try {
    const url = new URL(raw, AUTH_CONTINUE_ORIGIN)
    if (
      url.origin !== AUTH_CONTINUE_ORIGIN ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/rpc/')
    ) {
      return null
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function runWithAuthContinue<T>(continuePath: string | null, fn: () => T): T {
  return continuationStore.run(continuePath, fn)
}

export function getAuthContinue(): string | null {
  return continuationStore.getStore() ?? null
}
