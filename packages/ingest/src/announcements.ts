import {
  DEFAULT_HEADERS,
  normalizeSourceText,
  readSourceResponseText,
  stableExternalId,
  textExcerpt,
} from './http'
import { parsedItemsFromRss } from './rss'
import { extractLinksWithTableTitles, stripHtml } from './selectors'
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
// `amnesty` … `effective <month>` added 2026-06-22: once the row-aware extractor
// recovers IL bulletin titles (table layout, see extractLinksWithTableTitles), the
// disaster/deadline-tuned vocabulary still dropped core tax-change bulletins —
// rate changes, occupation/motor-fuel/cigarette/grocery taxes, amnesty windows,
// "Effective July 1, 2026" datelines (which never contain the literal "effective
// date"). This is what missed il.2026.remote-retailer-amnesty in the recall eval.
// `private letter ruling` … `use tax` added 2026-06-22 from a data-driven audit of
// all 50 state DOR announcement pages: ~1.4k dropped link titles were labelled
// real-vs-noise and the gaps consolidated into specific tax-type / document-type /
// policy-event phrases (kept multi-word to avoid admitting topic nav like a bare
// "Income Tax" sidebar link). Recovers 185 genuine notices across ~40 states for 3
// tax-topic false positives. Bare tax-type words (income tax, property tax, tax
// credit, …) were deliberately NOT added — they match section-nav chrome.
const TAX_ANNOUNCEMENT_RE =
  /deadline|due date|relief|disaster|storm|wildfire|flood|filing|payment|extension|franchise|return|rules and regulations|chapter|effective date|tax alert|tax update|tax bulletin|tax notice|technical bulletin|technical information release|administrative notice|technical assistance|policy statement|withholding|sales tax|estimated tax|refund|protective claim|abatement|actions on decision|action on decision|acquiescence|internal revenue bulletin|revenue ruling|revenue procedure|amnesty|occupation tax|rate change|tax rate|motor fuel|cigarette|tobacco|grocery tax|excise|telecommunications tax|effective (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|private letter ruling|information letter|technical advice|advice memoranda|tax ruling|administrative rule|transaction tax|privilege license|privilege tax|surety bond|combined reporting|commercial activity tax|marketplace facilitator|economic nexus|pass-through entity|gross income tax|financial institutions tax|petroleum activity tax|municipal net profit tax|service provider tax|capital projects tax|auditorium district|health insurance claims assessment|realty transfer fee|transfer tax|mansion tax|estate tax|severance tax|nonresident partner|cannabis|marijuana|marihuana|nicotine|dyed diesel|ethanol blend|wager|nonsettling manufacturer fee|nsm fee|child tax credit|food tax credit|charitable credit|working families tax credit|parental choice tax credit|grocery credit|homestead exemption|data center exemption|property tax credit|property tax extension limitation|property tax reimbursement|tax deferral|senior freeze|rent rebate|tax rebate|ptell|conformity|repeal|tax changes|tax legislation|legislative session summary|income tax brackets|standard deduction|interest rate|interest waiver|penalty and interest|tax holiday|tax notes|taxable sales|business interest limitation|irc 163|use tax/i
const HIGH_SIGNAL_TAX_CHANGE_RE =
  /deadline|due date|relief|disaster|extension|filing|payment|rules and regulations|chapter|effective date|tax alert|tax update|tax bulletin|technical bulletin|technical information release|administrative notice|technical assistance|refund|protective claim|abatement|actions on decision|action on decision|acquiescence|internal revenue bulletin|revenue ruling|revenue procedure|amnesty|occupation tax|rate change|tax rate|motor fuel|cigarette|excise|private letter ruling|advice memoranda|tax ruling|administrative rule|transaction tax|privilege license|privilege tax|surety bond|combined reporting|commercial activity tax|marketplace facilitator|economic nexus|gross income tax|financial institutions tax|petroleum activity tax|municipal net profit tax|service provider tax|capital projects tax|realty transfer fee|transfer tax|mansion tax|estate tax|severance tax|cannabis|marijuana|marihuana|nicotine|dyed diesel|wager|nonsettling manufacturer fee|nsm fee|child tax credit|food tax credit|working families tax credit|parental choice tax credit|grocery credit|senior freeze|ptell|conformity|repeal|tax changes|tax legislation|tax holiday|tax notes|business interest limitation|irc 163|use tax/i
const ANNOUNCEMENT_NOISE_RE =
  /award|auction|career|hiring|job opening|staff|appointment|webinar|seminar|office hour|office closure|holiday schedule|unclaimed property|scam|fraud|phishing|identity theft|password|login|portal maintenance|system maintenance|newsletter/i

export function linkLooksTaxAnnouncementRelevant(text: string, href: string): boolean {
  const candidate = `${text} ${href}`
  if (!TAX_ANNOUNCEMENT_RE.test(candidate)) return false
  return !ANNOUNCEMENT_NOISE_RE.test(candidate) || HIGH_SIGNAL_TAX_CHANGE_RE.test(candidate)
}

const WY_TAXING_ISSUES_RE = /^(\d{2})-(\d{4})\s+Taxing Issues$/i

// TN DOR's legal notices (SUT-/FT-/LOT-/TOB-/FONCE-/F&E/GEN-… series) live in a
// Zendesk Help Center alongside TNTAP portal how-tos. Keep the notices, drop the
// portal help — a negative title filter is more robust than whitelisting every
// notice-series prefix (their naming is inconsistent: "FONCE-3" vs "F&E
// Apportionment-6"), and the notice titles themselves carry no tax vocabulary.
const TN_PORTAL_HELP_RE = /\btntap\b|^\s*logging\b|password|sign[- ]?in|log[- ]?in|how (?:to|do)\b/i

function defaultLinkFilterForSource(
  source: AnnouncementSourceConfig,
): ((link: AnnouncementLink) => boolean) | undefined {
  if (source.id !== 'wy.temporary_announcements') return undefined
  return (link) => WY_TAXING_ISSUES_RE.test(link.text.trim())
}

function defaultRelevancePredicateForSource(
  source: AnnouncementSourceConfig,
): (text: string, href: string) => boolean {
  if (source.id === 'wy.temporary_announcements') {
    return (text) => WY_TAXING_ISSUES_RE.test(text.trim())
  }
  if (source.id === 'tn.temporary_announcements') {
    return (text) => !TN_PORTAL_HELP_RE.test(text)
  }
  return linkLooksTaxAnnouncementRelevant
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

// Detail-page enrichment is for HTML pages only — PDFs ride the dedicated
// pdfAnnouncementItemsFromLinks path, and feeding a PDF body through
// stripHtml would replace a usable index excerpt with binary garbage.
function enrichableDetailUrl(officialSourceUrl: string): string | null {
  if (/\.pdf(?:[?#]|$)/i.test(officialSourceUrl)) return null
  if (normalizedGoogleDrivePdfLink(officialSourceUrl)) return null
  return officialSourceUrl
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

// Recover an announcement's real publication date from its detail-page text
// ("May 11, 2026" style). Null when no date is present — callers keep their
// fetchedAt fallback. Built via Date.UTC parts: "May 11, 2026T00:00:00Z" is
// not valid ISO and parses to Invalid Date on some engines. Exported for the
// ingest loop's detail enrichment.
export function announcementPublishedAtFromText(text: string): Date | null {
  const match =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),\s+(\d{4})\b/i.exec(
      text,
    )
  if (!match?.[1] || !match[2] || !match[3]) return null
  const month = MONTH_INDEX[match[1].slice(0, 3).toLowerCase()]
  const day = Number(match[2])
  const year = Number(match[3])
  if (month === undefined || day < 1 || day > 31) return null
  const parsed = new Date(Date.UTC(year, month, day))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function announcementItemsFromHtml(
  source: AnnouncementSourceConfig,
  body: string,
  fetchedAt: Date,
  limit = 20,
  options: Pick<AnnouncementParseOptions, 'linkFilter' | 'relevancePredicate'> = {},
): ParsedItem[] {
  return extractLinksWithTableTitles(body, source.url)
    .filter((link) => linkPassesOptions(source, link, options))
    .slice(0, limit)
    .map((link) => {
      const officialSourceUrl = normalizedGoogleDrivePdfLink(link.href)?.officialUrl ?? link.href
      const enrichFromUrl = enrichableDetailUrl(officialSourceUrl)
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
          // rawText embeds the WHOLE listing page (the AI needs the surrounding
          // context), so hashing it made every item's snapshot hash flip on any
          // unrelated page change — ~20 paid re-extracts per touch. Dedupe on the
          // item-local stable identity instead; same inputs as externalId.
          dedupeText: [normalizeSourceText(link.text), officialSourceUrl].join('\n'),
          // New items get their rawText swapped for the detail page at ingest:
          // the listing excerpt rarely carries the actual dates, which is how
          // date-less deadline alerts with hub-page links used to ship.
          ...(enrichFromUrl ? { enrichFromUrl } : {}),
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

// Zendesk Help Center JSON. Some agencies mirror their notices on a Zendesk
// support portal that is reachable when the primary .gov host is not — e.g.
// revenue.support.tn.gov carries TN DOR's notices while tn.gov drops datacenter
// connections. The /api/v2/help_center/.../articles.json payload already carries
// each article's title, body, canonical html_url and updated_at, so no detail
// re-fetch is needed. `updated_at` rides in the dedupe identity, so a re-edited
// notice re-surfaces.
interface ZendeskArticle {
  title?: string
  html_url?: string
  body?: string
  updated_at?: string
  created_at?: string
}
function looksLikeZendeskHelpCenter(body: string): boolean {
  return /^\s*\{/.test(body) && body.includes('"articles"') && body.includes('"html_url"')
}
function zendeskArticleItems(
  source: AnnouncementSourceConfig,
  body: string,
  fetchedAt: Date,
  limit: number,
): ParsedItem[] {
  let parsed: { articles?: ZendeskArticle[] }
  try {
    parsed = JSON.parse(body) as { articles?: ZendeskArticle[] }
  } catch {
    return []
  }
  const articles = Array.isArray(parsed.articles) ? parsed.articles : []
  return articles
    .flatMap((article) => {
      const title = article.title
      const url = article.html_url
      if (!title || !url) return []
      const updatedAt = article.updated_at ?? article.created_at
      const published = updatedAt ? new Date(updatedAt) : fetchedAt
      return [
        Object.assign(
          {
            sourceId: source.id,
            externalId: stableExternalId(url),
            title,
            publishedAt: Number.isNaN(published.getTime()) ? fetchedAt : published,
            officialSourceUrl: url,
            rawText: textExcerpt([title, stripHtml(article.body ?? '')].join('\n\n')),
            dedupeText: [normalizeSourceText(title), url, updatedAt ?? ''].join('\n'),
          },
          source.jurisdiction ? { jurisdiction: source.jurisdiction } : {},
        ),
      ]
    })
    .slice(0, limit)
}

// Agency newsroom JSON. Some DORs render their news list client-side from a flat
// JSON array the page's own JS fetches (Montana: mtrevenue.gov/news/ shells out
// to /news/article_source.json). The HTML shell never server-renders the list
// and a browser render captures it before that XHR settles, so we fetch the JSON
// directly via feedUrl. Each entry carries a title, a site-relative link, an ISO
// `date` and a teaser/summary.
interface AgencyNewsJsonEntry {
  title?: string
  link?: string
  summary?: string
  teaser?: string
  date?: string
}
function looksLikeAgencyNewsJson(body: string): boolean {
  return (
    /^\s*\[/.test(body) &&
    body.includes('"link"') &&
    body.includes('"date"') &&
    body.includes('"teaser"')
  )
}
function agencyNewsJsonItems(
  source: AnnouncementSourceConfig,
  body: string,
  fetchedAt: Date,
  limit: number,
): ParsedItem[] {
  let parsed: AgencyNewsJsonEntry[]
  try {
    parsed = JSON.parse(body) as AgencyNewsJsonEntry[]
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .flatMap((entry) => {
      const title = entry.title?.trim()
      if (!title || !entry.link) return []
      let url: string
      try {
        url = new URL(entry.link, source.url).toString()
      } catch {
        return []
      }
      const published = entry.date ? new Date(entry.date) : fetchedAt
      const excerpt = stripHtml(entry.summary || entry.teaser || '')
      return [
        Object.assign(
          {
            sourceId: source.id,
            externalId: stableExternalId(url),
            title,
            publishedAt: Number.isNaN(published.getTime()) ? fetchedAt : published,
            officialSourceUrl: url,
            rawText: textExcerpt([title, excerpt].filter(Boolean).join('\n\n')),
            dedupeText: [normalizeSourceText(title), url, entry.date ?? ''].join('\n'),
          },
          source.jurisdiction ? { jurisdiction: source.jurisdiction } : {},
        ),
      ]
    })
    .slice(0, limit)
}

export function announcementItemsFromSnapshot(
  source: AnnouncementSourceConfig,
  snapshot: Pick<RawSnapshot, 'body' | 'fetchedAt'>,
  options: AnnouncementParseOptions = {},
): ParsedItem[] {
  const limit = options.limit ?? 20
  if (looksLikeZendeskHelpCenter(snapshot.body)) {
    // Filter on the article TITLE (not the body): a Help Center mixes the legal
    // notice series with portal how-tos, and notice bodies routinely mention
    // "payment"/"TNTAP" etc., so a body match would both admit the how-tos and
    // (because notice titles like "FONCE-3" lack disaster/deadline vocabulary)
    // drop real notices. The per-source predicate decides; TN excludes the portal
    // help (see defaultRelevancePredicateForSource).
    const items = zendeskArticleItems(source, snapshot.body, snapshot.fetchedAt, limit).filter(
      (item) =>
        linkPassesOptions(source, { text: item.title, href: item.officialSourceUrl }, options),
    )
    if (items.length > 0) return items
  }
  if (looksLikeAgencyNewsJson(snapshot.body)) {
    const items = agencyNewsJsonItems(source, snapshot.body, snapshot.fetchedAt, limit).filter(
      (item) =>
        linkPassesOptions(source, { text: item.title, href: item.officialSourceUrl }, options),
    )
    if (items.length > 0) return items
  }
  if (/<(?:rss|feed)\b/i.test(snapshot.body)) {
    const items = parsedItemsFromRss({
      sourceId: source.id,
      feedUrl: source.url,
      xml: snapshot.body,
      limit,
      ...(source.jurisdiction ? { jurisdiction: source.jurisdiction } : {}),
    })
      .filter((item) =>
        linkPassesOptions(
          source,
          { text: `${item.title} ${item.rawText}`, href: item.officialSourceUrl },
          options,
        ),
      )
      .map((item) => {
        // Same item-local identity + detail enrichment as the HTML path. The
        // dedupeText switch re-hashes existing feed items exactly once; the
        // ingest loop's suppressDedupeRehashMigration absorbs that without a
        // paid re-extract.
        const enrichFromUrl = enrichableDetailUrl(item.officialSourceUrl)
        return {
          ...item,
          dedupeText: [normalizeSourceText(item.title), item.officialSourceUrl].join('\n'),
          ...(enrichFromUrl ? { enrichFromUrl } : {}),
        }
      })
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
  return extractLinksWithTableTitles(snapshot.body, source.url)
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
