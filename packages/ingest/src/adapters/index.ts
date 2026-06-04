import { DEFAULT_HEADERS, fetchTextSnapshot, stableExternalId, textExcerpt } from '../http'
import { snapshotFromFixture } from '../fixtures'
import { extractLinks, stripHtml } from '../selectors'
import type { IngestCtx, ParsedItem, SourceAdapter } from '../types'

const IRS_DISASTER_URL = 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations'
const IRS_NEWSROOM_URL = 'https://www.irs.gov/newsroom'
const IRS_GUIDANCE_URL = 'https://www.irs.gov/newsroom/irs-guidance'
const IRS_TAX_TIPS_URL = 'https://www.irs.gov/newsroom/irs-tax-tips'
const TX_CPA_NEWS_RELEASES_URL = 'https://comptroller.texas.gov/about/media-center/news/'
const NY_DTF_PRESS_URL = 'https://www.tax.ny.gov/press/'
const CA_FTB_NEWSROOM_URL = 'https://www.ftb.ca.gov/about-ftb/newsroom/index.html'
const CA_FTB_TAX_NEWS_URL = 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html'
const CA_CDTFA_NEWS_URL = 'https://www.cdtfa.ca.gov/news/'
const FL_DOR_TIPS_URL = 'https://floridarevenue.com/taxes/tips/Pages/default.aspx'
const WA_DOR_NEWS_URL = 'https://dor.wa.gov/about/news-releases'
const WA_DOR_WHATS_NEW_URL = 'https://dor.wa.gov/about/whats-new'
const MA_DOR_PRESS_URL = 'https://www.mass.gov/info-details/dor-press-releases-and-reports'
const FEMA_API_URL =
  'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$select=disasterNumber,state,declarationTitle,incidentType,declarationDate,incidentBeginDate,designatedArea&$orderby=declarationDate%20desc&$top=50&$metadata=off'

function publishedAtFromText(text: string): Date {
  const match =
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b/i.exec(
      text,
    )
  const parsed = match ? new Date(`${match[0]}T00:00:00.000Z`) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()
}

function parsedItemFromHtml(input: {
  sourceId: string
  sourceUrl: string
  title: string
  html: string
}): ParsedItem {
  const rawText = textExcerpt(stripHtml(input.html))
  return {
    sourceId: input.sourceId,
    externalId: stableExternalId(input.sourceUrl),
    title: input.title,
    publishedAt: publishedAtFromText(rawText),
    officialSourceUrl: input.sourceUrl,
    rawText,
  }
}

async function fetchDetailText(ctx: IngestCtx, url: string, fallbackText: string): Promise<string> {
  try {
    const response = await ctx.fetch(url, { headers: DEFAULT_HEADERS })
    if (!response.ok) return fallbackText
    return textExcerpt(stripHtml(await response.text()))
  } catch {
    return fallbackText
  }
}

function linkLooksTaxRelevant(text: string, href: string): boolean {
  return /deadline|relief|disaster|storm|wildfire|flood|tax|filing|payment|extension|franchise|due/i.test(
    `${text} ${href}`,
  )
}

function parsedItemsFromLinks(input: {
  sourceId: string
  baseUrl: string
  html: string
  ctx: IngestCtx
  limit?: number
}): Promise<ParsedItem[]> {
  const links = extractLinks(input.html, input.baseUrl)
    .filter((link) => linkLooksTaxRelevant(link.text, link.href))
    .slice(0, input.limit ?? 12)
  return Promise.all(
    links.map(async (link) => {
      const fallback = textExcerpt(`${link.text}\n\n${stripHtml(input.html)}`)
      return {
        sourceId: input.sourceId,
        externalId: stableExternalId(link.href),
        title: link.text || 'Tax agency update',
        publishedAt: publishedAtFromText(`${link.text} ${input.html}`),
        officialSourceUrl: link.href,
        rawText: await fetchDetailText(input.ctx, link.href, fallback),
      }
    }),
  )
}

function txComptrollerNewsReleaseLooksRelevant(text: string, href: string): boolean {
  const url = new URL(href)
  return (
    url.origin === 'https://comptroller.texas.gov' &&
    /^\/about\/media-center\/news\/20\d{6}/.test(url.pathname) &&
    linkLooksTaxRelevant(text, href)
  )
}

