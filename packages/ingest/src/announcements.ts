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
  /deadline|relief|disaster|storm|wildfire|flood|tax|filing|payment|extension|franchise|due|return|notice/i

export function linkLooksTaxAnnouncementRelevant(text: string, href: string): boolean {
  return TAX_ANNOUNCEMENT_RE.test(`${text} ${href}`)
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
    })
    if (items.length > 0) return items
  }

  const htmlItems = announcementItemsFromHtml(source, snapshot.body, snapshot.fetchedAt, limit)
  if (htmlItems.length > 0) return htmlItems
  return options.fallbackToSourceSnapshot
    ? [sourceSnapshotAnnouncementItem(source, snapshot.body, snapshot.fetchedAt)]
    : []
}
