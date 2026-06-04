import type { IngestCtx, RawSnapshot, SourceAdapter, SourceId } from './types'

export const sourceFixtureBodies = {
  'irs.disaster':
    '<main><a href="/newsroom/tax-relief-ca-storm">Tax relief for CA storm victims</a></main>',
  'irs.newsroom':
    '<main><a href="/newsroom/irs-announces-tax-relief">IRS announces tax relief deadline extension</a></main>',
  'irs.guidance':
    '<main><a href="/newsroom/irs-guidance-disaster-relief">IRS guidance disaster relief</a></main>',
  'irs.tips':
    '<main><a href="/newsroom/irs-tax-tip-filing-deadline">IRS tax tip on filing deadline and extension relief</a></main>',
  'ca.ftb.newsroom':
    '<main><a href="/about-ftb/newsroom/tax-relief.html">FTB tax relief deadline extension</a></main>',
  'ca.ftb.tax_news':
    '<main><a href="/about-ftb/newsroom/tax-news/tax-relief.html">Tax News deadline relief</a></main>',
  'ca.cdtfa.news':
    '<main><a href="/news/disaster-relief.htm">CDTFA disaster tax relief deadline</a></main>',
  'ny.dtf.press':
    '<article><h1>NY DTF clarifies pass-through entity tax election window</h1></article>',
  'tx.cpa.rss':
    '<main><a href="/about/media-center/news/20260408-texas-businesses-april-15-is-deadline-for-filing-property-tax-renditions-1775577720312">Texas businesses: April 15 is deadline for filing property tax renditions</a></main>',
  'fl.dor.tips':
    '<main><a href="/taxes/tips/disaster-relief">Florida DOR tax tip disaster relief</a></main>',
  'wa.dor.news':
    '<main><a href="/about/news-releases/disaster-relief">WA DOR disaster relief deadline</a></main>',
  'wa.dor.whats_new':
    '<main><a href="/about/whats-new/tax-relief">WA DOR tax relief update</a></main>',
  'ma.dor.press':
    '<main><a href="/news/massachusetts-dor-tax-relief">Massachusetts DOR tax relief deadline update</a></main>',
  'fema.declarations':
    '{"DisasterDeclarationsSummaries":[{"disasterNumber":9999,"state":"CA","declarationTitle":"California Severe Storms","incidentType":"Severe Storm","declarationDate":"2026-04-15T00:00:00.000Z","incidentBeginDate":"2026-04-14T00:00:00.000Z","designatedArea":"Los Angeles County"}]}',
} satisfies Record<SourceId, string>

export async function snapshotFromFixture(input: {
  ctx: IngestCtx
  sourceId: string
  externalId: string
  fetchedAt?: Date
  body: string
  contentType?: string
}): Promise<RawSnapshot> {
  const fetchedAt = input.fetchedAt ?? new Date()
  const archived = await input.ctx.archiveRaw({
    sourceId: input.sourceId,
    externalId: input.externalId,
    fetchedAt,
    body: input.body,
    contentType: input.contentType ?? 'text/html',
  })

  return {
    sourceId: input.sourceId,
    fetchedAt,
    body: input.body,
    contentHash: archived.contentHash,
    r2Key: archived.r2Key,
    contentType: input.contentType ?? 'text/html',
    etag: null,
    lastModified: null,
    notModified: false,
  }
}

export async function runFixtureAdapter(adapter: SourceAdapter, ctx: IngestCtx) {
  const snapshots = await adapter.fetch(ctx)
  const parsedGroups = await Promise.all(snapshots.map((snapshot) => adapter.parse(snapshot, ctx)))
  const items = parsedGroups.flat()
  return { snapshots, items }
}
