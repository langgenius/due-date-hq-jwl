import { extractPdfText } from './pdf'
import type { IngestCtx, RawSnapshot } from './types'

export const DEFAULT_HEADERS = {
  'User-Agent': 'DueDateHQ-PulseBot/1.0 (+https://duedatehq.com/bot; support@duedatehq.com)',
  Accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
} as const

export const RATE_LIMIT = {
  minIntervalMs: 30_000,
  maxConcurrent: 1,
  backoffOn429Ms: 15 * 60_000,
} as const

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

function isPdfSourceResponse(contentType: string, url: string): boolean {
  return contentType.includes('application/pdf') || /\.pdf(?:[?#]|$)/i.test(url)
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

  const contentType = response.headers.get('content-type') ?? ''
  const body = isPdfSourceResponse(contentType, input.url)
    ? await response
        .arrayBuffer()
        .then(extractPdfText)
        .then((text) => {
          if (!text)
            throw new Error(`Pulse source PDF text extraction failed for ${input.sourceId}`)
          return text
        })
    : await response.text()
  const archived = await ctx.archiveRaw({
    sourceId: input.sourceId,
    externalId,
    fetchedAt,
    body,
    contentType: isPdfSourceResponse(contentType, input.url)
      ? 'text/plain; charset=utf-8'
      : response.headers.get('content-type'),
  })

  return {
    sourceId: input.sourceId,
    fetchedAt,
    body,
    contentHash: archived.contentHash,
    r2Key: archived.r2Key,
    contentType: isPdfSourceResponse(contentType, input.url)
      ? 'text/plain; charset=utf-8'
      : response.headers.get('content-type'),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
  }
}