function parsedTxComptrollerNewsItems(input: {
  sourceId: string
  html: string
  ctx: IngestCtx
}): ParsedItem[] {
  const links = extractLinks(input.html, TX_CPA_NEWS_RELEASES_URL)
    .filter((link) => txComptrollerNewsReleaseLooksRelevant(link.text, link.href))
    .slice(0, 20)
  return links.map((link) => {
    const fallback = textExcerpt(`${link.text}\n\n${stripHtml(input.html)}`)
    return {
      sourceId: input.sourceId,
      externalId: stableExternalId(link.href),
      title: link.text || 'TX Comptroller news release',
      publishedAt: publishedAtFromText(`${link.text} ${input.html}`),
      officialSourceUrl: link.href,
      rawText: fallback,
    }
  })
}

export const irsDisasterAdapter: SourceAdapter = {
  id: 'irs.disaster',
  tier: 'T1',
  cronIntervalMs: 60 * 60 * 1000,
  jurisdiction: 'federal',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: IRS_DISASTER_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const links = extractLinks(snapshot.body, IRS_DISASTER_URL).filter((link) =>
      /relief|disaster|storm|wildfire|flood|tax/i.test(`${link.text} ${link.href}`),
    )
    if (links.length === 0) return []

    return Promise.all(
      links.slice(0, 10).map(async (link) => {
        const fallback = textExcerpt(`${link.text}\n\n${stripHtml(snapshot.body)}`)
        return {
          sourceId: this.id,
          externalId: stableExternalId(link.href),
          title: link.text,
          publishedAt: publishedAtFromText(`${link.text} ${snapshot.body}`),
          officialSourceUrl: link.href,
          rawText: await fetchDetailText(ctx, link.href, fallback),
        }
      }),
    )
  },
}

export const irsNewsroomAdapter: SourceAdapter = {
  id: 'irs.newsroom',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'federal',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: IRS_NEWSROOM_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    return parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: IRS_NEWSROOM_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
  },
}

export const irsGuidanceAdapter: SourceAdapter = {
  id: 'irs.guidance',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'federal',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: IRS_GUIDANCE_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    return parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: IRS_GUIDANCE_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
  },
}

export const irsTaxTipsAdapter: SourceAdapter = {
  id: 'irs.tips',
  tier: 'T2',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'federal',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: IRS_TAX_TIPS_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    return parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: IRS_TAX_TIPS_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
  },
}

export const txComptrollerRssAdapter: SourceAdapter = {
  id: 'tx.cpa.rss',
  tier: 'T1',
  cronIntervalMs: 60 * 60 * 1000,
  jurisdiction: 'TX',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: TX_CPA_NEWS_RELEASES_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    return parsedTxComptrollerNewsItems({
      sourceId: this.id,
      html: snapshot.body,
      ctx,
    })
  },
}

