import { extractPdfText } from './pdf'
import type { IngestCtx, RawSnapshot } from './types'

// Several state .gov sites 403-block an honest bot User-Agent. Browserless
// already evaded this by presenting a Chrome UA; now that direct fetch is the
// default for HTML sources (browserless was overloaded + buggy), direct fetch
// must present the same browser UA or those sites reject it. robots.txt is
// still honored under our bot identity (assertRobotsAllowed matches the
// DueDateHQ-PulseBot agent string independently of this request header).
export const PULSE_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

export const DEFAULT_HEADERS = {
  'User-Agent': PULSE_BROWSER_USER_AGENT,
  // Trailing */* (as real browsers send) so servers that strictly content-negotiate
  // don't 406 us when the target is a PDF or other type not in the explicit list.
  Accept:
    'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/json,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  // Present as a top-level browser navigation. Some .gov WAFs return 400/403 to a
  // Chrome User-Agent that arrives without the Sec-Fetch-*/Upgrade-Insecure-Requests
  // headers a real Chrome always sends (UA-vs-header fingerprint mismatch = bot).
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
} as const

export const RATE_LIMIT = {
  minIntervalMs: 30_000,
  maxConcurrent: 1,
  backoffOn429Ms: 15 * 60_000,
} as const

export const FETCH_TIMEOUT_MS = 30_000

// Per-request watchdog for every outbound origin fetch. Without it a hung
// origin stalls the queue invocation until the runtime hard-kills it — the
// caller's catch never runs, recordSourceFailure is skipped, and the message
// re-enqueues forever. Manual AbortController + setTimeout (the
// packages/ai gateway idiom) so the timer is always cleared once the
// response settles.
export function withFetchTimeout(
  fetchImpl: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetchImpl(input, { ...init, signal: controller.signal })
    } catch (error) {
      if (controller.signal.aborted) {
        const url = input instanceof Request ? input.url : String(input)
        throw new Error(`fetch_timeout: ${url} exceeded ${timeoutMs}ms`, { cause: error })
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}

const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const robotsCache = new Map<string, { checkedAt: number; body: string | null }>()

export async function hashText(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function stableExternalId(url: string): string {
  const parsed = new URL(url)
  parsed.hash = ''
  return parsed.toString()
}

export function textExcerpt(text: string, max = 6000): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max)
}

function contentDispositionHasPdfFilename(contentDisposition: string | null): boolean {
  return /filename\*?=(?:UTF-8''|")?[^";]+\.pdf(?:[";]|$)/i.test(contentDisposition ?? '')
}

export function isPdfSourceResponse(input: {
  contentType: string
  url: string
  contentDisposition?: string | null
}): boolean {
  return (
    input.contentType.includes('application/pdf') ||
    /\.pdf(?:[?#]|$)/i.test(input.url) ||
    contentDispositionHasPdfFilename(input.contentDisposition ?? null)
  )
}

export async function readSourceResponseText(
  response: Response,
  input: { sourceId: string; url: string },
): Promise<{ body: string; contentType: string | null; isPdf: boolean }> {
  const contentType = response.headers.get('content-type') ?? ''
  const isPdf = isPdfSourceResponse({
    contentType,
    url: input.url,
    contentDisposition: response.headers.get('content-disposition'),
  })
  if (!isPdf) {
    return {
      body: await response.text(),
      contentType: response.headers.get('content-type'),
      isPdf: false,
    }
  }

  const text = await response.arrayBuffer().then(extractPdfText)
  if (!text) throw new Error(`Pulse source PDF text extraction failed for ${input.sourceId}`)

  return {
    body: text,
    contentType: 'text/plain; charset=utf-8',
    isPdf: true,
  }
}

function pathDisallowedByRobots(robots: string, userAgent: string, path: string): boolean {
  const lines = robots.split(/\r?\n/)
  let applies = false
  for (const line of lines) {
    const trimmed = line.replace(/#.*/, '').trim()
    if (!trimmed) continue
    const separator = trimmed.indexOf(':')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim().toLowerCase()
    const value = trimmed.slice(separator + 1).trim()
    if (key === 'user-agent') {
      applies = value === '*' || value.toLowerCase() === userAgent.toLowerCase()
      continue
    }
    if (applies && key === 'disallow' && value && path.startsWith(value)) return true
  }
  return false
}

async function assertRobotsAllowed(ctx: IngestCtx, url: URL): Promise<void> {
  const robotsUrl = new URL('/robots.txt', url.origin)
  try {
    const cached = robotsCache.get(robotsUrl.toString())
    const now = Date.now()
    let robots: string | null
    if (cached && now - cached.checkedAt < ROBOTS_CACHE_TTL_MS) {
      robots = cached.body
    } else {
      const response = await ctx.fetch(robotsUrl, { headers: DEFAULT_HEADERS })
      robots = response.ok ? await response.text() : null
      robotsCache.set(robotsUrl.toString(), { checkedAt: now, body: robots })
    }
    if (!robots) return
    if (pathDisallowedByRobots(robots, 'DueDateHQ-PulseBot/1.0', url.pathname)) {
      throw new Error(`Pulse source robots.txt disallows ${url.pathname}`)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('disallows')) throw error
  }
}

async function fetchWithRetry(ctx: IngestCtx, url: string, init: RequestInit): Promise<Response> {
  const response = await ctx.fetch(url, init)
  if (response.ok || response.status === 304 || response.status < 500) return response
  return ctx.fetch(url, init)
}

export async function fetchTextSnapshot(
  ctx: IngestCtx,
  input: { sourceId: string; url: string },
): Promise<RawSnapshot> {
  const url = new URL(input.url)
  await assertRobotsAllowed(ctx, url)

  const state = await ctx.getSourceState?.(input.sourceId)
  const headers = new Headers(DEFAULT_HEADERS)
  if (state?.etag) headers.set('If-None-Match', state.etag)
  if (state?.lastModified) headers.set('If-Modified-Since', state.lastModified)

  const response = await fetchWithRetry(ctx, input.url, { headers })
  const fetchedAt = new Date()
  const externalId = stableExternalId(input.url)
  if (response.status === 304) {
    return {
      sourceId: input.sourceId,
      fetchedAt,
      body: '',
      contentHash: '',
      r2Key: '',
      contentType: response.headers.get('content-type'),
      etag: response.headers.get('etag') ?? state?.etag ?? null,
      lastModified: response.headers.get('last-modified') ?? state?.lastModified ?? null,
      notModified: true,
    }
  }

  if (!response.ok) {
    throw new Error(`Pulse source fetch failed for ${input.sourceId}: ${response.status}`)
  }

  const parsedBody = await readSourceResponseText(response, input)
  const archived = await ctx.archiveRaw({
    sourceId: input.sourceId,
    externalId,
    fetchedAt,
    body: parsedBody.body,
    contentType: parsedBody.contentType,
  })

  return {
    sourceId: input.sourceId,
    fetchedAt,
    body: parsedBody.body,
    contentHash: archived.contentHash,
    r2Key: archived.r2Key,
    contentType: parsedBody.contentType,
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
  }
}
