import { DEFAULT_HEADERS, readSourceResponseText, stableExternalId, textExcerpt } from './http'
import { parsedItemsFromRss } from './rss'
import { extractLinks, stripHtml } from './selectors'
import type { IngestCtx, ParsedItem, RawSnapshot } from './types'

export interface AnnouncementSourceConfig {
  id: string
  title: string
  url: string
  jurisdiction?: string
}

export interface AnnouncementLink {
  href: string
  text: string
}

export interface AnnouncementParseOptions {
  limit?: number
  fallbackToSourceSnapshot?: boolean
  linkFilter?: (link: AnnouncementLink) => boolean
  relevancePredicate?: (text: string, href: string) => boolean
}

export interface PdfAnnouncementLinkParseOptions extends Pick<
  AnnouncementParseOptions,
  'limit' | 'linkFilter' | 'relevancePredicate'
> {
  publishedAtForLink?: (link: AnnouncementLink) => Date | null
}

// `refund` … `revenue procedure` added 2026-06-08 for the FED rights-window
// sources (Taxpayer Advocate blog, Actions on Decisions, Internal Revenue
// Bulletins): protective-claim / refund-window link text was being dropped by the
// state-DOR-tuned vocabulary above, so those sources parsed to zero items.
const TAX_ANNOUNCEMENT_RE =
  /deadline|due date|relief|disaster|storm|wildfire|flood|filing|payment|extension|franchise|return|rules and regulations|chapter|effective date|tax alert|tax update|tax bulletin|tax notice|technical bulletin|technical information release|administrative notice|technical assistance|policy statement|withholding|sales tax|estimated tax|refund|protective claim|abatement|actions on decision|action on decision|acquiescence|internal revenue bulletin|revenue ruling|revenue procedure/i
const HIGH_SIGNAL_TAX_CHANGE_RE =
  /deadline|due date|relief|disaster|extension|filing|payment|rules and regulations|chapter|effective date|tax alert|tax update|tax bulletin|technical bulletin|technical information release|administrative notice|technical assistance|refund|protective claim|abatement|actions on decision|action on decision|acquiescence|internal revenue bulletin|revenue ruling|revenue procedure/i
const ANNOUNCEMENT_NOISE_RE =
  /award|auction|career|hiring|job opening|staff|appointment|webinar|seminar|office hour|office closure|holiday schedule|unclaimed property|scam|fraud|phishing|identity theft|password|login|portal maintenance|system maintenance|newsletter/i

export function linkLooksTaxAnnouncementRelevant(text: string, href: string): boolean {
  const candidate = `${text} ${href}`
  if (!TAX_ANNOUNCEMENT_RE.test(candidate)) return false
  return !ANNOUNCEMENT_NOISE_RE.test(candidate) || HIGH_SIGNAL_TAX_CHANGE_RE.test(candidate)
}

const WY_TAXING_ISSUES_RE = /^(\d{2})-(\d{4})\s+Taxing Issues$/i

function defaultLinkFilterForSource(
  source: AnnouncementSourceConfig,
): ((link: AnnouncementLink) => boolean) | undefined {
  if (source.id !== 'wy.temporary_announcements') return undefined
  return (link) => WY_TAXING_ISSUES_RE.test(link.text.trim())
}

function defaultRelevancePredicateForSource(
  source: AnnouncementSourceConfig,
): (text: string, href: string) => boolean {
  if (source.id !== 'wy.temporary_announcements') {
    return linkLooksTaxAnnouncementRelevant
  }
  return (text) => WY_TAXING_ISSUES_RE.test(text.trim())
}

function defaultPublishedAtForLink(
  source: AnnouncementSourceConfig,
): ((link: AnnouncementLink) => Date | null) | undefined {
  if (source.id !== 'wy.temporary_announcements') return undefined
  return (link) => {
    const match = WY_TAXING_ISSUES_RE.exec(link.text.trim())
    if (!match) return null
    const month = Number(match[1])
    const year = Number(match[2])
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      return null
    }
    return new Date(Date.UTC(year, month - 1, 1))
  }
}

function effectiveLinkFilter(
  source: AnnouncementSourceConfig,
  options: Pick<AnnouncementParseOptions, 'linkFilter'>,
): ((link: AnnouncementLink) => boolean) | undefined {
  return options.linkFilter ?? defaultLinkFilterForSource(source)
}

function effectiveRelevancePredicate(
  source: AnnouncementSourceConfig,
  options: Pick<AnnouncementParseOptions, 'relevancePredicate'>,
): (text: string, href: string) => boolean {
  return options.relevancePredicate ?? defaultRelevancePredicateForSource(source)
}

function linkPassesOptions(
  source: AnnouncementSourceConfig,
  link: AnnouncementLink,
  options: Pick<AnnouncementParseOptions, 'linkFilter' | 'relevancePredicate'>,
): boolean {
  const linkFilter = effectiveLinkFilter(source, options)
  if (linkFilter && !linkFilter(link)) return false
  return effectiveRelevancePredicate(source, options)(link.text, link.href)
}