export const caFtbNewsroomAdapter: SourceAdapter = {
  id: 'ca.ftb.newsroom',
  tier: 'T1',
  cronIntervalMs: 60 * 60 * 1000,
  jurisdiction: 'CA',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: CA_FTB_NEWSROOM_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: CA_FTB_NEWSROOM_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

export const caFtbTaxNewsAdapter: SourceAdapter = {
  id: 'ca.ftb.tax_news',
  tier: 'T1',
  cronIntervalMs: 60 * 60 * 1000,
  jurisdiction: 'CA',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: CA_FTB_TAX_NEWS_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: CA_FTB_TAX_NEWS_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

export const caCdtfaNewsAdapter: SourceAdapter = {
  id: 'ca.cdtfa.news',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'CA',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: CA_CDTFA_NEWS_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: CA_CDTFA_NEWS_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

export const nyDtfPressAdapter: SourceAdapter = {
  id: 'ny.dtf.press',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'NY',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: NY_DTF_PRESS_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: NY_DTF_PRESS_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

export const flDorTipsAdapter: SourceAdapter = {
  id: 'fl.dor.tips',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'FL',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: FL_DOR_TIPS_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: FL_DOR_TIPS_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

export const waDorNewsAdapter: SourceAdapter = {
  id: 'wa.dor.news',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'WA',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: WA_DOR_NEWS_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: WA_DOR_NEWS_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

export const waDorWhatsNewAdapter: SourceAdapter = {
  id: 'wa.dor.whats_new',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'WA',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: WA_DOR_WHATS_NEW_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: WA_DOR_WHATS_NEW_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

export const maDorPressAdapter: SourceAdapter = {
  id: 'ma.dor.press',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'MA',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: MA_DOR_PRESS_URL })]
  },
  async parse(snapshot, ctx) {
    if (snapshot.notModified) return []
    const items = await parsedItemsFromLinks({
      sourceId: this.id,
      baseUrl: MA_DOR_PRESS_URL,
      html: snapshot.body,
      ctx,
      limit: 12,
    })
    return items
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function femaRecordsFromParsed(parsed: unknown): Record<string, unknown>[] {
  if (!isRecord(parsed)) return []

  const records = parsed.DisasterDeclarationsSummaries
  if (Array.isArray(records)) return records.filter(isRecord)

  const features = parsed.features
  if (!Array.isArray(features)) return []
  return features.flatMap((feature) => {
    if (!isRecord(feature) || !isRecord(feature.attributes)) return []
    return [feature.attributes]
  })
}

function femaDate(value: unknown): Date {
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

export const femaDeclarationsAdapter: SourceAdapter = {
  id: 'fema.declarations',
  tier: 'T2',
  cronIntervalMs: 30 * 60 * 1000,
  jurisdiction: 'federal',
  async fetch(ctx) {
    return [await fetchTextSnapshot(ctx, { sourceId: this.id, url: FEMA_API_URL })]
  },
  async parse(snapshot) {
    if (snapshot.notModified) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(snapshot.body)
    } catch {
      return []
    }
    const records = femaRecordsFromParsed(parsed)
    return records.slice(0, 20).flatMap((attrs) => {
      const state = typeof attrs.state === 'string' ? attrs.state : 'US'
      const area = typeof attrs.designatedArea === 'string' ? attrs.designatedArea : 'affected area'
      const title =
        typeof attrs.declarationTitle === 'string'
          ? attrs.declarationTitle
          : `${state} FEMA disaster declaration`
      const disasterNumber =
        typeof attrs.disasterNumber === 'number' || typeof attrs.disasterNumber === 'string'
          ? String(attrs.disasterNumber)
          : null
      if (!disasterNumber) return []

      const incidentType = typeof attrs.incidentType === 'string' ? attrs.incidentType : 'unknown'
      const publishedAt = femaDate(attrs.declarationDate)
      return {
        sourceId: this.id,
        externalId: `fema-${disasterNumber}`,
        title,
        publishedAt,
        officialSourceUrl: `https://www.fema.gov/disaster/${encodeURIComponent(disasterNumber)}`,
        jurisdiction: state,
        rawText: textExcerpt(
          [
            title,
            `State: ${state}`,
            `Designated area: ${area}`,
            `Incident type: ${incidentType}`,
            `Declaration date: ${publishedAt.toISOString().slice(0, 10)}`,
            `Incident begin date: ${femaDate(attrs.incidentBeginDate).toISOString().slice(0, 10)}`,
          ].join('\n'),
        ),
      }
    })
  },
}

const NY_DTF_FIXTURE = `
<article>
  <h1>NY DTF clarifies pass-through entity tax election window</h1>
  <time>April 15, 2026</time>
  <p>The Department of Taxation and Finance reminds taxpayers that the PTET election
  for tax year 2026 must be made by March 15, 2026.</p>
</article>
`

export const nyDtfPressFixtureAdapter: SourceAdapter = {
  id: 'ny.dtf.press',
  tier: 'T1',
  cronIntervalMs: 120 * 60 * 1000,
  jurisdiction: 'NY',
  async fetch(ctx) {
    return [
      await snapshotFromFixture({
        ctx,
        sourceId: this.id,
        externalId: NY_DTF_PRESS_URL,
        body: NY_DTF_FIXTURE,
      }),
    ]
  },
  async parse(snapshot) {
    if (snapshot.notModified) return []
    return [
      parsedItemFromHtml({
        sourceId: this.id,
        sourceUrl: NY_DTF_PRESS_URL,
        title: 'NY DTF clarifies pass-through entity tax election window',
        html: snapshot.body,
      }),
    ]
  },
}

export const livePulseAdapters = [
  irsDisasterAdapter,
  irsNewsroomAdapter,
  irsGuidanceAdapter,
  irsTaxTipsAdapter,
  caFtbNewsroomAdapter,
  caFtbTaxNewsAdapter,
  caCdtfaNewsAdapter,
  nyDtfPressAdapter,
  txComptrollerRssAdapter,
  flDorTipsAdapter,
  waDorNewsAdapter,
  waDorWhatsNewAdapter,
  maDorPressAdapter,
  femaDeclarationsAdapter,
] as const

export const phase0PulseAdapters = livePulseAdapters
