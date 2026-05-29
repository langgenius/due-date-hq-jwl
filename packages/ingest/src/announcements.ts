import { stableExternalId, textExcerpt } from './http'
import { parsedItemsFromRss } from './rss'
import { extractLinks, stripHtml } from './selectors'
import type { ParsedItem, RawSnapshot } from './types'

export interface AnnouncementSourceConfig {
  id: string
  title: string
  url: string
  jurisdiction?: string
}

const TAX_ANNOUNCEMENT_RE =
  /deadline|due date|relief|disaster|storm|wildfire|flood|filing|payment|extension|franchise|return|rules and regulations|chapter|effective date|tax alert|tax update|tax bulletin|tax notice|technical bulletin|technical information release|administrative notice|technical assistance|policy statement|withholding|sales tax|estimated tax/i
const HIGH_SIGNAL_TAX_CHANGE_RE =
  /deadline|due date|relief|disaster|extension|filing|payment|rules and regulations|chapter|effective date|tax alert|tax update|tax bulletin|technical bulletin|technical information release|administrative notice|technical assistance/i
const ANNOUNCEMENT_NOISE_RE =
  /award|auction|career|hiring|job opening|staff|appointment|webinar|seminar|office hour|office closure|holiday schedule|unclaimed property|scam|fraud|phishing|identity theft|password|login|portal maintenance|system maintenance|newsletter/i

export function linkLooksTaxAnnouncementRelevant(text: string, href: string): boolean {
  const candidate = `${text} ${href}`
  if (!TAX_ANNOUNCEMENT_RE.test(candidate)) return false
  return !ANNOUNCEMENT_NOISE_RE.test(candidate) || HIGH_SIGNAL_TAX_CHANGE_RE.test(candidate)
}

export function announcementItemsFromHtml(
  source: AnnouncementSourceConfig,
  body: string,
  fetchedAt: Date,
  limit = 20,
): ParsedItem[] {
  return extractLinks(body, source.url)
    .filter((link) => linkLooksTaxAnnouncementRelevant(link.text, link.href))
    .slice(0, limit)
    .map((link) =>
      Object.assign(
        {
          sourceId: source.id,
          externalId: stableExternalId(link.href),
          title: link.text || `${source.title} update`,
          publishedAt: fetchedAt,
          officialSourceUrl: link.href,
          rawText: textExcerpt(
            [link.text, stripHtml(body)].join(`

`),
          ),
        },
        source.jurisdiction ? { jurisdiction: source.jurisdiction } : {},
      ),
    )
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
  options: {
    limit?: number
    fallbackToSourceSnapshot?: boolean
  } = {},
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
      linkLooksTaxAnnouncementRelevant(`${item.title} ${item.rawText}`, item.officialSourceUrl),
    )
    if (items.length > 0) return items
  }

  const htmlItems = announcementItemsFromHtml(source, snapshot.body, snapshot.fetchedAt, limit)
  if (htmlItems.length > 0) return htmlItems
  return options.fallbackToSourceSnapshot
    ? [sourceSnapshotAnnouncementItem(source, snapshot.body, snapshot.fetchedAt)]
    : []
}
