import { stableExternalId, textExcerpt } from './http'
import { stripHtml } from './selectors'
import type { ParsedItem } from './types'

export interface RssFeedItem {
  title: string
  link: string
  publishedAt: Date
  summary: string
  externalId: string
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

function tagValue(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml)
  return match ? textExcerpt(stripHtml(decodeXml(match[1]!)), 4000) : null
}

function atomLinkValue(xml: string): string | null {
  const hrefMatch = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i.exec(xml)
  if (hrefMatch?.[1]) return decodeXml(hrefMatch[1]).trim()
  return tagValue(xml, 'link')
}

function dateValue(value: string | null): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function itemBlocks(xml: string): string[] {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0])
  if (blocks.length > 0) return blocks
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0])
}

export function parseRssItems(xml: string, feedUrl: string): RssFeedItem[] {
  return itemBlocks(xml)
    .map((block): RssFeedItem | null => {
      const title = tagValue(block, 'title') ?? 'Tax agency update'
      const link = atomLinkValue(block)
      if (!link) return null
      const absoluteLink = new URL(link, feedUrl).toString()
      const guid = tagValue(block, 'guid') ?? tagValue(block, 'id') ?? absoluteLink
      const summary =
        tagValue(block, 'description') ?? tagValue(block, 'summary') ?? tagValue(block, 'content')
      return {
        title,
        link: absoluteLink,
        publishedAt: dateValue(
          tagValue(block, 'pubDate') ?? tagValue(block, 'published') ?? tagValue(block, 'updated'),
        ),
        summary: summary ?? title,
        externalId: stableExternalId(guid.startsWith('http') ? guid : absoluteLink),
      }
    })
    .filter((item): item is RssFeedItem => item !== null)
}

export function parsedItemsFromRss(input: {
  sourceId: string
  feedUrl: string
  xml: string
  jurisdiction?: string
  limit?: number
}): ParsedItem[] {
  return parseRssItems(input.xml, input.feedUrl)
    .slice(0, input.limit ?? 20)
    .map((item) =>
      Object.assign(
        {
          sourceId: input.sourceId,
          externalId: item.externalId,
          title: item.title,
          publishedAt: item.publishedAt,
          officialSourceUrl: item.link,
          rawText: textExcerpt(
            [item.title, item.summary, item.link].join(`

`),
          ),
        },
        input.jurisdiction ? { jurisdiction: input.jurisdiction } : {},
      ),
    )
}