export function announcementItemsFromHtml(
  source: AnnouncementSourceConfig,
  body: string,
  fetchedAt: Date,
  limit = 20,
  options: Pick<AnnouncementParseOptions, 'linkFilter' | 'relevancePredicate'> = {},
): ParsedItem[] {
  return extractLinks(body, source.url)
    .filter((link) => linkPassesOptions(source, link, options))
    .slice(0, limit)
    .map((link) => {
      const officialSourceUrl = normalizedGoogleDrivePdfLink(link.href)?.officialUrl ?? link.href
      return Object.assign(
        {
          sourceId: source.id,
          externalId: stableExternalId(officialSourceUrl),
          title: link.text || `${source.title} update`,
          publishedAt: fetchedAt,
          officialSourceUrl,
          rawText: textExcerpt(
            [link.text, stripHtml(body)].join(`

`),
          ),
        },
        source.jurisdiction ? { jurisdiction: source.jurisdiction } : {},
      )
    })
}

export function sourceSnapshotAnnouncementItem(
  source: AnnouncementSourceConfig,
  body: string,
  fetchedAt: Date,
): ParsedItem {
  return {
    sourceId: source.id,
    externalId: stableExternalId(source.url),
    title: `${source.title} official source snapshot`,
    publishedAt: fetchedAt,
    officialSourceUrl: source.url,
    rawText: textExcerpt(stripHtml(body)),
    ...(source.jurisdiction ? { jurisdiction: source.jurisdiction } : {}),
  }
}

export function announcementItemsFromSnapshot(
  source: AnnouncementSourceConfig,
  snapshot: Pick<RawSnapshot, 'body' | 'fetchedAt'>,
  options: AnnouncementParseOptions = {},
): ParsedItem[] {
  const limit = options.limit ?? 20
  if (/<(?:rss|feed)\b/i.test(snapshot.body)) {
    const items = parsedItemsFromRss({
      sourceId: source.id,
      feedUrl: source.url,
      xml: snapshot.body,
      limit,
      ...(source.jurisdiction ? { jurisdiction: source.jurisdiction } : {}),
    }).filter((item) =>
      linkPassesOptions(
        source,
        { text: `${item.title} ${item.rawText}`, href: item.officialSourceUrl },
        options,
      ),
    )
    if (items.length > 0) return items
  }

  const htmlItems = announcementItemsFromHtml(
    source,
    snapshot.body,
    snapshot.fetchedAt,
    limit,
    options,
  )
  if (htmlItems.length > 0) return htmlItems
  return options.fallbackToSourceSnapshot
    ? [sourceSnapshotAnnouncementItem(source, snapshot.body, snapshot.fetchedAt)]
    : []
}

function linksFromSnapshot(
  source: AnnouncementSourceConfig,
  snapshot: Pick<RawSnapshot, 'body' | 'fetchedAt'>,
  limit: number,
): AnnouncementLink[] {
  if (/<(?:rss|feed)\b/i.test(snapshot.body)) {
    return parsedItemsFromRss({
      sourceId: source.id,
      feedUrl: source.url,
      xml: snapshot.body,
      limit,
      ...(source.jurisdiction ? { jurisdiction: source.jurisdiction } : {}),
    }).map((item) => ({
      href: item.officialSourceUrl,
      text: `${item.title} ${item.rawText}`.trim(),
    }))
  }
  return extractLinks(snapshot.body, source.url)
}

function googleDriveFileId(url: URL): string | null {
  const fileMatch = /^\/file\/d\/([^/]+)/.exec(url.pathname)
  if (fileMatch?.[1]) return fileMatch[1]
  if (url.hostname === 'drive.google.com' || url.hostname === 'drive.usercontent.google.com') {
    return url.searchParams.get('id')
  }
  return null
}

function normalizedGoogleDrivePdfLink(
  href: string,
): { downloadUrl: string; officialUrl: string } | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host !== 'drive.google.com' && host !== 'drive.usercontent.google.com') return null

  const fileId = googleDriveFileId(url)
  if (!fileId) return null

  const downloadUrl = new URL('https://drive.google.com/uc')
  downloadUrl.searchParams.set('export', 'download')
  downloadUrl.searchParams.set('id', fileId)
  return {
    downloadUrl: downloadUrl.toString(),
    officialUrl: `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`,
  }
}

