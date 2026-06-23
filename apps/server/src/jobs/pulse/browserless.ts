import type { IngestFetch } from '@duedatehq/ingest'
import { withFetchTimeout } from '@duedatehq/ingest/http'

export interface BrowserlessConfig {
  endpoint?: string | undefined
  token?: string | undefined
  /** Test hook — pause before the single 429 retry (default 5s). */
  retry429DelayMs?: number | undefined
}

// Browserless meters CONCURRENT renders per account: a cron tick fanning a
// dozen sources straight through the REST API trips its 429 before any target
// site is contacted (politeness is keyed on TARGET hosts, so cross-host
// browserless calls otherwise fire simultaneously). Serialize renders
// isolate-wide — renders take seconds each, so a tick's wave still clears in
// minutes — and pace one retry for whatever still collides across isolates.
let renderSlot: Promise<unknown> = Promise.resolve()

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
// schema (additionalProperties:false) that has BROKEN COMPATIBILITY TWICE in
// prod: top-level `method`/`headers`/`body` were rejected (fixed 06-01), and
// on 2026-06-10 the cloud schema turned `userAgent` from a string into an
// object ('"userAgent" must be object') while their docs still show a string
// — every browserless-routed source 400'd for a day. Defend in depth: the
// caller's User-Agent ALSO rides in `setExtraHTTPHeaders` (CDP applies it to
// outgoing request headers), and any 400 that names `userAgent` retries once
// without that field, so the next schema drift degrades to the header-level
// override instead of killing the sources. Cache-Control is dropped —
// browserless manages caching itself.
function browserlessExtraHeaders(headers: RequestInit['headers']): Record<string, string> {
  const serializable = new Headers(headers)
  for (const [key, value] of Object.entries(BROWSERLESS_TARGET_HEADERS)) {
    serializable.set(key, value)
  }
  serializable.delete('Cache-Control')
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
  // Cloudflare Browser Rendering /content wraps the HTML in the standard API
  // envelope: { success, errors, result: "<html>" }.
  const result = typeof payload.result === 'string' ? payload.result : null
  const body = html ?? text ?? result
  if (!body) return null
  return createBrowserlessResponse(
    body,
    response,
    text && !html && !result ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8',
  )
}

// Cloudflare Browser Rendering's /content REST endpoint is a drop-in for
// browserless.io's /content from this fetcher's view — same "POST {url,…} → get
// rendered HTML" shape — so the source allowlist + serialization are shared and
// only the auth, request body and response envelope differ. Switch on the host so
// migrating between them (and rolling back) is a config change, not a code change.
function isCloudflareRenderEndpoint(endpoint: string): boolean {
  try {
    return /(?:^|\.)cloudflare\.com$/i.test(new URL(endpoint).host)
  } catch {
    return /browser-rendering/i.test(endpoint)
  }
}

export function createBrowserlessFetch(config: BrowserlessConfig): IngestFetch | null {
  if (!config.endpoint) return null
  const cloudflare = isCloudflareRenderEndpoint(config.endpoint)
  // CF authenticates with a Bearer header (token never in the URL); browserless.io
  // carries the token as a ?token= query param (browserlessEndpoint).
  const endpoint = cloudflare ? config.endpoint : browserlessEndpoint(config)
  // Either service renders server-side (~30s goto budget), so the proxied request
  // gets a roomier watchdog than direct fetches.
  const timedFetch = withFetchTimeout(fetch, 60_000)

  return async (input, init) => {
    const targetUrl = input instanceof URL ? input.toString() : input
    const userAgent = browserlessUserAgent(init?.headers)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...(cloudflare && config.token ? { Authorization: `Bearer ${config.token}` } : {}),
    }
    const post = (body: Record<string, unknown>) =>
      timedFetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
    const baseBody = {
      url: targetUrl,
      setExtraHTTPHeaders: {
        ...browserlessExtraHeaders(init?.headers),
        'user-agent': userAgent,
      },
    }
    // 2026-06-23: render after the network settles ("networkidle") so
    // client-rendered news lists (SharePoint WebParts, JS feeds) land in the
    // captured HTML instead of just the shell.
    const WAIT = { gotoOptions: { waitUntil: 'networkidle2', timeout: 20_000 }, bestAttempt: true }
    const render = async (): Promise<Response> => {
      if (cloudflare) {
        // CF /content: userAgent is a plain string; skip images/media/fonts to save
        // browser time; pace a 429 (CF's rate limit). Its schema is stable, so no
        // field-drop fallback is needed.
        const cfBody: Record<string, unknown> = {
          ...baseBody,
          userAgent,
          gotoOptions: { waitUntil: 'networkidle0', timeout: 25_000 },
          rejectResourceTypes: ['image', 'media', 'font'],
        }
        let response = await post(cfBody)
        if (response.status === 429) {
          await delay(config.retry429DelayMs ?? 5_000)
          response = await post(cfBody)
        }
        return response
      }
      // browserless.io path. `bestAttempt` returns whatever rendered if the idle
      // wait times out. The cloud schema drifts (the userAgent field flipped from
      // string to a CDP object), so on a 400 we drop the rejected field — wait
      // options first, then userAgent — and keep the source alive, capping at two
      // drops.
      let body: Record<string, unknown> = { ...baseBody, ...WAIT, userAgent: { userAgent } }
      let response = await post(body)
      for (let attempt = 0; attempt < 2 && response.status === 400; attempt++) {
        const rejection = await response
          .clone()
          .text()
          .catch(() => '')
        if (
          /gotoOptions|waitUntil|networkidle|bestAttempt/i.test(rejection) &&
          'gotoOptions' in body
        ) {
          delete body.gotoOptions
          delete body.bestAttempt
        } else if (/userAgent/i.test(rejection) && 'userAgent' in body) {
          delete body.userAgent
        } else {
          break
        }
        response = await post(body)
      }
      // A bare 429 (no x-response-code) is browserless's own concurrency
      // limiter, not the target site — pace and retry once.
      if (response.status === 429 && !response.headers.has('x-response-code')) {
        await delay(config.retry429DelayMs ?? 5_000)
        response = await post(body)
      }
      return response
    }
    const rendered = renderSlot.then(render, render)
    renderSlot = rendered.then(
      () => undefined,
      () => undefined,
    )
    const response = await rendered
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
