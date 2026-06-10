import type { IngestFetch } from '@duedatehq/ingest'
import { withFetchTimeout } from '@duedatehq/ingest/http'

export interface BrowserlessConfig {
  endpoint?: string | undefined
  token?: string | undefined
}

const BROWSERLESS_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const BROWSERLESS_TARGET_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/json',
  'Accept-Language': 'en-US,en;q=0.9',
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// The browserless `/content` API validates its JSON body against a fixed
// schema (additionalProperties:false). Its accepted fields are url/html,
// `userAgent` (string), `setExtraHTTPHeaders` (object), gotoOptions, waitFor*,
// etc. — there is NO top-level `method`, `headers`, or `body`. Sending those
// (as this client previously did) is rejected with HTTP 400, which silently
// killed every browserless-routed source. Build only schema-valid fields:
// the caller's User-Agent is hoisted to `userAgent`, and the remaining target
// headers go to `setExtraHTTPHeaders` (Cache-Control is dropped — browserless
// manages caching itself).
function browserlessExtraHeaders(headers: RequestInit['headers']): Record<string, string> {
  const serializable = new Headers(headers)
  for (const [key, value] of Object.entries(BROWSERLESS_TARGET_HEADERS)) {
    serializable.set(key, value)
  }
  serializable.delete('Cache-Control')
  serializable.delete('User-Agent')
  return Object.fromEntries(serializable.entries())
}

function browserlessUserAgent(headers: RequestInit['headers']): string {
  return new Headers(headers).get('User-Agent') ?? BROWSERLESS_USER_AGENT
}

function browserlessEndpoint(config: BrowserlessConfig): string {
  const endpoint = new URL(config.endpoint!)
  if (config.token && !endpoint.searchParams.has('token')) {
    endpoint.searchParams.set('token', config.token)
  }
  return endpoint.toString()
}

function browserlessStatus(response: Response): number {
  const targetStatus = Number(response.headers.get('x-response-code'))
  if (Number.isInteger(targetStatus) && targetStatus >= 200 && targetStatus <= 599) {
    return targetStatus
  }
  return response.status
}

function responseInitFromBrowserless(response: Response, contentType: string): ResponseInit {
  const status = browserlessStatus(response)
  const headers = new Headers(response.headers)
  headers.set('content-type', contentType)
  return {
    status,
    headers,
  }
}

function responseBodyForStatus(status: number, body: string): BodyInit | null {
  return status === 204 || status === 304 ? null : body
}

function createBrowserlessResponse(
  body: string,
  response: Response,
  contentType: string,
): Response {
  const init = responseInitFromBrowserless(response, contentType)
  return new Response(responseBodyForStatus(init.status ?? response.status, body), init)
}

function responseFromBrowserlessPayload(payload: unknown, response: Response): Response | null {
  if (!isRecord(payload)) return null
  const html = typeof payload.html === 'string' ? payload.html : null
  const text = typeof payload.text === 'string' ? payload.text : null
  const body = html ?? text
  if (!body) return null
  return createBrowserlessResponse(
    body,
    response,
    html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
  )
}

export function createBrowserlessFetch(config: BrowserlessConfig): IngestFetch | null {
  if (!config.endpoint) return null
  const endpoint = browserlessEndpoint(config)
  // Browserless renders the target page server-side (its own goto budget is
  // ~30s), so the proxied request gets a roomier watchdog than direct fetches.
  const timedFetch = withFetchTimeout(fetch, 60_000)

  return async (input, init) => {
    const targetUrl = input instanceof URL ? input.toString() : input
    const response = await timedFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        url: targetUrl,
        userAgent: browserlessUserAgent(init?.headers),
        setExtraHTTPHeaders: browserlessExtraHeaders(init?.headers),
      }),
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const parsed: unknown = await response.json()
      const parsedResponse = responseFromBrowserlessPayload(parsed, response)
      if (parsedResponse) return parsedResponse
      const status = browserlessStatus(response)
      if (status === 204 || status === 304) return new Response(null, { status })
      return Response.json(parsed, { status })
    }
    const body = await response.text()
    return createBrowserlessResponse(body, response, contentType || 'text/html')
  }
}
