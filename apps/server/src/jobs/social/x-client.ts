const X_CREATE_POST_URL = 'https://api.x.com/2/tweets'
const X_AUTHENTICATED_USER_URL = 'https://api.x.com/2/users/me?user.fields=username'
const DEFAULT_TIMEOUT_MS = 15_000

export interface XOAuthCredentials {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

export type XCreatePostResult =
  | { kind: 'published'; externalPostId: string; text: string }
  | { kind: 'definite_failure'; httpStatus: number; reason: string }
  | { kind: 'unknown'; httpStatus?: number; reason: string }

export interface XCreatePostOptions {
  fetch?: typeof fetch
  now?: Date
  nonce?: string
  timeoutMs?: number
}

export type XVerifyAccountResult =
  | { kind: 'verified'; userId: string; username: string }
  | { kind: 'failure'; httpStatus?: number; reason: string }

export async function verifyXAccount(
  credentials: XOAuthCredentials,
  options: XCreatePostOptions = {},
): Promise<XVerifyAccountResult> {
  const fetcher = options.fetch ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    const authorization = await buildXOAuthHeader(credentials, {
      method: 'GET',
      url: X_AUTHENTICATED_USER_URL,
      ...(options.now ? { now: options.now } : {}),
      ...(options.nonce ? { nonce: options.nonce } : {}),
    })
    let response: Response
    try {
      response = await fetcher(X_AUTHENTICATED_USER_URL, {
        method: 'GET',
        headers: { authorization },
        signal: controller.signal,
      })
    } catch (error) {
      return {
        kind: 'failure',
        reason:
          error instanceof Error
            ? error.message
            : 'X account verification failed without a response.',
      }
    }

    const responseText = await readResponseText(response)
    if (!response.ok) {
      return {
        kind: 'failure',
        httpStatus: response.status,
        reason: xErrorReason(response.status, responseText),
      }
    }

    const parsed = parseJsonRecord(responseText)
    const data = parsed && isRecord(parsed.data) ? parsed.data : null
    if (
      !data ||
      typeof data.id !== 'string' ||
      !data.id ||
      typeof data.username !== 'string' ||
      !data.username
    ) {
      return {
        kind: 'failure',
        httpStatus: response.status,
        reason: 'X API returned success without an account ID and username.',
      }
    }

    return { kind: 'verified', userId: data.id, username: data.username }
  } finally {
    clearTimeout(timeout)
  }
}

export async function createXPost(
  text: string,
  credentials: XOAuthCredentials,
  options: XCreatePostOptions = {},
): Promise<XCreatePostResult> {
  const fetcher = options.fetch ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    const authorization = await buildXOAuthHeader(credentials, {
      method: 'POST',
      url: X_CREATE_POST_URL,
      ...(options.now ? { now: options.now } : {}),
      ...(options.nonce ? { nonce: options.nonce } : {}),
    })
    let response: Response
    try {
      response = await fetcher(X_CREATE_POST_URL, {
        method: 'POST',
        headers: {
          authorization,
          'content-type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
    } catch (error) {
      return {
        kind: 'unknown',
        reason: error instanceof Error ? error.message : 'X API request failed without a response.',
      }
    }

    const responseText = await readResponseText(response)
    if (response.status >= 500) {
      return {
        kind: 'unknown',
        httpStatus: response.status,
        reason: xErrorReason(response.status, responseText),
      }
    }
    if (!response.ok) {
      return {
        kind: 'definite_failure',
        httpStatus: response.status,
        reason: xErrorReason(response.status, responseText),
      }
    }

    const parsed = parseJsonRecord(responseText)
    const data = parsed && isRecord(parsed.data) ? parsed.data : null
    if (!data || typeof data.id !== 'string' || !data.id) {
      return {
        kind: 'unknown',
        httpStatus: response.status,
        reason: 'X API returned success without a Post ID.',
      }
    }

    return {
      kind: 'published',
      externalPostId: data.id,
      text: typeof data.text === 'string' ? data.text : text,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function xErrorReason(status: number, body: string): string {
  const parsed = parseJsonRecord(body)
  if (parsed) {
    if (typeof parsed.detail === 'string' && parsed.detail) return parsed.detail
    if (typeof parsed.title === 'string' && parsed.title) return parsed.title
    if (Array.isArray(parsed.errors)) {
      const details = parsed.errors.flatMap((error) => {
        if (!isRecord(error)) return []
        if (typeof error.detail === 'string') return [error.detail]
        if (typeof error.message === 'string') return [error.message]
        return []
      })
      if (details.length) return details.join('; ')
    }
  }
  return body.trim().slice(0, 500) || `X API rejected the request with HTTP ${status}.`
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function buildXOAuthHeader(
  credentials: XOAuthCredentials,
  request: { method: string; url: string; now?: Date; nonce?: string },
): Promise<string> {
  const oauthParameters: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: request.nonce ?? crypto.randomUUID().replaceAll('-', ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor((request.now ?? new Date()).getTime() / 1000)),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  }
  const url = new URL(request.url)
  const signatureParameters = [
    ...Object.entries(oauthParameters),
    ...Array.from(url.searchParams.entries()),
  ]
    .map(([key, value]) => [rfc3986(key), rfc3986(value)] as const)
    .toSorted(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? compareEncoded(leftValue, rightValue)
        : compareEncoded(leftKey, rightKey),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  const normalizedUrl = `${url.protocol}//${url.host}${url.pathname}`
  const signatureBase = [
    request.method.toUpperCase(),
    rfc3986(normalizedUrl),
    rfc3986(signatureParameters),
  ].join('&')
  const signingKey = `${rfc3986(credentials.apiSecret)}&${rfc3986(credentials.accessTokenSecret)}`
  const oauthSignature = await hmacSha1Base64(signingKey, signatureBase)

  return `OAuth ${Object.entries({ ...oauthParameters, oauth_signature: oauthSignature })
    .toSorted(([left], [right]) => compareEncoded(left, right))
    .map(([key, value]) => `${rfc3986(key)}="${rfc3986(value)}"`)
    .join(', ')}`
}

function compareEncoded(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/gu,
    (character) => `%${character.codePointAt(0)!.toString(16).toUpperCase()}`,
  )
}

async function hmacSha1Base64(key: string, value: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)),
  )
  let binary = ''
  for (const byte of signature) binary += String.fromCharCode(byte)
  return btoa(binary)
}