function linkLooksLikePdfCandidate(link: AnnouncementLink): boolean {
  const candidate = `${link.text} ${link.href}`
  if (/\.pdf(?:[?#]|$)/i.test(link.href)) return true
  if (/\bpdf\b/i.test(candidate)) return true
  if (normalizedGoogleDrivePdfLink(link.href)) return true

  try {
    const url = new URL(link.href)
    const pathname = url.pathname.toLowerCase()
    return (
      /\/(?:download|downloads|files?|documents?)(?:\/|$)/i.test(pathname) &&
      /tax update|tax bulletin|tax notice|technical bulletin|technical information release|administrative notice|policy statement|notice|bulletin|newsletter/i.test(
        candidate,
      )
    )
  } catch {
    return false
  }
}

function normalizedPdfLink(
  link: AnnouncementLink,
): { downloadUrl: string; officialUrl: string } | null {
  const googleDriveLink = normalizedGoogleDrivePdfLink(link.href)
  if (googleDriveLink) return googleDriveLink
  if (!linkLooksLikePdfCandidate(link)) return null
  return {
    downloadUrl: link.href,
    officialUrl: link.href,
  }
}

function pdfFetchHeaders(): Headers {
  const headers = new Headers(DEFAULT_HEADERS)
  headers.set('Accept', 'application/pdf,application/octet-stream,text/html;q=0.8,*/*;q=0.5')
  return headers
}

interface PdfAnnouncementCandidate {
  link: AnnouncementLink
  normalized: { downloadUrl: string; officialUrl: string }
  externalId: string
}

function pdfAnnouncementCandidatesFromLinks(
  source: AnnouncementSourceConfig,
  links: readonly AnnouncementLink[],
  limit: number,
  options: Pick<PdfAnnouncementLinkParseOptions, 'linkFilter' | 'relevancePredicate'>,
): PdfAnnouncementCandidate[] {
  const linkFilter = effectiveLinkFilter(source, options)
  const relevancePredicate = effectiveRelevancePredicate(source, options)
  const seen = new Set<string>()
  const candidates: PdfAnnouncementCandidate[] = []

  for (const link of links) {
    if (candidates.length >= limit) break
    if (linkFilter && !linkFilter(link)) continue
    if (!relevancePredicate(link.text, link.href)) continue

    const normalized = normalizedPdfLink(link)
    if (!normalized) continue
    const externalId = stableExternalId(normalized.officialUrl)
    if (seen.has(externalId)) continue
    seen.add(externalId)
    candidates.push({ link, normalized, externalId })
  }

  return candidates
}

export async function pdfAnnouncementItemsFromLinks(
  source: AnnouncementSourceConfig,
  links: readonly AnnouncementLink[],
  ctx: Pick<IngestCtx, 'fetch' | 'binaryFetch'>,
  fetchedAt: Date,
  options: PdfAnnouncementLinkParseOptions = {},
): Promise<ParsedItem[]> {
  const limit = options.limit ?? 20
  const publishedAtForLink = options.publishedAtForLink ?? defaultPublishedAtForLink(source)
  const fetchPdf = ctx.binaryFetch ?? ctx.fetch
  const candidates = pdfAnnouncementCandidatesFromLinks(source, links, limit, options)

  const items = await Promise.all(
    candidates.map(async ({ link, normalized, externalId }): Promise<ParsedItem | null> => {
      try {
        const response = await fetchPdf(normalized.downloadUrl, { headers: pdfFetchHeaders() })
        if (!response.ok) return null
        const parsed = await readSourceResponseText(response, {
          sourceId: source.id,
          url: normalized.downloadUrl,
        })
        if (!parsed.isPdf) return null

        return Object.assign(
          {
            sourceId: source.id,
            externalId,
            title: link.text || `${source.title} PDF update`,
            publishedAt: publishedAtForLink?.(link) ?? fetchedAt,
            officialSourceUrl: normalized.officialUrl,
            rawText: textExcerpt(
              [link.text, parsed.body].join(`

`),
            ),
          },
          source.jurisdiction ? { jurisdiction: source.jurisdiction } : {},
        )
      } catch {
        // Ignore a single linked-PDF failure so one stale attachment does not block the source.
        return null
      }
    }),
  )

  return items.filter((item): item is ParsedItem => item !== null)
}

export async function announcementItemsFromSnapshotWithPdfLinks(
  source: AnnouncementSourceConfig,
  snapshot: Pick<RawSnapshot, 'body' | 'fetchedAt'>,
  ctx: Pick<IngestCtx, 'fetch' | 'binaryFetch'>,
  options: AnnouncementParseOptions &
    Pick<PdfAnnouncementLinkParseOptions, 'publishedAtForLink'> = {},
): Promise<ParsedItem[]> {
  const limit = options.limit ?? 20
  const links = linksFromSnapshot(source, snapshot, limit * 3)
  const baseItems = announcementItemsFromSnapshot(source, snapshot, {
    ...options,
    fallbackToSourceSnapshot: false,
  })
  const pdfItems = await pdfAnnouncementItemsFromLinks(
    source,
    links,
    ctx,
    snapshot.fetchedAt,
    options,
  )
  const pdfCandidateIds = pdfAnnouncementCandidatesFromLinks(source, links, limit, options).map(
    (candidate) => candidate.externalId,
  )
  const seen = new Set([
    ...pdfCandidateIds,
    ...pdfItems.map((item) => stableExternalId(item.officialSourceUrl)),
  ])
  const combined = [
    ...pdfItems,
    ...baseItems.filter((item) => !seen.has(stableExternalId(item.officialSourceUrl))),
  ].slice(0, limit)

  if (combined.length > 0) return combined
  return options.fallbackToSourceSnapshot
    ? [sourceSnapshotAnnouncementItem(source, snapshot.body, snapshot.fetchedAt)]
    : []
}
